import { sleep, SerialExecutor } from "@alexgyver/utils";

export default class BLEJS {
    static State = {
        Closed: 'closed',
        Opening: 'opening',
        Open: 'open',
        Closing: 'closing',
    };

    ontext = null;
    onbin(b) { }
    onopen() { }
    onclose() { }
    onchange(s) { }
    onselect(name) { }
    onerror(e) { }

    constructor(params = {}) {
        const def = {
            serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
            rxUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
            txUUID: '0000ffe2-0000-1000-8000-00805f9b34fb',
            auto_open: false,
            reconnect: 1000,
            chunkSize: 500,
            chunkDelay: 0,
        };

        this.cfg = { ...def, ...params };
    }

    config(params = {}) {
        this.cfg = { ...this.cfg, ...params };
    }

    static supported() {
        return 'bluetooth' in navigator;
    }

    opened() {
        return this._state === BLEJS.State.Open;
    }

    selected() {
        return !!this._device;
    }

    getName() {
        return this._device ? this._device.name : 'None';
    }

    async select() {
        try {
            await this.close();

            if (this._device) {
                this._device.removeEventListener(
                    'gattserverdisconnected',
                    this._disconnect_h
                );
            }

            this._device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [this.cfg.serviceUUID] }],
                optionalServices: [this.cfg.serviceUUID],
            });

            this._device.addEventListener(
                'gattserverdisconnected',
                this._disconnect_h
            );
        } catch (e) {
            this._error(e);
            this._device = null;
        }

        this.onselect(this.getName());

        if (this.cfg.auto_open) this.open();

        return this.selected();
    }

    async open() {
        return this._lifecycle.runNothrow(async () => {
            if (!this._device) {
                this._error('No device');
                return false;
            }

            if (this.opened()) return true;

            if (this.cfg.reconnect) this.retry = true;

            await this._open();

            return this.opened();
        });
    }

    async _open() {
        if (this._state !== BLEJS.State.Closed) return;

        this._change(BLEJS.State.Opening);

        try {
            const server = await this._device.gatt.connect();
            const service = await server.getPrimaryService(this.cfg.serviceUUID);

            this._rx = await service.getCharacteristic(this.cfg.rxUUID);
            this._tx = await service.getCharacteristic(this.cfg.txUUID);

            await this._tx.startNotifications();
            this._tx.addEventListener(
                'characteristicvaluechanged',
                this._data_h
            );

            this._sender.reset();
            this._change(BLEJS.State.Open);
        } catch (e) {
            this._error(e);
            this._sender.reset();
            this._change(BLEJS.State.Closed);

            if (this.retry) {
                sleep(this.cfg.reconnect).then(() => {
                    this._lifecycle.runNothrow(() => this._open());
                });
            }
        }
    }

    async close() {
        return this._lifecycle.runNothrow(async () => {
            this.retry = false;
            this._sender.reset();

            if (this._state !== BLEJS.State.Closed) {
                await this._close();
            }

            return true;
        });
    }

    async _close() {
        if (this._state === BLEJS.State.Closed) return;

        this._change(BLEJS.State.Closing);

        try {
            if (this._device?.gatt?.connected) {
                this._device.gatt.disconnect();
            } else {
                await this._disconnect();
            }
        } catch (e) {
            this._error(e);
            await this._disconnect();
        }
    }

    async sendText(text, fast = true) {
        return this.sendBin((new TextEncoder()).encode(text), fast);
    }

    async sendFrame(data, fast = true) {
        return this.sendBin(data, fast, 0);
    }

    async sendBin(data, fast = true, chunkSize = this.cfg.chunkSize) {
        if (!this.opened() || !this._rx) return false;

        const result = await this._sender.runNothrow(async () => {
            if (!this.opened() || !this._rx) return false;

            const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
            if (!bytes.length) return true;

            let size = Number(chunkSize);
            if (!Number.isFinite(size) || size <= 0) size = bytes.length;
            else size = Math.max(1, Math.floor(size));

            try {
                for (let i = 0; i < bytes.length; i += size) {
                    if (!this.opened() || !this._rx) return false;

                    const chunk = bytes.subarray(i, i + size);

                    if (fast) {
                        await this._rx.writeValueWithoutResponse(chunk);
                    } else {
                        await this._rx.writeValueWithResponse(chunk);
                    }

                    if (i + size < bytes.length && this.cfg.chunkDelay > 0) {
                        await sleep(this.cfg.chunkDelay);
                    }
                }
            } catch (e) {
                this._error(e);
                return false;
            }

            return true;
        });

        return result === true;
    }

    _state = BLEJS.State.Closed;
    _device = null;
    _rx = null;
    _tx = null;

    retry = false;

    _sender = new SerialExecutor();
    _lifecycle = new SerialExecutor();

    async _disconnect(e) {
        this._sender.reset();

        if (this._tx) {
            try {
                this._tx.removeEventListener(
                    'characteristicvaluechanged',
                    this._data_h
                );
            } catch (e) { }
        }

        this._rx = null;
        this._tx = null;

        this._change(BLEJS.State.Closed);

        if (this.retry) {
            sleep(this.cfg.reconnect).then(() => {
                this._lifecycle.runNothrow(() => this._open());
            });
        }

        await sleep(50);
    }

    _disconnect_h = this._disconnect.bind(this);

    _data(e) {
        try {
            const dv = e.target.value;
            const value = new Uint8Array(
                dv.buffer,
                dv.byteOffset,
                dv.byteLength
            );

            this.onbin(value);
            if (this.ontext) this.ontext(new TextDecoder().decode(value));
        } catch (e) {
            this._error(e);
        }
    }

    _data_h = this._data.bind(this);

    _error(e) {
        this.onerror('[BLE] ' + e);
    }

    _change(s) {
        if (this._state === s) return;

        this._state = s;
        this.onchange(s);

        switch (s) {
            case BLEJS.State.Open:
                this.onopen();
                break;

            case BLEJS.State.Closed:
                this.onclose();
                break;
        }
    }
}
