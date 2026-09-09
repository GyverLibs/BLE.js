This is an automatic translation and may be incorrect in some places. See the source README and examples for authoritative information.

# BLE.js
Wrapper on Web Bluetooth API
- Automatic reconnection
- Sequential writes without overlapping operations
- Configurable splitting of large writes
- Atomic sending of a single BLE frame

[demo](https://gyverlibs.github.io/BLE.js/test/)

> **Browser**: https://gyverlibs.github.io/BLE.js/BLE.min.js

> **Node**: npm i @alexgyver/ble

## Doc.
```js
constructor(params = {});
config(params = {});
// serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb'
// rxUUID: '0000ffe1-0000-1000-8000-00805f9b34fb'
// txUUID: '0000ffe2-0000-1000-8000-00805f9b34fb'
// auto_open: false
// reconnect: 1000
// chunkSize: 500
// chunkDelay: 0
// withResponse: false

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
getRxProperties();
getTxProperties();
canWriteWithResponse();
canWriteWithoutResponse();
canIndicate();

select();
open();
close();

sendBin(data, options = {});
sendText(text, options = {});
```

All send methods return `Promise<boolean>`.

The `withResponse` option is shared by all send methods:

```js
await ble.sendBin(data, { withResponse: true });
await ble.sendText('hello', { withResponse: true });
```

Set `chunkSize: 0` when one protocol frame must map to exactly one characteristic write:

```js
await ble.sendBin(frame, { withResponse: true, chunkSize: 0 });
```

With `withResponse: true`, the library uses `writeValueWithResponse()` and validates that the connected RX characteristic supports it. The send Promise resolves after the GATT response, providing transport-level backpressure. The constructor option with the same name selects the default mode.

The legacy boolean argument remains supported: `true` means Write without Response and `false` means Write with Response. The legacy third argument still sets `chunkSize`:

```js
await ble.sendBin(data, false, 100);
```

`canWriteWithResponse()`, `canWriteWithoutResponse()`, and `canIndicate()` expose the capabilities of the connected RX and TX characteristics. `getRxProperties()` and `getTxProperties()` return their complete `BluetoothCharacteristicProperties`, or `null` while disconnected. Every send validates the selected write mode and returns `false` through the usual error path when it is unsupported.

Web Bluetooth does not let JavaScript explicitly select Indication instead of Notification. A protocol that requires Indication should expose an indicate-only TX characteristic on the peripheral.
