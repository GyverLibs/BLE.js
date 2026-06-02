This is an automatic translation and may be incorrect in some places. See the source README and examples for authoritative information.

# BLE.js
Wrapper on Web Bluetooth API
- Automatic reconnection
- Shipment buffering
- Reception buffering, separation of text by separator

[demo](https://gyverlibs.github.io/BLE.js/test/)

> **Browser**: https://gyverlibs.github.io/BLE.js/BLE.min.js

> **Node**: npm i @alexgyver/ble

## Doc.
```js
constructor(params = {});
config(params = {});
// eol: /\r?\n/
// serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb'
// charxUUID: '0000ffe1-0000-1000-8000-00805f9b34fb'
// auto_open: false
// max_tx: 20
// reconnect: 1000

onbin(b);
ontext(t);

onopen():
onclose():
onchange(s):
onselect(name);
onerror(e);

static supported();
opened();
selected();
getName();

select();
open();
close();

sendBin(data);
sendText(text);
```
