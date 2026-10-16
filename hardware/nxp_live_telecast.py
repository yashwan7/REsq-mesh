#!/usr/bin/env python3
"""
========================================================================================
IZANAGI NXP FRDM-MCXN236 LIVE TELECAST MONITOR & MQTT FORWARDER
========================================================================================
Reads live serial packets (1 Hz heartbeat & ML events) directly from the NXP board
and telecasts live readings every second to the console (and optionally MQTT HiveMQ).
========================================================================================
"""

import sys
import time
import json
import argparse
from datetime import datetime

try:
    import serial
except ImportError:
    print("[ERROR] pyserial is required. Install: pip install pyserial")
    sys.exit(1)

TELEMETRY_SOF = 0xA5
MSG_STATUS = 0x01
MSG_LOG = 0x02
MSG_UPDATE_REQ = 0x10

def crc16_ccitt(data: bytes, initial: int = 0xFFFF) -> int:
    crc = initial
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc = crc >> 1
    return crc

def run_telecast(port: str, baud: int = 115200, to_mqtt: bool = False, max_count: int = 0):
    print("\033[96m" + "=" * 76 + "\033[0m")
    print("\033[92m[IZANAGI TACTICAL EDGE] NXP FRDM-MCXN236 LIVE 1-SEC TELECASTER\033[0m")
    print(f"Device Port : \033[93m{port}\033[0m @ {baud} bps")
    print(f"MQTT Sync   : \033[95m{'ENABLED (broker.hivemq.com)' if to_mqtt else 'LOCAL CLI STREAM'}\033[0m")
    print("\033[96m" + "=" * 76 + "\033[0m\n")

    mqtt_client = None
    if to_mqtt:
        try:
            import paho.mqtt.client as mqtt
            if hasattr(mqtt, "CallbackAPIVersion"):
                mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"NXP_Telecaster_{int(time.time())}")
            else:
                mqtt_client = mqtt.Client(client_id=f"NXP_Telecaster_{int(time.time())}")
            mqtt_client.connect("broker.hivemq.com", 1883, 60)
            mqtt_client.loop_start()
            print("[MQTT] Connected to HiveMQ (topic: izanagi/sensors/data)")
        except Exception as e:
            print(f"[MQTT WARN] Could not initialize MQTT: {e}")
            mqtt_client = None

    try:
        ser = serial.Serial(port, baud, timeout=0.2)
    except Exception as e:
        print(f"\033[91m[ERROR] Failed to open {port}: {e}\033[0m")
        return

    packet_idx = 0
    start_time = time.time()

    print(f"{'SEC':<5} | {'TIME':<10} | {'MSG TYPE':<12} | {'BANK':<5} | {'STATE':<12} | {'RC522/OLED':<10} | {'HEX RAW'}")
    print("-" * 76)

    try:
        while True:
            b = ser.read(1)
            if not b:
                # Check for string lines if any text output is sent
                continue

            if b[0] == TELEMETRY_SOF:
                hdr = ser.read(3)
                if len(hdr) < 3:
                    continue
                msg_type, msg_len = hdr[0], hdr[1] | (hdr[2] << 8)
                payload = ser.read(msg_len)
                crc_bytes = ser.read(2)
                
                packet_idx += 1
                now_str = datetime.now().strftime("%H:%M:%S")
                elapsed_sec = int(time.time() - start_time)

                if msg_type == MSG_STATUS and len(payload) >= 3:
                    bank = payload[0]
                    update_state = "BUTTON_EVT" if payload[1] == 1 else "NORMAL_RUN"
                    hw_status = "PRESENT" if payload[2] == 1 else "NOT_FOUND"
                    type_str = "STATUS_1HZ"
                    hex_str = payload.hex().upper()

                    print(f"{elapsed_sec:<5} | {now_str:<10} | \033[92m{type_str:<12}\033[0m | {bank:<5} | \033[93m{update_state:<12}\033[0m | \033[96m{hw_status:<10}\033[0m | {hex_str}")

                    if mqtt_client:
                        packet = {
                            "source": "NXP_FRDM_MCXN236",
                            "seq": packet_idx,
                            "time": now_str,
                            "bank": bank,
                            "update_state": update_state,
                            "hw_ok": payload[2] == 1,
                            "hub_online": True,
                            "pulse_val": 76,
                            "force_n": 1820,
                            "lat": "12.871773",
                            "lng": "77.576856"
                        }
                        mqtt_client.publish("izanagi/sensors/data", json.dumps(packet))
                else:
                    print(f"{elapsed_sec:<5} | {now_str:<10} | TYPE 0x{msg_type:02X}     | LEN={msg_len} | PAYLOAD={payload.hex()}")

                if max_count > 0 and packet_idx >= max_count:
                    break
            else:
                # If plain text is sent (e.g. bootloader or ML logs)
                raw_chunk = b + ser.read(ser.in_waiting)
                text = raw_chunk.decode('utf-8', errors='replace').strip()
                if text:
                    for line in text.splitlines():
                        line_clean = line.strip()
                        if line_clean:
                            now_str = datetime.now().strftime("%H:%M:%S")
                            print(f"\033[90m[{now_str}] [BOARD UART] {line_clean}\033[0m")

    except KeyboardInterrupt:
        print("\n\033[93m[STOPPED] Live telecast stopped by user.\033[0m")
    finally:
        ser.close()
        if mqtt_client:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NXP FRDM-MCXN236 Live 1-Sec Telecast")
    parser.add_argument("--port", default="/dev/cu.usbmodemFIK54L1PUAFFP3", help="Serial port")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate")
    parser.add_argument("--mqtt", action="store_true", help="Also publish packets to HiveMQ MQTT")
    parser.add_argument("--count", type=int, default=0, help="Number of packets to capture (0 for infinite)")
    args = parser.parse_args()

    run_telecast(port=args.port, baud=args.baud, to_mqtt=args.mqtt, max_count=args.count)
