# BLE.js
Обёртка на Web Bluetooth API
- Автоматическое переподключение
- Последовательная отправка без пересечения записей
- Настраиваемое дробление больших отправок
- Отдельная атомарная отправка одного BLE frame

[demo](https://gyverlibs.github.io/BLE.js/test/)

> **Browser**: https://gyverlibs.github.io/BLE.js/BLE.min.js

> **Node**: npm i @alexgyver/ble

## Дока
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

sendBin(data, fast = true, chunkSize = config.chunkSize);
sendFrame(data, fast = true);
sendText(text, fast = true);
```

Все методы отправки возвращают `Promise<boolean>`.

## Дробление отправки

`sendBin()` делит данные на несколько BLE characteristic writes по `chunkSize`. Задержка между записями задаётся через `chunkDelay`:

```js
const ble = new BLEJS({
    chunkSize: 100,
    chunkDelay: 5,
});

await ble.sendBin(data);
```

`chunkSize <= 0` отключает дробление и выполняет одну characteristic write:

```js
await ble.sendBin(data, true, 0);
```

Для протоколов, где одна BLE write является одним транспортным frame, следует использовать `sendFrame()`:

```js
const ok = await ble.sendFrame(frame);
```

`sendFrame()` никогда не делит данные. Если characteristic или устройство не принимает запись такого размера, метод вызовет `onerror` и вернёт `false`.

Параметр `fast` выбирает способ записи:

- `true` — `writeValueWithoutResponse`
- `false` — `writeValueWithResponse`