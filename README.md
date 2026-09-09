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
await ble.sendBin(data, { chunkSize: 0 });
```

Для протоколов, где одна BLE write является одним транспортным frame, отключите дробление для конкретной отправки:

```js
const ok = await ble.sendBin(frame, { chunkSize: 0 });
```

Опция `withResponse` едина для всех методов отправки:

```js
await ble.sendBin(data, { withResponse: true });
await ble.sendText('hello', { withResponse: true });
```

Для атомарного фрейма с GATT response обе опции можно совместить:

```js
await ble.sendBin(frame, { withResponse: true, chunkSize: 0 });
```

При `withResponse: true` используется `writeValueWithResponse()`. Promise отправки завершается после ответа GATT-сервера, поэтому режим подходит для последовательной передачи с транспортным backpressure. Значение по умолчанию задаётся одноимённой настройкой конструктора.

Для обратной совместимости второй boolean-аргумент продолжает трактоваться как старый `fast`: `true` выбирает Write without Response, `false` — Write with Response. Третий аргумент старой формы задаёт `chunkSize`:

```js
await ble.sendBin(data, false, 100);
```

Перед использованием можно проверить свойства найденных характеристик:

```js
if (!ble.canWriteWithResponse()) throw new Error('Write with Response is unavailable');
if (!ble.canWriteWithoutResponse()) throw new Error('Write without Response is unavailable');
if (!ble.canIndicate()) throw new Error('Indications are unavailable');
```

`getRxProperties()` и `getTxProperties()` возвращают объект `BluetoothCharacteristicProperties` либо `null`, пока соединение не открыто. `startNotifications()` включает доступный режим, но не позволяет JavaScript принудительно выбрать Indication вместо Notification. Если протоколу нужны именно Indication, TX characteristic на устройстве следует объявлять как indicate-only.

Проверка поддержки выбранного способа записи выполняется внутри `sendBin()`. При несовместимой RX characteristic метод вызывает `onerror` и возвращает `false`.
