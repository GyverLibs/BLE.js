import { sleep, ShiftBuffer, StreamSplitter } from "@alexgyver/utils";

export default class BLEJS {
    static State = {
        Closed: 'closed',
        Opening: 'opening',
        Open: 'open',
        Closing: 'closing',
    };

    //#region handlers
    onbin = null;
    ontext = null;

    onopen() { }
    onclose() { }
    onchange(s) { }
    onselect(name) { }
    onerror(e) { }

    //#region constructor
    constructor(params = {}) {
        const def = {
            eol: /\r?\n/,
            serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
            charxUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
            auto_open: false,
            max_tx: 20,
            reconnect: 1000,
        };
        this.cfg = { ...def, ...params };

        this.splitter = new StreamSplitter(this.cfg.eol);
        this.splitter.ontext = (t) => this.ontext(t);
    }

    //#region methods
    config(params = {}) {
        this.cfg = { ...this.cfg, ...params };
        this.splitter.eol = this.cfg.eol;
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
        if (!this._device) return;
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
            this._charx = await service.getCharacteristic(this.cfg.charxUUID);
            await this._charx.startNotifications();
            this._charx.addEventListener("characteristicvaluechanged", this._data_h);
            this._buffer.clear();
            this._change(BLEJS.State.Open);
        } catch (e) {
            this._error(e);
            this._change(BLEJS.State.Closed);
            if (this.retry) sleep(this.cfg.reconnect).then(() => this._open());
        }
    }

    async close() {
        this.retry = false;
        if (this.opened()) await this._close();
    }

    async _close() {
        this._change(BLEJS.State.Closing);
        try { this._device.gatt.disconnect(); }
        catch (e) { this._error(e); }
    }

    async sendText(text) {
        await this.sendBin((new TextEncoder()).encode(text));
    }

    async sendBin(data) {
        this._buffer.push(data);
        this._send();
    }

    //#region private    
    _device = null;
    _charx = null;
    _state = BLEJS.State.Closed;
    _buffer = new ShiftBuffer();
    _decoder = new TextDecoder();

    async _disconnect(e) {
        this._change(BLEJS.State.Closed);
        if (this._charx) this._charx.removeEventListener('characteristicvaluechanged', this._data_h);
        this._charx = null;
        if (this.retry) sleep(this.cfg.reconnect).then(() => this._open());
        await sleep(50);
    }
    _disconnect_h = this._disconnect.bind(this);

    _data(e) {
        const dv = e.target.value;
        const value = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
        if (this.onbin) this.onbin(value);
        if (this.ontext) this.splitter.write(this._decoder.decode(value, { stream: true }));
    }
    _data_h = this._data.bind(this);

    async _send() {
        if (this._busy) return;
        this._busy = true;
        while (this._buffer.length && this._charx) {
            let d = this._buffer.shift(this.cfg.max_tx);
            try {
                if (d.length) await this._charx.writeValueWithoutResponse(d);
            } catch (e) { }
        }
        this._busy = false;
    }

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