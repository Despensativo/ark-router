#!/usr/bin/env python3
import unittest
import json
import os
from test_harness import RouterSandbox

class TestDeviceStations(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()

    def tearDown(self):
        self.sb.cleanup()

    def test_01_device_stations_returns_valid_json(self):
        res = self.sb.run_control("device-stations")
        self.assertEqual(res.returncode, 0, f"device-stations falhou: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertIn("main_wifi_count", data)
        self.assertIn("guest_wifi_count", data)
        self.assertIn("total_wifi_count", data)
        self.assertIn("total_wired_count", data)
        self.assertIn("stations", data)
        self.assertIn("wired", data)
        self.assertIsInstance(data["stations"], list)
        self.assertIsInstance(data["wired"], list)

    def test_02_device_stations_mock_file(self):
        mock_data = {
            "main_wifi_count": 3,
            "guest_wifi_count": 1,
            "total_wifi_count": 4,
            "total_wired_count": 2,
            "stations": [
                {
                    "mac": "AA:BB:CC:DD:EE:11",
                    "ip": "192.168.1.101",
                    "name": "iPhone-User",
                    "ifname": "wlan0",
                    "ssid": "CASA_ARK",
                    "band": "5g",
                    "band_label": "5 GHz",
                    "signal": -48,
                    "is_guest": False
                },
                {
                    "mac": "AA:BB:CC:DD:EE:22",
                    "ip": "192.168.1.102",
                    "name": "Smart-TV",
                    "ifname": "wlan0",
                    "ssid": "CASA_ARK",
                    "band": "5g",
                    "band_label": "5 GHz",
                    "signal": -52,
                    "is_guest": False
                },
                {
                    "mac": "AA:BB:CC:DD:EE:33",
                    "ip": "192.168.1.103",
                    "name": "ESP32-Lampada",
                    "ifname": "wlan1",
                    "ssid": "CASA_ARK",
                    "band": "2g",
                    "band_label": "2,4 GHz",
                    "signal": -60,
                    "is_guest": False
                },
                {
                    "mac": "AA:BB:CC:DD:EE:44",
                    "ip": "192.168.1.201",
                    "name": "Visitante-1",
                    "ifname": "wlan0-1",
                    "ssid": "EQUIPE-X-VISITANTES",
                    "band": "5g",
                    "band_label": "5 GHz",
                    "signal": -65,
                    "is_guest": True
                }
            ],
            "wired": [
                {
                    "mac": "11:22:33:44:55:66",
                    "ip": "192.168.1.50",
                    "name": "Desktop-PC",
                    "device": "lan1",
                    "is_guest": False
                }
            ]
        }
        mock_path = os.path.join(self.sb.temp_dir, "tmp", "ark_mock_stations.json")
        os.makedirs(os.path.dirname(mock_path), exist_ok=True)
        with open(mock_path, "w", encoding="utf-8") as f:
            json.dump(mock_data, f)

        res = self.sb.run_control("device-stations")
        self.assertEqual(res.returncode, 0, f"device-stations falhou com mock: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertEqual(data["main_wifi_count"], 3)
        self.assertEqual(data["guest_wifi_count"], 1)
        self.assertEqual(data["total_wifi_count"], 4)
        self.assertEqual(len(data["stations"]), 4)
        self.assertEqual(data["stations"][0]["ssid"], "CASA_ARK")
        self.assertEqual(data["stations"][3]["ssid"], "EQUIPE-X-VISITANTES")

if __name__ == "__main__":
    unittest.main()
