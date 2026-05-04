export default class BLEJS {
    static State = {
        Closed: 'closed',
        Opening: 'opening',
        Open: 'open',
        Closing: 'closing',
    };

    //#region handlers
    onbin = null;

    onopen() { }
    onclose() { }
    onchange(s) { }
    onselect(name) { }
    onerror(e) { }

    //#region constructor
    constructor(params = {}) {
        const def = {
            serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
            rxUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
            txUUID: '0000ffe2-0000-1000-8000-00805f9b34fb',
            auto_open: false,
            reconnect: 1000,
        };
        this.cfg = { ...def, ...params };
    }

    //#region methods
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
        return this._device ? this._device.name : null;
    }

    async select() {
        try {
            await this.close();
            if (this._device) this._device.removeEventListener('gattserverdisconnected', this._disconnect_h);
            this._device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [this.cfg.serviceUUID] }],
                optionalServices: [this.cfg.serviceUUID]
            });
            this._device.addEventListener("gattserverdisconnected", this._disconnect_h);
        } catch (e) {
            this._error(e);
            this._device = null;
        }

        this.onselect(this.getName());
        if (this.cfg.auto_open) this.open();
        return this.selected();
    }

    async open() {
        if (!this._device) {
            this._error("No device");
            return;
        }
        if (this.opened()) return;

        if (this.cfg.reconnect) this.retry = true;
        await this._open();
    }

    async _open() {
        if (this._state != BLEJS.State.Closed) return;

        this._change(BLEJS.State.Opening);
        try {
            const server = await this._device.gatt.connect();
            const service = await server.getPrimaryService(this.cfg.serviceUUID);

            this._rx = await service.getCharacteristic(this.cfg.rxUUID);
            this._tx = await service.getCharacteristic(this.cfg.txUUID);

            await this._tx.startNotifications();
            this._tx.addEventListener("characteristicvaluechanged", this._data_h);

            this._change(BLEJS.State.Open);
        } catch (e) {
            this._error(e);
            this._change(BLEJS.State.Closed);
            if (this.retry) sleep(this.cfg.reconnect).then(() => this._open());
        }
    }

    async close() {
        this.retry = false;
        if (this._device?.gatt?.connected) await this._close();
    }

    async _close() {
        this._change(BLEJS.State.Closing);
        try {
            if (this._device?.gatt?.connected) this._device.gatt.disconnect();
            else this._disconnect();
        } catch (e) {
            this._error(e);
        }
    }

    async sendBin(data, fast = true) {
        try {
            if (fast) await this._rx.writeValueWithoutResponse(data);
            else await this._rx.writeValueWithResponse(data);
        } catch (e) {
            this._error(e);
        }
    }

    //#region private    
    _state = BLEJS.State.Closed;
    _device = null;
    _rx = null;
    _tx = null;

    async _disconnect(e) {
        this._change(BLEJS.State.Closed);
        if (this._tx) this._tx.removeEventListener('characteristicvaluechanged', this._data_h);

        this._rx = null;
        this._tx = null;

        if (this.retry) sleep(this.cfg.reconnect).then(() => this._open());
        await sleep(50);
    }
    _disconnect_h = this._disconnect.bind(this);

    _data(e) {
        const dv = e.target.value;
        const value = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
        if (this.onbin) this.onbin(value);
    }
    _data_h = this._data.bind(this);

    _error(e) {
        this.onerror('[BLE] ' + e);
    }
    _change(s) {
        this._state = s;
        this.onchange(s);
        switch (s) {
            case BLEJS.State.Open: this.onopen(); break;
            case BLEJS.State.Closed: this.onclose(); break;
        }
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));