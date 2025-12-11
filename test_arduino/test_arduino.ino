#include <Arduino.h>
#include <BLESerial.h>
// https://github.com/GyverLibs/BLESerial_ESP32

void setup() {
    Serial.begin(115200);
    Serial.println("Start");

    BLESerial.begin("ESP32C3");

    BLESerial.onData([](uint8_t* data, size_t len) {
        Serial.print("got data:");
        Serial.write(data, len);
        Serial.println();
    });

    BLESerial.onState([](bool conn) {
        Serial.println(conn ? "connect" : "disconnect");
    });
}

void loop() {
    static uint32_t t;
    if (millis() - t >= 3000) {
        t = millis();
        static int i;
        BLESerial.send(String("Hello ") + (++i));
    }
}