import BLEJS from "https://gyverlibs.github.io/BLE.js/ble.min.js";
// import BLEJS from "../ble.js";

let i = 0;
let ble = new BLEJS({ auto_open: true });

// control
select_b.onclick = () => ble.select();
open_b.onclick = () => ble.open();
close_b.onclick = () => ble.close();

send_b.onclick = async () => {
    ble.sendBin(new TextEncoder().encode('Hello ' + i++));
}

// async function send(hex) {
//     const data = new Uint8Array(hex.trim().split(/\s+/).map(x => parseInt(x, 16)));
//     await ble.sendBin(data);
// }

// read
ble.onbin = b => console.log(new TextDecoder().decode(b));
// ble.ontext = t => console.log(t);

// state
// ble.onopen = () => {
//     console.log('Opened', ble.getName());
// }
// ble.onclose = () => {
//     console.log('Closed');
// }
ble.onchange = s => {
    console.log(s);
}
ble.onerror = e => {
    console.log(e);
}
ble.onselect = (d) => {
    console.log('select', d);
}