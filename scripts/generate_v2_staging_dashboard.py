#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Senior UI/UX Redesign — Modular SPA Architecture (Option 1).
Dedicated, zero-scroll panels with instant SPA transitions (UniFi / Synology / ROG standard).
- Eliminates the infinite vertical scroll "landing page" feel completely.
- Cockpit Overview: Single-screen panoramic NOC dashboard.
- Dedicated Panels: Multi-WAN, Wi-Fi 6E/7, Devices (34 clients), Optimization/CAKE,
  Security/WireGuard/PBR, Doctor/Starlink, Hardware/System, and LuCI Native Simulator.
- 100% discrete options as clean <select> dropdowns.
- 0px horizontal overflow across all viewports (1920p down to 320p).
- Mobile-first touch targets >= 44px.
"""

import os
import sys
import io
import json
import qrcode
import qrcode.image.svg

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
WORKSPACE_ROOT = os.path.abspath(os.path.join(REPO_DIR, "..", ".."))
TARGET_FILE = os.path.join(WORKSPACE_ROOT, "docs", "qa_screenshots", "v2_staging", "index.html")

print(f"Generating Modular SPA V2 Dashboard at: {TARGET_FILE}")
os.makedirs(os.path.dirname(TARGET_FILE), exist_ok=True)

# Generate 100% Genuine ISO/IEC 18004 Standard Wi-Fi QR Codes (Camera Scannable)
NETWORKS_FOR_QR = [
    {
        "id": "main",
        "name": "Wi-Fi-H&R",
        "label": "🌐 Principal (Tri-Band MLO)",
        "ssid": "Wi-Fi-H&R",
        "pass": "MinhaSenhaForte2026",
        "sec": "WPA3-SAE / WPA2-PSK Misto",
        "band": "2.4 GHz + 5 GHz + 6 GHz (MLO)",
        "clients": 27,
        "bssid": "70:9e:29:ab:11:01"
    },
    {
        "id": "guest",
        "name": "Wi-Fi-H&R-Visitantes",
        "label": "🤝 Visitantes (Isolada)",
        "ssid": "Wi-Fi-H&R-Visitantes",
        "pass": "Visitas@Ark2026",
        "sec": "WPA2-PSK (Isolada da Intranet)",
        "band": "Dual-Band 2.4G / 5G",
        "clients": 4,
        "bssid": "70:9e:29:ab:11:02"
    },
    {
        "id": "iot",
        "name": "Wi-Fi-H&R-IoT",
        "label": "🏠 Automação IoT",
        "ssid": "Wi-Fi-H&R-IoT",
        "pass": "IoTSmartHome2026",
        "sec": "WPA2-PSK Legado (2.4G Estrito)",
        "band": "2.4 GHz Exclusivo",
        "clients": 12,
        "bssid": "70:9e:29:ab:11:03"
    },
    {
        "id": "5g",
        "name": "Wi-Fi-H&R-5G",
        "label": "⚡ Rádio 5 GHz 160M",
        "ssid": "Wi-Fi-H&R-5G",
        "pass": "MinhaSenhaForte2026",
        "sec": "WPA3-SAE / WPA2-PSK",
        "band": "5 GHz Ultra (160 MHz)",
        "clients": 15,
        "bssid": "70:9e:29:ab:11:01"
    },
    {
        "id": "6g",
        "name": "Wi-Fi-H&R-6G-Pro",
        "label": "🚀 Wi-Fi 7 BE 320M",
        "ssid": "Wi-Fi-H&R-6G-Pro",
        "pass": "MinhaSenhaForte2026",
        "sec": "WPA3-SAE Puro",
        "band": "6 GHz Wi-Fi 7 (320 MHz)",
        "clients": 4,
        "bssid": "70:9e:29:ab:11:01"
    }
]

qr_cache = {}
for n in NETWORKS_FOR_QR:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
        image_factory=qrcode.image.svg.SvgPathImage
    )
    # Standard Wi-Fi URI format parsed universally by iOS & Android cameras
    payload = f"WIFI:T:WPA;S:{n['ssid']};P:{n['pass']};;"
    qr.add_data(payload)
    qr.make(fit=True)
    f_mem = io.BytesIO()
    img = qr.make_image(attrib={
        'class': 'wifi-qr-svg',
        'style': 'width:100%;height:100%;max-width:210px;max-height:210px;display:block;margin:0 auto;'
    })
    img.save(f_mem)
    svg_str = f_mem.getvalue().decode('utf-8')
    qr_cache[n['id']] = {
        **n,
        "payload": payload,
        "svg": svg_str
    }

QR_DATA_JSON = json.dumps(qr_cache)

HTML_TEMPLATE = r'''<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>ARK Router OS — Central Operacional V2 (SPA Modular)</title>
    <link rel="stylesheet" href="/GitHub/luci-app-ark-router/root/www/luci-static/ark/cascade.css">
    <link rel="stylesheet" href="/GitHub/luci-app-ark-router/root/www/luci-static/resources/view/equipe-dashboard/overview_v2.css">
    <style>
        :root {
            --ark-bg: #090e1a;
            --ark-surface-1: #0f172a;
            --ark-surface-2: #162238;
            --ark-surface-3: #1f304f;
            --ark-border: rgba(255, 255, 255, 0.08);
            --ark-border-hover: rgba(56, 189, 248, 0.35);
            --ark-text-main: #f8fafc;
            --ark-text-muted: #94a3b8;
            --ark-primary: #0284c7;
            --ark-primary-hover: #0369a1;
            --ark-cyan: #06b6d4;
            --ark-emerald: #10b981;
            --ark-violet: #8b5cf6;
            --ark-amber: #f59e0b;
            --ark-rose: #f43f5e;
            --ark-radius-sm: 8px;
            --ark-radius-md: 12px;
            --ark-radius-lg: 16px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            background-color: var(--ark-bg);
            color: var(--ark-text-main);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
            min-height: 100vh;
            max-width: 100vw;
        }

        /* App Shell */
        .app-shell {
            display: flex;
            min-height: 100vh;
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
        }

        /* Fixed Sidebar Navigation */
        .sidebar {
            width: 250px;
            background: #0b1324;
            border-right: 1px solid var(--ark-border);
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            position: sticky;
            top: 0;
            height: 100vh;
            overflow-y: auto;
            z-index: 50;
            padding: 16px 12px;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 4px 6px 16px;
            border-bottom: 1px solid var(--ark-border);
            margin-bottom: 14px;
        }

        .sidebar-logo {
            width: 38px;
            height: 38px;
            background: linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #8b5cf6 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 19px;
            color: #fff;
            box-shadow: 0 4px 16px rgba(2, 132, 199, 0.4);
        }

        .sidebar-title h1 {
            font-size: 1.05rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #fff;
            line-height: 1.2;
        }

        .sidebar-title .version-badge {
            font-size: 0.68rem;
            font-weight: 700;
            color: #38bdf8;
            background: rgba(56, 189, 248, 0.12);
            padding: 1px 6px;
            border-radius: 6px;
            display: inline-block;
            margin-top: 2px;
        }

        .nav-section-title {
            font-size: 0.68rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #64748b;
            font-weight: 800;
            padding: 10px 8px 4px;
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: var(--ark-radius-sm);
            color: var(--ark-text-muted);
            text-decoration: none;
            font-size: 0.86rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.18s ease;
            margin-bottom: 2px;
            border-left: 3px solid transparent;
        }

        .nav-item:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.05);
        }

        .nav-item.active {
            color: #fff;
            background: linear-gradient(90deg, rgba(2, 132, 199, 0.28) 0%, rgba(2, 132, 199, 0.08) 100%);
            border-left-color: #38bdf8;
            font-weight: 700;
        }

        .nav-item .icon {
            font-size: 1.05rem;
            width: 22px;
            text-align: center;
        }

        .sidebar-footer {
            margin-top: auto;
            padding-top: 14px;
            border-top: 1px solid var(--ark-border);
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        /* Fixed Top Header */
        .top-header {
            position: sticky;
            top: 0;
            z-index: 40;
            background: rgba(11, 19, 36, 0.92);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--ark-border);
            height: 60px;
            padding: 0 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .btn-hamburger {
            display: none;
            background: none;
            border: 1px solid var(--ark-border);
            color: #fff;
            font-size: 1.2rem;
            padding: 6px 10px;
            border-radius: 8px;
            cursor: pointer;
        }

        /* Physical Switch Port Status Panel (T-036 / ARK-LAN-002) */
        .switch-ports-panel {
            background: var(--ark-surface-2);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 16px;
            margin-top: 18px;
        }
        .switch-ports-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 10px;
            margin-top: 12px;
        }
        .switch-port-box {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: var(--ark-radius-sm);
            padding: 10px 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            position: relative;
            transition: all 0.2s ease;
        }
        .switch-port-box:hover {
            border-color: var(--ark-border-hover);
            transform: translateY(-2px);
        }
        .switch-port-box.port-up {
            border-top: 3px solid #10b981;
        }
        .switch-port-box.port-down {
            border-top: 3px solid #64748b;
            opacity: 0.65;
        }
        .switch-port-icon {
            width: 44px;
            height: 38px;
            background: #090e1a;
            border: 2px solid #334155;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 6px 0;
            position: relative;
        }
        .switch-port-leds {
            display: flex;
            gap: 10px;
            margin-bottom: 2px;
        }
        .switch-led {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: #475569;
        }
        .switch-led.led-green {
            background: #10b981;
            box-shadow: 0 0 6px #10b981;
        }
        .switch-led.led-amber {
            background: #f59e0b;
            box-shadow: 0 0 6px #f59e0b;
        }
        .switch-port-jack {
            width: 22px;
            height: 12px;
            background: #1e293b;
            border-radius: 2px 2px 4px 4px;
            border: 1px solid #475569;
        }
        .switch-port-name {
            font-size: 0.78rem;
            font-weight: 800;
            color: #fff;
        }
        .switch-port-speed {
            font-size: 0.72rem;
            font-weight: 700;
            margin-top: 2px;
        }
        .switch-port-target {
            font-size: 0.68rem;
            color: #94a3b8;
            margin-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
        }

        /* Quick Cockpit Indicators Bar */
        .cockpit-pills-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 14px;
        }
        .cockpit-pill-item {
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid var(--ark-border);
            border-radius: 20px;
            padding: 6px 12px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.78rem;
            color: #cbd5e1;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .cockpit-pill-item:hover {
            border-color: #38bdf8;
            background: rgba(56, 189, 248, 0.12);
            color: #fff;
            transform: translateY(-1px);
        }

        /* Content Area & Modular Panels (SPA Switcher) */
        .content-area {
            flex-grow: 1;
            padding: 22px;
            max-width: 1500px;
            margin: 0 auto;
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
        }

        .view-panel {
            display: none;
            opacity: 0;
            transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .view-panel.active {
            display: block;
            opacity: 1;
            animation: panelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes panelIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Cockpit Hero Card (Compact, Professional Header) */
        .ex-hero {
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(22, 34, 56, 0.95) 100%);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-lg);
            padding: 22px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        }

        .ex-hero::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #0284c7, #06b6d4, #8b5cf6, #10b981);
            pointer-events: none;
            z-index: 1;
        }

        .ex-hero-info, .ex-hero-right {
            position: relative;
            z-index: 2;
        }

        .ex-hero-eyebrow {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #38bdf8;
            font-weight: 800;
        }

        .ex-hero-title {
            font-size: 1.6rem;
            font-weight: 800;
            color: #fff;
            letter-spacing: -0.02em;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .ex-hero-desc {
            font-size: 0.84rem;
            color: #94a3b8;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 2px;
        }

        .ex-hero-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
        }

        .ex-hero-status-row {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ex-clock-box {
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 6px 14px;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .ex-clock-box:hover {
            border-color: rgba(56, 189, 248, 0.4);
            background: rgba(56, 189, 248, 0.08);
        }

        .ex-date-val {
            font-size: 0.72rem;
            font-weight: 600;
            color: #94a3b8;
        }

        .ex-time-val {
            font-size: 1.35rem;
            font-weight: 800;
            color: #fff;
            font-variant-numeric: tabular-nums;
            letter-spacing: 0.04em;
        }

        .ex-hero-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 10px;
        }

        .btn-hero-action {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #e2e8f0;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 0.78rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.18s ease;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .btn-hero-action:hover {
            background: rgba(255, 255, 255, 0.14);
            border-color: rgba(255, 255, 255, 0.25);
            color: #fff;
            transform: translateY(-1px);
        }

        .btn-hero-primary {
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            border-color: rgba(56, 189, 248, 0.4);
            color: #fff;
            box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
        }

        .btn-hero-primary:hover {
            background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%);
            box-shadow: 0 6px 16px rgba(2, 132, 199, 0.45);
        }

        /* Health Strip (5 Compact Vitals) */
        .health-strip {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 14px;
            margin-bottom: 20px;
        }

        .health-card {
            background: var(--ark-surface-1);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .health-card:hover {
            transform: translateY(-2px);
            border-color: var(--ark-border-hover);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
        }

        .health-icon-box {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.35rem;
            flex-shrink: 0;
        }

        .health-info {
            display: flex;
            flex-direction: column;
            gap: 3px;
            flex-grow: 1;
        }

        .health-label {
            font-size: 0.75rem;
            color: var(--ark-text-muted);
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.05em;
        }

        .health-val {
            font-size: 1.15rem;
            font-weight: 800;
            color: #fff;
        }

        .health-bar-bg {
            width: 100%;
            height: 5px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            overflow: hidden;
            margin-top: 3px;
        }

        .health-bar-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.4s ease;
        }

        /* Live Traffic Grid */
        .traffic-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
        }

        .traffic-canvas-card {
            background: var(--ark-surface-2);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 16px;
        }

        .traffic-canvas-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            flex-wrap: wrap;
            gap: 8px;
        }

        .traffic-interface-pills {
            display: flex;
            gap: 6px;
            background: rgba(0, 0, 0, 0.35);
            padding: 3px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            overflow-x: auto;
            max-width: 100%;
        }

        .traffic-pill-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 0.72rem;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
        }

        .traffic-pill-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.08);
        }

        .traffic-pill-btn.active {
            background: #38bdf8;
            color: #0b1324;
            box-shadow: 0 2px 8px rgba(56, 189, 248, 0.4);
        }

        .traffic-stats-column {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .traffic-stat-card {
            background: var(--ark-surface-2);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 14px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .stat-rate {
            font-size: 1.6rem;
            font-weight: 900;
            line-height: 1.1;
        }

        .stat-rate.down { color: #38bdf8; }
        .stat-rate.up { color: #a855f7; }

        .stat-peak {
            font-size: 0.75rem;
            color: var(--ark-text-muted);
            margin-top: 4px;
        }

        .stat-meta-row {
            display: flex;
            gap: 8px;
            font-size: 0.72rem;
            color: #94a3b8;
            margin-top: 5px;
            flex-wrap: wrap;
            align-items: center;
        }

        .stat-badge {
            background: rgba(255, 255, 255, 0.05);
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            font-size: 0.7rem;
            font-family: ui-monospace, monospace;
        }

        /* Panoramic Summary Grid (Cockpit View) */
        .cockpit-summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
        }

        .cockpit-summary-card {
            background: var(--ark-surface-1);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: all 0.2s ease;
            position: relative;
        }

        .cockpit-summary-card:hover {
            border-color: rgba(56, 189, 248, 0.4);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }

        .cockpit-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .cockpit-card-title {
            font-size: 0.95rem;
            font-weight: 800;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .cockpit-card-val {
            font-size: 1.3rem;
            font-weight: 900;
            color: #fff;
        }

        .cockpit-card-desc {
            font-size: 0.8rem;
            color: #94a3b8;
            line-height: 1.4;
        }

        /* Section Cards inside Dedicated Panels */
        .section-card {
            background: var(--ark-surface-1);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-lg);
            padding: 22px;
            margin-bottom: 20px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--ark-border);
            flex-wrap: wrap;
            gap: 12px;
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-title h2 {
            font-size: 1.25rem;
            font-weight: 800;
            color: #fff;
            letter-spacing: -0.01em;
        }

        .section-title .badge {
            font-size: 0.72rem;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 6px;
        }

        /* Multi-WAN Cards */
        .wan-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 16px;
        }

        .wan-card {
            background: var(--ark-surface-2);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .wan-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .wan-title {
            font-size: 1.05rem;
            font-weight: 800;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .wan-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 14px;
            background: rgba(0, 0, 0, 0.2);
            padding: 12px;
            border-radius: 8px;
            font-size: 0.82rem;
        }

        .wan-info-item span {
            color: var(--ark-text-muted);
            display: block;
            font-size: 0.72rem;
            text-transform: uppercase;
            font-weight: 700;
        }

        .wan-info-item strong {
            color: #fff;
            font-size: 0.88rem;
            word-break: break-all;
        }

        .wan-actions {
            display: flex;
            gap: 8px;
            margin-top: 4px;
        }

        /* Wi-Fi Cards */
        .wifi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
        }

        .wifi-radio-card {
            background: var(--ark-surface-2);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .wifi-radio-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .wifi-radio-title {
            font-size: 1rem;
            font-weight: 800;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .wifi-radio-card.disabled {
            opacity: 0.5;
            filter: grayscale(0.85);
            pointer-events: auto;
        }

        /* Configured Wi-Fi Networks (SSIDs / VAPs) */
        .wifi-networks-container {
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .wifi-network-card {
            background: var(--ark-surface-2);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 16px 18px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            transition: all 0.2s ease;
        }

        .wifi-network-card:hover {
            border-color: var(--ark-border-hover);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }

        .wifi-network-card.disabled {
            opacity: 0.55;
            filter: grayscale(0.7);
            border-style: dashed;
        }

        .wifi-net-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
        }

        .wifi-net-title-group {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .wifi-net-ssid {
            font-size: 1.25rem;
            font-weight: 800;
            color: #fff;
            letter-spacing: -0.02em;
        }

        .wifi-net-alias {
            font-size: 0.8rem;
            color: #94a3b8;
            font-weight: 500;
        }

        .wifi-net-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 10px;
            background: rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 12px 14px;
        }

        .wifi-net-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .wifi-net-item span {
            font-size: 0.7rem;
            color: #94a3b8;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.03em;
        }

        .wifi-net-item strong {
            font-size: 0.85rem;
            color: #f1f5f9;
            font-weight: 600;
        }

        .wifi-net-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 12px;
        }

        /* Wi-Fi QR Code Modal Tabs & Frame */
        .wifi-qr-tab {
            padding: 8px 14px;
            border-radius: 8px;
            border: 1px solid var(--ark-border);
            background: rgba(255, 255, 255, 0.04);
            color: #cbd5e1;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            min-height: 40px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .wifi-qr-tab:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(56, 189, 248, 0.4);
            color: #fff;
        }

        .wifi-qr-tab.active {
            background: var(--ark-primary);
            border-color: var(--ark-primary);
            color: #fff;
            box-shadow: 0 0 12px rgba(2, 132, 199, 0.4);
        }

        .wifi-qr-frame {
            display: inline-block;
            background: #ffffff;
            padding: 16px;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
            margin: 12px auto;
            max-width: 230px;
            width: 100%;
        }

        /* EZ-Setup Section Boxes */
        .ez-section-box {
            background: rgba(0, 0, 0, 0.22);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: var(--ark-radius-md);
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .ez-section-title {
            font-size: 0.95rem;
            font-weight: 800;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 2px;
        }

        .ez-plugin-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 10px 12px;
            gap: 10px;
            transition: all 0.2s ease;
        }

        .ez-plugin-card:hover {
            border-color: rgba(56, 189, 248, 0.3);
            background: rgba(255, 255, 255, 0.05);
        }

        .ez-plugin-card.installed {
            border-color: rgba(16, 185, 129, 0.3);
            background: rgba(16, 185, 129, 0.06);
        }

        /* Plugins Central (Software Manager) */
        .plugins-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 14px;
            margin-top: 14px;
        }

        .plugin-detail-card {
            background: var(--ark-surface-2);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 12px;
            transition: all 0.2s ease;
        }

        .plugin-detail-card:hover {
            border-color: var(--ark-border-hover);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }

        .plugin-card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
        }

        .plugin-card-info h4 {
            font-size: 1.05rem;
            font-weight: 800;
            color: #fff;
            margin-bottom: 3px;
        }

        .plugin-card-info p {
            font-size: 0.8rem;
            color: #94a3b8;
            line-height: 1.4;
            margin-top: 4px;
        }

        .plugin-card-meta {
            display: flex;
            gap: 10px;
            font-size: 0.75rem;
            color: #64748b;
            font-family: monospace;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .plugin-card-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .terminal-sim-box {
            background: #050811;
            border: 1px solid rgba(56, 189, 248, 0.25);
            border-radius: 8px;
            padding: 14px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.8rem;
            color: #38bdf8;
            max-height: 240px;
            overflow-y: auto;
            line-height: 1.5;
            white-space: pre-wrap;
            box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.7);
        }

        .plugins-tabs {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 4px;
            margin-bottom: 12px;
            -webkit-overflow-scrolling: touch;
        }

        .plugin-tab-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #94a3b8;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s ease;
        }

        .plugin-tab-btn.active, .plugin-tab-btn:hover {
            background: rgba(56, 189, 248, 0.18);
            border-color: #38bdf8;
            color: #fff;
        }

        .modal-footer-multi {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: flex-end;
            width: 100%;
        }

        @media (max-width: 854px) {
            .modal-footer-multi {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 8px !important;
            }
            .modal-footer-multi .ark-btn {
                flex: 1 1 calc(50% - 6px) !important;
                min-height: 42px !important;
                font-size: 0.82rem !important;
            }
            .modal-footer-multi .ark-btn-primary {
                flex: 1 1 100% !important;
            }
            .plugins-grid {
                grid-template-columns: 1fr !important;
            }
        }

        /* Devices Table */
        .device-filters {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
            flex-wrap: wrap;
        }

        .device-tabs {
            display: flex;
            gap: 6px;
            background: rgba(0, 0, 0, 0.25);
            padding: 4px;
            border-radius: 10px;
        }

        .device-tab {
            background: none;
            border: none;
            color: var(--ark-text-muted);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .device-tab:hover { color: #fff; }

        .device-tab.active {
            background: var(--ark-primary);
            color: #fff;
        }

        .device-search-box {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .device-search-input {
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid var(--ark-border);
            color: #fff;
            padding: 7px 12px;
            border-radius: 8px;
            font-size: 0.82rem;
            width: 200px;
            outline: none;
        }

        .device-search-input:focus { border-color: var(--ark-primary); }

        .device-table-container {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
        }

        .device-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.84rem;
            text-align: left;
        }

        .device-table th {
            background: #0f192d;
            padding: 12px 14px;
            color: #94a3b8;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.72rem;
            letter-spacing: 0.05em;
            border-bottom: 1px solid var(--ark-border);
            white-space: nowrap;
        }

        .device-table td {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            color: #e2e8f0;
            white-space: nowrap;
        }

        .device-table tr:hover { background: rgba(255, 255, 255, 0.02); }

        /* Buttons & Pills */
        .ark-btn {
            background: var(--ark-surface-3);
            border: 1px solid var(--ark-border);
            color: #fff;
            padding: 7px 14px;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.18s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .ark-btn:hover {
            background: var(--ark-border-hover);
            color: #fff;
            transform: translateY(-1px);
        }

        .ark-btn-primary {
            background: var(--ark-primary);
            border-color: rgba(56, 189, 248, 0.3);
        }

        .ark-btn-primary:hover { background: var(--ark-primary-hover); }

        .ark-btn-purple {
            background: #7c3aed;
            border-color: rgba(168, 85, 247, 0.4);
        }

        .ark-btn-purple:hover { background: #6d28d9; }

        .ark-btn-danger {
            background: rgba(244, 63, 94, 0.15);
            border-color: rgba(244, 63, 94, 0.4);
            color: #fda4af;
        }

        .ark-btn-danger:hover {
            background: #e11d48;
            color: #fff;
        }

        .ark-btn-secondary {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.12);
            color: #cbd5e1;
        }

        .ark-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
        }

        .pill-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 0.72rem;
            font-weight: 800;
            text-transform: uppercase;
        }

        .pill-online {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .pill-cyan {
            background: rgba(6, 182, 212, 0.15);
            color: #22d3ee;
            border: 1px solid rgba(6, 182, 212, 0.3);
        }

        .pill-purple {
            background: rgba(139, 92, 246, 0.15);
            color: #c084fc;
            border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .pill-amber {
            background: rgba(245, 158, 11, 0.15);
            color: #fbbf24;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }

        /* Switches & Toggles */
        .ark-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
        }

        .ark-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .ark-slider {
            position: absolute;
            cursor: pointer;
            inset: 0;
            background-color: rgba(255, 255, 255, 0.15);
            transition: .25s ease;
            border-radius: 24px;
            border: 1px solid var(--ark-border);
        }

        .ark-slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .25s ease;
            border-radius: 50%;
        }

        input:checked + .ark-slider {
            background-color: #0284c7;
            border-color: #38bdf8;
        }

        input:checked + .ark-slider:before {
            transform: translateX(20px);
        }

        /* Modals & Backdrop (Responsive Bottom Sheet & Fullscreen Support) */
        #modal_overlay {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100dvh;
            background: rgba(0, 0, 0, 0.82);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 2000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
            box-sizing: border-box;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease, visibility 0.2s ease;
        }

        body.modal-overlay-active #modal_overlay {
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
            width: 100%;
            box-sizing: border-box;
            margin-bottom: 8px;
        }

        .form-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #94a3b8;
            display: block;
            margin-bottom: 3px;
        }

        .form-select, .form-input {
            width: 100%;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.14);
            color: #f8fafc;
            border-radius: 8px;
            padding: 9px 12px;
            font-size: 0.9rem;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .form-select:focus, .form-input:focus {
            border-color: #38bdf8;
            box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25);
        }

        .modal-box {
            background: #0f192d;
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: var(--ark-radius-lg);
            width: 100%;
            max-width: 640px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85);
            height: auto;
            max-height: calc(100dvh - 40px);
            display: flex;
            flex-direction: column;
            position: relative;
            margin: auto;
            box-sizing: border-box;
            overflow: hidden;
            transition: max-width 0.2s ease, max-height 0.2s ease, border-radius 0.2s ease;
        }

        .modal-box.modal-fullscreen {
            max-width: 100vw !important;
            width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            margin: 0 !important;
            border: none !important;
            inset: 0 !important;
            position: fixed !important;
            z-index: 2005 !important;
        }

        #modal_content_holder {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            max-height: 100%;
            min-height: 0;
            overflow: hidden;
            flex: 1 1 auto;
            box-sizing: border-box;
        }

        .modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--ark-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #0f192d;
            flex-shrink: 0;
            position: sticky;
            top: 0;
            z-index: 20;
            box-sizing: border-box;
        }

        .modal-header h3 {
            font-size: 1.12rem;
            font-weight: 800;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            line-height: 1.3;
        }

        .modal-header-actions {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
        }

        .modal-maximize-btn, .modal-close-btn {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #94a3b8;
            font-size: 1.1rem;
            cursor: pointer;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.15s ease;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        .modal-maximize-btn:hover, .modal-close-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.25);
        }

        .modal-body {
            padding: 20px 22px;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            overscroll-behavior: contain;
            display: flex;
            flex-direction: column;
            gap: 16px;
            flex: 1 1 auto;
            min-height: 0;
            box-sizing: border-box;
            scrollbar-width: thin;
            scrollbar-color: #38bdf8 rgba(255, 255, 255, 0.1);
        }

        .modal-body::-webkit-scrollbar {
            width: 6px;
        }
        .modal-body::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }
        .modal-body::-webkit-scrollbar-thumb {
            background: #38bdf8;
            border-radius: 3px;
        }

        .modal-footer {
            padding: 14px 22px;
            border-top: 1px solid var(--ark-border);
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 10px;
            background: #0b1323;
            flex-shrink: 0;
            position: sticky;
            bottom: 0;
            z-index: 20;
            box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.4);
            box-sizing: border-box;
        }

        /* LuCI Drawer */
        #luci_drawer_backdrop {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100dvh;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(4px);
            z-index: 1500;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.25s ease, visibility 0.25s ease;
        }

        #luci_drawer_backdrop.open {
            opacity: 1;
            visibility: visible;
        }

        #luci_drawer {
            position: fixed;
            top: 0;
            right: -440px;
            width: 400px;
            max-width: 90vw;
            height: 100dvh;
            background: #0b1324;
            border-left: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: -10px 0 40px rgba(0, 0, 0, 0.8);
            z-index: 1600;
            overflow-y: auto;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            transition: right 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }

        #luci_drawer.open { right: 0; }

        .drawer-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--ark-border);
            padding-bottom: 14px;
        }

        .drawer-category {
            font-size: 0.72rem;
            text-transform: uppercase;
            font-weight: 800;
            color: #38bdf8;
            letter-spacing: 0.08em;
            margin-top: 10px;
            padding-bottom: 4px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .drawer-link {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            color: #e2e8f0;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.18s ease;
        }

        .drawer-link:hover {
            background: rgba(56, 189, 248, 0.15);
            border-color: rgba(56, 189, 248, 0.35);
            color: #fff;
            transform: translateX(-2px);
        }

        .drawer-link-meta {
            font-size: 0.7rem;
            color: #94a3b8;
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 4px;
        }

        
        .luci-sim-subnav {
            background: #1e293b;
            display: flex;
            padding: 8px 24px;
            gap: 8px;
            overflow-x: auto;
            white-space: nowrap;
            border-bottom: 1px solid #334155;
            -webkit-overflow-scrolling: touch;
        }
        .luci-subnav-pill {
            color: #cbd5e1;
            padding: 6px 14px;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.18s ease;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .luci-subnav-pill:hover, .luci-subnav-pill.active {
            background: #2563eb;
            color: #fff;
            border-color: #60a5fa;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
        }
        .luci-terminal-box {
            background: #090d16;
            border: 1px solid #1e293b;
            border-radius: 8px;
            padding: 16px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.8rem;
            color: #10b981;
            max-height: 380px;
            overflow-y: auto;
            white-space: pre-wrap;
            line-height: 1.5;
        }

        /* LuCI Simulator View */
        #luci_native_view_container {
            display: none;
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100dvh;
            background: #111827;
            z-index: 1800;
            overflow-y: auto;
            flex-direction: column;
        }

        #luci_native_view_container.active { display: flex; }

        .luci-sim-bar {
            background: #1f2937;
            border-bottom: 1px solid #374151;
            padding: 10px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .luci-sim-classic-header {
            background: #1e3a8a;
            color: #fff;
            padding: 14px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .luci-sim-classic-nav {
            background: #2563eb;
            display: flex;
            padding: 0 24px;
            gap: 4px;
            overflow-x: auto;
            white-space: nowrap;
        }

        .luci-nav-tab {
            color: #fff;
            padding: 10px 16px;
            font-size: 0.88rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            border-bottom: 3px solid transparent;
        }

        .luci-nav-tab.active {
            background: #1d4ed8;
            border-bottom-color: #60a5fa;
        }

        .luci-sim-content {
            padding: 24px;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        }

        /* Toast Notifications */
        #toast_notify {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #0284c7;
            color: #fff;
            padding: 12px 20px;
            border-radius: 10px;
            font-size: 0.88rem;
            font-weight: 700;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            z-index: 3000;
            opacity: 0;
            visibility: hidden;
            transform: translateY(12px);
            transition: all 0.25s ease;
        }

        #toast_notify.show {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        /* Responsive Breakpoints & Strict Viewport Containment */
        @media (min-width: 855px) and (max-width: 1180px) {
            .sidebar { width: 220px; }
            .traffic-grid { grid-template-columns: 1fr; }
            .health-strip { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 854px) {
            html, body {
                max-width: 100vw !important;
                overflow-x: hidden !important;
            }
            .app-shell {
                max-width: 100vw !important;
                overflow-x: hidden !important;
            }
            .content-area {
                max-width: 100vw !important;
                min-width: 0 !important;
                box-sizing: border-box !important;
                padding: 12px !important;
                overflow-x: hidden !important;
            }
            .section-card {
                max-width: 100% !important;
                box-sizing: border-box !important;
                padding: 14px !important;
                overflow-x: hidden !important;
            }
            .sidebar {
                position: fixed;
                left: -260px;
                box-shadow: 10px 0 35px rgba(0, 0, 0, 0.85);
            }
            .sidebar.open { transform: translateX(260px); }
            .btn-hamburger {
                display: block;
                min-height: 42px;
                min-width: 42px;
            }
            #btn_sidebar_close { display: flex !important; }
            .top-header { padding: 0 14px; }
            .ex-hero { padding: 16px; }
            .ex-hero-right {
                align-items: flex-start;
                width: 100%;
            }
            .ex-hero-actions {
                width: 100%;
                gap: 6px;
            }
            .ex-hero-actions .btn-hero-action {
                flex: 1 1 calc(50% - 6px);
                justify-content: center;
                min-height: 42px;
                font-size: 0.8rem;
            }
            .ex-hero-status-row {
                width: 100%;
                justify-content: space-between;
                flex-wrap: wrap;
            }
            .ex-clock-box {
                width: 100%;
                align-items: center;
                margin-top: 6px;
            }
            .health-strip {
                grid-template-columns: 1fr 1fr !important;
                gap: 10px !important;
            }
            .traffic-grid { grid-template-columns: 1fr !important; }
            .wan-grid { grid-template-columns: 1fr !important; }
            .wifi-grid { grid-template-columns: 1fr !important; }
            .cockpit-summary-grid { grid-template-columns: 1fr !important; }
            .device-filters {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 10px !important;
            }
            .device-tabs {
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
                width: 100% !important;
                box-sizing: border-box !important;
                padding: 4px !important;
            }
            .device-tab {
                min-height: 40px !important;
                padding: 8px 12px !important;
                white-space: nowrap !important;
            }
            .device-search-box {
                flex-direction: column !important;
                width: 100% !important;
                gap: 8px !important;
            }
            .device-search-input {
                width: 100% !important;
                min-height: 42px !important;
                box-sizing: border-box !important;
            }
            .device-search-box .form-select {
                width: 100% !important;
                min-height: 42px !important;
            }
            .device-table-container {
                max-width: 100% !important;
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
                box-sizing: border-box !important;
                border-radius: 8px !important;
            }
            .ark-table-swipe-hint { display: flex !important; }
            /* Mobile Responsive Modal Optimization (Natural Auto-Height & Zero Wasted Space) */
            #modal_overlay {
                padding: 14px 10px !important;
                align-items: center !important;
                justify-content: center !important;
                overflow-y: auto !important;
            }
            .modal-box {
                max-width: calc(100vw - 20px) !important;
                width: calc(100vw - 20px) !important;
                height: auto !important;
                max-height: calc(100dvh - 28px) !important;
                margin: auto !important;
                border-radius: 16px !important;
                border: 1px solid rgba(56, 189, 248, 0.35) !important;
                box-shadow: 0 16px 50px rgba(0, 0, 0, 0.9) !important;
                display: flex !important;
                flex-direction: column !important;
            }
            .modal-box.modal-fullscreen {
                max-width: 100vw !important;
                width: 100vw !important;
                height: 100dvh !important;
                max-height: 100dvh !important;
                border-radius: 0 !important;
                margin: 0 !important;
                border: none !important;
            }
            .modal-header {
                padding: 14px 18px !important;
                flex: 0 0 auto !important;
                background: #0f192d !important;
            }
            .modal-header h3 {
                font-size: 1.05rem !important;
            }
            .modal-body {
                padding: 16px 18px !important;
                gap: 12px !important;
                flex: 1 1 auto !important;
                min-height: 0 !important;
                max-height: none !important;
                overflow-y: auto !important;
                -webkit-overflow-scrolling: touch !important;
            }
            .modal-footer {
                padding: 10px 16px !important;
                display: grid !important;
                grid-template-columns: 1fr 1.35fr !important;
                flex-direction: row !important;
                gap: 8px !important;
                background: #09101c !important;
                flex: 0 0 auto !important;
                border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
            }
            .modal-footer .ark-btn {
                width: 100% !important;
                height: 42px !important;
                min-height: 42px !important;
                font-size: 0.9rem !important;
                font-weight: 700 !important;
                padding: 0 10px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                white-space: nowrap !important;
            }
            .form-select, .form-input {
                min-height: 44px !important;
                font-size: 16px !important;
            }
            .ark-btn, .btn-hero-action {
                min-height: 42px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .sidebar-footer .ark-btn {
                min-height: 44px !important;
            }
        }
    </style>
</head>
<body>

    <!-- App Shell -->
    <div class="app-shell">
        <div id="sidebar_backdrop" onclick="toggleSidebar()" style="position:fixed; inset:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); z-index:45; display:none;"></div>

        <!-- Sidebar Navigation -->
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-brand">
                <div class="sidebar-logo">⚡</div>
                <div class="sidebar-title">
                    <h1>ARK Router</h1>
                    <span class="version-badge">v1.5.17 Pro (V2)</span>
                </div>
                <button class="modal-close-btn" id="btn_sidebar_close" onclick="toggleSidebar()" style="display:none; margin-left:auto; font-size:1.1rem; color:#fff;" aria-label="Fechar menu">✕</button>
            </div>

            <div class="nav-section-title">Painéis Operacionais</div>
            <a class="nav-item active" onclick="switchView('overview')">
                <span class="icon">📊</span> Cockpit Geral
            </a>
            <a class="nav-item" onclick="switchView('wan')">
                <span class="icon">🌐</span> Internet & Multi-WAN
            </a>
            <a class="nav-item" onclick="switchView('wifi')">
                <span class="icon">📶</span> Wi-Fi 6E & Wi-Fi 7
            </a>
            <a class="nav-item" onclick="switchView('devices')">
                <span class="icon">📱</span> Dispositivos (<span id="side_dev_count">34</span>)
            </a>

            <div class="nav-section-title">Engenharia & Otimização</div>
            <a class="nav-item" onclick="switchView('optimization')">
                <span class="icon">⚡</span> SQM CAKE & Speedtest
            </a>
            <a class="nav-item" onclick="switchView('security')">
                <span class="icon">🔒</span> Segurança & VPN
            </a>
            <a class="nav-item" onclick="switchView('doctor')">
                <span class="icon">🩺</span> Ark Doctor & Starlink
            </a>
            <a class="nav-item" onclick="switchView('system')">
                <span class="icon">💡</span> Hardware & Sistema
            </a>
            <a class="nav-item" onclick="openModal('plugins')">
                <span class="icon">📦</span> Plugins & Módulos (<span style="color:#38bdf8;">12</span>)
            </a>

            <div class="nav-section-title">OpenWrt Nativo</div>
            <a class="nav-item" style="color:#38bdf8;" onclick="toggleLuciDrawer()">
                <span class="icon">🧭</span> Menus LuCI UCI <span style="font-size:0.75rem; margin-left:auto; opacity:0.8;">☰</span>
            </a>
            <a class="nav-item" style="color:#c084fc;" href="/cgi-bin/luci/admin/status/overview" onclick="openClassicLuci(event)">
                <span class="icon">💻</span> Ver Interface Clássica <span style="font-size:0.75rem; margin-left:auto; opacity:0.7;">↗</span>
            </a>

            <div class="sidebar-footer">
                <button class="ark-btn ark-btn-secondary" style="width:100%;" onclick="openModal('reboot')">
                    🔄 Reiniciar Roteador
                </button>
            </div>
        </aside>

        <!-- Main Wrapper -->
        <div style="flex-grow:1; display:flex; flex-direction:column; min-width:0;">

            <!-- Top Header -->
            <header class="top-header">
                <div class="header-left">
                    <button class="btn-hamburger" onclick="toggleSidebar()">☰</button>
                    <span style="font-size:0.92rem; font-weight:700; color:#fff;" id="top_host_label">
                        🏠 Acer Predator W6x <span style="color:#64748b;">(192.168.73.1)</span>
                    </span>
                </div>
                <div class="header-right">
                    <a class="btn-hero-action" href="/cgi-bin/luci/admin/status/overview" onclick="openClassicLuci(event)" style="background:rgba(192,132,252,0.15); border-color:rgba(192,132,252,0.4); color:#c084fc; text-decoration:none; font-weight:700;" title="Acessar Interface Clássica Original do LuCI">
                        💻 Ver Interface Clássica <span style="font-size:0.75rem; opacity:0.8;">↗</span>
                    </a>
                    <button class="btn-hero-action" onclick="openModal('plugins')">
                        📦 Plugins (12)
                    </button>
                    <button class="btn-hero-action" onclick="openModal('setup')">
                        ⚡ Setup Rápido
                    </button>
                    <button class="btn-hero-action" onclick="openModal('theme_picker')">
                        🎨 Tema
                    </button>
                </div>
            </header>

            <!-- Main Content Area with SPA Panels -->
            <main class="content-area">

                <!-- ========================================================= -->
                <!-- PAINEL 1: COCKPIT GERAL / VISÃO PANORÂMICA (ZERO SCROLL) -->
                <!-- ========================================================= -->
                <section class="view-panel active" id="view_overview">
                    
                    <!-- Hero Banner -->
                    <div class="ex-hero">
                        <div class="ex-hero-info">
                            <span class="ex-hero-eyebrow">COCKPIT NOC • ACER PREDATOR W6X (WI-FI 6E)</span>
                            <h2 class="ex-hero-title">
                                ARK Router <span class="pill-badge pill-online">ATIVO</span>
                            </h2>
                            <p class="ex-hero-desc">
                                <span>OpenWrt 24.10.0</span> • 
                                <span>Kernel 6.6.54</span> • 
                                <span>Filogic 830 (MT7986A 4x 2.0GHz)</span> • 
                                <strong style="color:#38bdf8;">ARK OS v1.5.17</strong>
                            </p>
                            <div class="ex-hero-actions">
                                <button class="btn-hero-action btn-hero-primary" onclick="openModal('setup')">⚡ Setup Rápido</button>
                                <button class="btn-hero-action" onclick="openModal('gamer_mode')" id="btn_hero_gamer">🎮 Gamer Ultra</button>
                                <button class="btn-hero-action" onclick="openModal('sqm')" title="Calibrar banda e bufferbloat">⚡ Calibrar SQM</button>
                                <button class="btn-hero-action" onclick="switchView('doctor')" title="Diagnóstico e auto-cura">🩺 Ark Doctor</button>
                                <button class="btn-hero-action" onclick="openModal('wifi_qr')" title="Compartilhar Wi-Fi via QR Code">📲 Wi-Fi QR</button>
                                <a class="btn-hero-action" href="/cgi-bin/luci/admin/status/overview" onclick="openClassicLuci(event)" style="text-decoration:none; color:#cbd5e1;">💻 LuCI Clássico ↗</a>
                            </div>
                        </div>
                        <div class="ex-hero-right">
                            <div class="ex-hero-status-row">
                                <span class="pill-badge pill-online" style="padding:6px 12px; font-size:0.8rem;">● TUDO OPERACIONAL</span>
                                <div class="ex-clock-box" onclick="openModal('clock')" title="Ajustar relógio e servidor NTP">
                                    <span class="ex-date-val" id="live_date">14/10/2026</span>
                                    <span class="ex-time-val" id="live_clock">03:35:00</span>
                                </div>
                            </div>
                            <span style="font-size:0.75rem; color:#64748b;">sessão segura de 12 horas • atualização contínua a cada 3s</span>
                        </div>
                    </div>

                    <!-- Health Strip -->
                    <div class="health-strip">
                        <div class="health-card" onclick="openHardwareModal('cpu')">
                            <div class="health-icon-box" style="background:rgba(16,185,129,0.15); color:#10b981;">⚡</div>
                            <div class="health-info">
                                <span class="health-label">Processador</span>
                                <span class="health-val" id="health_cpu">12%</span>
                                <div class="health-bar-bg"><div class="health-bar-fill" id="bar_cpu" style="width:12%; background:#10b981;"></div></div>
                            </div>
                        </div>
                        <div class="health-card" onclick="openHardwareModal('temp')">
                            <div class="health-icon-box" style="background:rgba(245,158,11,0.15); color:#f59e0b;">℃</div>
                            <div class="health-info">
                                <span class="health-label">Temperatura</span>
                                <span class="health-val" id="health_temp">46°C</span>
                                <div class="health-bar-bg"><div class="health-bar-fill" style="width:46%; background:#f59e0b;"></div></div>
                            </div>
                        </div>
                        <div class="health-card" onclick="openHardwareModal('ram')">
                            <div class="health-icon-box" style="background:rgba(59,130,246,0.15); color:#3b82f6;">▦</div>
                            <div class="health-info">
                                <span class="health-label">Memória RAM</span>
                                <span class="health-val" id="health_ram">188 / 512 MB</span>
                                <div class="health-bar-bg"><div class="health-bar-fill" id="bar_ram" style="width:36%; background:#3b82f6;"></div></div>
                            </div>
                        </div>
                        <div class="health-card" onclick="openHardwareModal('flash')">
                            <div class="health-icon-box" style="background:rgba(139,92,246,0.15); color:#8b5cf6;">▣</div>
                            <div class="health-info">
                                <span class="health-label">Armazenamento</span>
                                <span class="health-val">18 / 128 MB</span>
                                <div class="health-bar-bg"><div class="health-bar-fill" style="width:14%; background:#8b5cf6;"></div></div>
                            </div>
                        </div>
                        <div class="health-card">
                            <div class="health-icon-box" style="background:rgba(6,182,212,0.15); color:#06b6d4;">⌁</div>
                            <div class="health-info">
                                <span class="health-label">Carga do Sistema</span>
                                <span class="health-val" style="font-size:0.98rem;">0.15, 0.12, 0.08</span>
                                <span style="font-size:0.7rem; color:#64748b;">4 núcleos ativos</span>
                            </div>
                        </div>
                    </div>

                    <!-- Ark Doctor Vital Subsystem Banner -->
                    <div style="background:linear-gradient(90deg, rgba(16,185,129,0.12), rgba(56,189,248,0.08)); border:1px solid rgba(16,185,129,0.28); border-radius:10px; padding:10px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:1.3rem;">🩺</span>
                            <div>
                                <strong style="color:#fff; font-size:0.9rem;">Ark Doctor: 12/12 Subsistemas Saudáveis</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Kernel 6.6 • PPE Offload • BBR v2 • SQM CAKE • Roaming 802.11k/v • ZRAM LZ4 100% Blindados</div>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 10px;" onclick="runDoctorCheck()">🔄 Diagnosticar</button>
                            <button class="ark-btn ark-btn-primary" style="font-size:0.75rem; padding:4px 12px;" onclick="switchView('doctor')">Ver Painel Ark Doctor ↗</button>
                        </div>
                    </div>

                    <!-- Live Real-Time Traffic Canvas (NOC High-Fidelity Engine) -->
                    <div class="traffic-grid">
                        <div class="traffic-canvas-card">
                            <div class="traffic-canvas-header">
                                <div>
                                    <h3 style="font-size:0.95rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px;">
                                        <span>📊 Vazão & Telemetria em Tempo Real</span>
                                        <span class="stat-badge" style="color:#10b981; border-color:rgba(16,185,129,0.3); background:rgba(16,185,129,0.1);">60 FPS LIVE</span>
                                    </h3>
                                    <span style="font-size:0.75rem; color:#94a3b8;">Amostragem contínua via /proc/net/dev & nftables counters</span>
                                </div>
                                <div class="traffic-interface-pills">
                                    <button class="traffic-pill-btn active" onclick="setTrafficInterface('br-lan', this)">🌐 Geral (br-lan)</button>
                                    <button class="traffic-pill-btn" onclick="setTrafficInterface('wan1', this)">⚡ WAN 1 (Fibra 2.5G)</button>
                                    <button class="traffic-pill-btn" onclick="setTrafficInterface('wan2', this)">🛰️ WAN 2 (Starlink)</button>
                                    <button class="traffic-pill-btn" onclick="setTrafficInterface('wifi7', this)">📶 Wi-Fi 7 (6 GHz)</button>
                                </div>
                            </div>
                            <div style="position:relative; width:100%;">
                                <canvas id="live_traffic_canvas" width="700" height="150" style="width:100%; height:150px; display:block;"></canvas>
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; font-size:0.72rem; color:#64748b; flex-wrap:wrap; gap:6px;">
                                    <span id="traffic_scale_label">Escala Dinâmica: 0 — 500 Mbps</span>
                                    <div style="display:flex; gap:12px;">
                                        <span style="color:#38bdf8; font-weight:700;">● Download (RX)</span>
                                        <span style="color:#a855f7; font-weight:700;">● Upload (TX)</span>
                                    </div>
                                    <span>Janela: 60s históricos</span>
                                </div>
                            </div>
                        </div>

                        <div class="traffic-stats-column">
                            <div class="traffic-stat-card">
                                <div style="width:100%;">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <span style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#94a3b8;">↓ Download Agora</span>
                                        <span class="stat-badge" id="stat_down_pps" style="color:#38bdf8;">28.420 pps</span>
                                    </div>
                                    <div class="stat-rate down" id="stat_down">248.6 <span style="font-size:1rem;">Mbps</span></div>
                                    <div class="stat-meta-row">
                                        <span id="stat_down_peak">Pico hoje: 942.1 Mbps</span>
                                        <span>•</span>
                                        <span id="stat_down_bytes" style="color:#38bdf8; font-weight:700;">1.48 TB transferidos</span>
                                    </div>
                                </div>
                                <span style="font-size:2rem; color:#38bdf8; opacity:0.35;">↓</span>
                            </div>

                            <div class="traffic-stat-card">
                                <div style="width:100%;">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <span style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#94a3b8;">↑ Upload Agora</span>
                                        <span class="stat-badge" id="stat_up_pps" style="color:#a855f7;">7.140 pps</span>
                                    </div>
                                    <div class="stat-rate up" id="stat_up">58.4 <span style="font-size:1rem;">Mbps</span></div>
                                    <div class="stat-meta-row">
                                        <span id="stat_up_peak">Pico hoje: 486.2 Mbps</span>
                                        <span>•</span>
                                        <span id="stat_up_bytes" style="color:#a855f7; font-weight:700;">342.6 GB transferidos</span>
                                    </div>
                                </div>
                                <span style="font-size:2rem; color:#a855f7; opacity:0.35;">↑</span>
                            </div>

                            <!-- Live Latency & Bufferbloat Gauge -->
                            <div class="traffic-stat-card" style="padding:10px 14px;">
                                <div style="width:100%;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#94a3b8;">
                                        <span>⚡ Latência Sob Carga: <strong style="color:#10b981;" id="live_ping">2.8 ms</strong> (Jitter: <strong style="color:#38bdf8;" id="live_jitter">0.2 ms</strong>)</span>
                                        <span class="stat-badge" style="color:#10b981;">0.00% Perda</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; color:#64748b; margin-top:4px;">
                                        <span>Conntrack: <strong style="color:#cbd5e1;" id="live_conntrack">1.842 / 65.536</strong></span>
                                        <span>CAKE qdisc: <strong style="color:#10b981;">0 drops</strong></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Vital Indicators Strip (1-Click Access) -->
                    <div class="cockpit-pills-bar">
                        <div class="cockpit-pill-item" onclick="switchView('security')">
                            <span>🛡️</span> <strong>AdBlock:</strong> 148k Bloqueados (34.2%)
                        </div>
                        <div class="cockpit-pill-item" onclick="switchView('doctor')">
                            <span>🛰️</span> <strong>Starlink LEO:</strong> ONLINE (28ms • 0% Obstrução)
                        </div>
                        <div class="cockpit-pill-item" onclick="switchView('security')">
                            <span>🔒</span> <strong>WireGuard:</strong> wg0 Ativo (SP 4ms)
                        </div>
                        <div class="cockpit-pill-item" onclick="switchView('optimization')">
                            <span>⚡</span> <strong>CAKE SQM:</strong> Nota A+ (0.4ms Jitter)
                        </div>
                        <div class="cockpit-pill-item" onclick="switchView('devices')">
                            <span>🧠</span> <strong>Cache DNS:</strong> RAM 0.0ms (99.4% Hit)
                        </div>
                        <div class="cockpit-pill-item" onclick="switchView('optimization')">
                            <span>🚀</span> <strong>Aceleração PPE:</strong> Flow Offload Ativo
                        </div>
                    </div>

                    <!-- Status das Portas Físicas de Switch Ethernet (T-036 / ARK-LAN-002) -->
                    <div class="switch-ports-panel">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                            <div>
                                <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0;">🔌 Portas Físicas de Switch Ethernet & Conexões de Rede</h3>
                                <span style="font-size:0.75rem; color:#94a3b8;">Status de enlace físico, duplex e velocidade negociada em hardware</span>
                            </div>
                            <span class="pill-badge pill-online">4 / 6 PORTAS ATIVAS</span>
                        </div>

                        <div class="switch-ports-grid">
                            <!-- WAN 1: 2.5 Gbps -->
                            <div class="switch-port-box port-up" title="Porta WAN 1 (2.5 Gbps / Full-Duplex) - Uplink Vivo Fibra GPON">
                                <span class="switch-port-name" style="color:#38bdf8;">WAN 1 (2.5G)</span>
                                <div class="switch-port-icon">
                                    <div class="switch-port-leds">
                                        <div class="switch-led led-green" title="Link UP 2.5G"></div>
                                        <div class="switch-led led-green" title="Atividade RX/TX"></div>
                                    </div>
                                    <div class="switch-port-jack"></div>
                                </div>
                                <span class="switch-port-speed" style="color:#10b981;">2.5 Gbps</span>
                                <span class="switch-port-target">Vivo Fibra GPON</span>
                            </div>

                            <!-- WAN 2: 1.0 Gbps -->
                            <div class="switch-port-box port-up" title="Porta WAN 2 (1.0 Gbps / Full-Duplex) - Uplink Claro Fibra / Cabo">
                                <span class="switch-port-name" style="color:#06b6d4;">WAN 2 (1.0G)</span>
                                <div class="switch-port-icon">
                                    <div class="switch-port-leds">
                                        <div class="switch-led led-green" title="Link UP 1.0G"></div>
                                        <div class="switch-led led-green" title="Atividade RX/TX"></div>
                                    </div>
                                    <div class="switch-port-jack"></div>
                                </div>
                                <span class="switch-port-speed" style="color:#10b981;">1.0 Gbps</span>
                                <span class="switch-port-target">Claro Fibra / Cabo</span>
                            </div>

                            <!-- LAN 1: 1.0 Gbps -->
                            <div class="switch-port-box port-up" title="Porta LAN 1 (1.0 Gbps / Full-Duplex) - PC Gamer Desktop">
                                <span class="switch-port-name">LAN 1</span>
                                <div class="switch-port-icon">
                                    <div class="switch-port-leds">
                                        <div class="switch-led led-green" title="Link UP 1.0G"></div>
                                        <div class="switch-led led-green" title="Atividade RX/TX"></div>
                                    </div>
                                    <div class="switch-port-jack"></div>
                                </div>
                                <span class="switch-port-speed" style="color:#10b981;">1.0 Gbps</span>
                                <span class="switch-port-target">PC-Gamer-Desktop</span>
                            </div>

                            <!-- LAN 2: Down -->
                            <div class="switch-port-box port-down" title="Porta LAN 2 (Desconectada / Cabo Livre)">
                                <span class="switch-port-name" style="color:#94a3b8;">LAN 2</span>
                                <div class="switch-port-icon">
                                    <div class="switch-port-leds">
                                        <div class="switch-led"></div>
                                        <div class="switch-led"></div>
                                    </div>
                                    <div class="switch-port-jack"></div>
                                </div>
                                <span class="switch-port-speed" style="color:#64748b;">DOWN</span>
                                <span class="switch-port-target">Livre</span>
                            </div>

                            <!-- LAN 3: 1.0 Gbps -->
                            <div class="switch-port-box port-up" title="Porta LAN 3 (1.0 Gbps / Full-Duplex) - Smart TV Sala">
                                <span class="switch-port-name">LAN 3</span>
                                <div class="switch-port-icon">
                                    <div class="switch-port-leds">
                                        <div class="switch-led led-green" title="Link UP 1.0G"></div>
                                        <div class="switch-led led-green" title="Atividade RX/TX"></div>
                                    </div>
                                    <div class="switch-port-jack"></div>
                                </div>
                                <span class="switch-port-speed" style="color:#10b981;">1.0 Gbps</span>
                                <span class="switch-port-target">Smart-TV-4K</span>
                            </div>

                            <!-- LAN 4: Down -->
                            <div class="switch-port-box port-down" title="Porta LAN 4 (Desconectada / Cabo Livre)">
                                <span class="switch-port-name" style="color:#94a3b8;">LAN 4</span>
                                <div class="switch-port-icon">
                                    <div class="switch-port-leds">
                                        <div class="switch-led"></div>
                                        <div class="switch-led"></div>
                                    </div>
                                    <div class="switch-port-jack"></div>
                                </div>
                                <span class="switch-port-speed" style="color:#64748b;">DOWN</span>
                                <span class="switch-port-target">Livre</span>
                            </div>
                        </div>
                    </div>

                    <!-- Cockpit Panoramic Summary Cards (Click to navigate to dedicated views) -->
                    <div class="cockpit-summary-grid">
                        <div class="cockpit-summary-card" onclick="switchView('wan')">
                            <div class="cockpit-card-header">
                                <span class="cockpit-card-title">🌐 Conexões Internet</span>
                                <span class="pill-badge pill-online">2 WANs ONLINE</span>
                            </div>
                            <div class="cockpit-card-val">Vivo GPON + Claro</div>
                            <div class="cockpit-card-desc">Balanceamento de carga ativo (mwan3) • 0% perda de pacotes</div>
                            <button class="ark-btn ark-btn-secondary" style="margin-top:auto;">Gerenciar Multi-WAN ↗</button>
                        </div>

                        <div class="cockpit-summary-card" onclick="switchView('wifi')">
                            <div class="cockpit-card-header">
                                <span class="cockpit-card-title">📶 Wi-Fi Tri-Band</span>
                                <span class="pill-badge pill-purple">MLO 320 MHz</span>
                            </div>
                            <div class="cockpit-card-val">Wi-Fi-H&R</div>
                            <div class="cockpit-card-desc">31 aparelhos conectados • WPA3-SAE • Rádios 2.4, 5 e 6 GHz ativos</div>
                            <button class="ark-btn ark-btn-secondary" style="margin-top:auto;">Configurar Wi-Fi ↗</button>
                        </div>

                        <div class="cockpit-summary-card" onclick="switchView('devices')">
                            <div class="cockpit-card-header">
                                <span class="cockpit-card-title">📱 Dispositivos</span>
                                <span class="pill-badge pill-cyan">34 ONLINE</span>
                            </div>
                            <div class="cockpit-card-val">34 Aparelhos</div>
                            <div class="cockpit-card-desc">4 em 6 GHz • 15 em 5 GHz • 12 em 2.4 GHz • 3 no Cabo LAN</div>
                            <button class="ark-btn ark-btn-secondary" style="margin-top:auto;">Ver Inventário ↗</button>
                        </div>

                        <div class="cockpit-summary-card" onclick="switchView('doctor')">
                            <div class="cockpit-card-header">
                                <span class="cockpit-card-title">🩺 Diagnóstico Vital</span>
                                <span class="pill-badge pill-online">12/12 SAUDÁVEL</span>
                            </div>
                            <div class="cockpit-card-val">Ark Doctor 100%</div>
                            <div class="cockpit-card-desc">CAKE Bufferbloat Nota A+ • Fastpath HW ativo • Fake RTC sincronizado</div>
                            <button class="ark-btn ark-btn-secondary" style="margin-top:auto;">Executar Doctor ↗</button>
                        </div>
                    </div>

                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 2: INTERNET & MULTI-WAN DEDICADO                   -->
                <!-- ========================================================= -->
                <section class="view-panel" id="view_wan">
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>🌐 Gerenciamento de Internet & Multi-WAN (mwan3)</h2>
                                <span class="badge pill-online">2 Conexões Ativas</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <span style="font-size:0.82rem; color:#94a3b8;">Balanceamento de Carga:</span>
                                <label class="ark-switch">
                                    <input type="checkbox" id="mwan_toggle" checked onchange="toggleMwan(this)">
                                    <span class="ark-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div class="wan-grid">
                            <!-- WAN 1 Card -->
                            <div class="wan-card" id="card_wan1">
                                <div class="wan-header">
                                    <span class="wan-title">
                                        <span style="color:#38bdf8;">●</span> WAN 1 — Vivo Fibra (GPON)
                                    </span>
                                    <span class="pill-badge pill-online" id="status_wan1">ONLINE (PRINCIPAL)</span>
                                </div>
                                <div class="wan-info-grid">
                                    <div class="wan-info-item"><span>Endereço IP Público</span><strong id="ip_wan1">187.54.21.90</strong></div>
                                    <div class="wan-info-item"><span>Protocolo</span><strong id="proto_wan1">PPPoE (MTU 1492)</strong></div>
                                    <div class="wan-info-item"><span>Servidores DNS</span><strong id="dns_wan1">1.1.1.1 (Cloudflare)</strong></div>
                                    <div class="wan-info-item"><span>Tempo Online</span><strong id="uptime_wan1">14 dias, 8 horas</strong></div>
                                </div>
                                <div class="wan-actions">
                                    <button class="ark-btn ark-btn-primary" style="flex:1;" onclick="openWanModal('wan1')">⚙️ Editar Internet</button>
                                    <button class="ark-btn ark-btn-secondary" onclick="openModal('pppoe_logs')">📜 Logs PPPoE</button>
                                </div>
                            </div>

                            <!-- WAN 2 Card -->
                            <div class="wan-card" id="card_wan2">
                                <div class="wan-header">
                                    <span class="wan-title">
                                        <span style="color:#06b6d4;">●</span> WAN 2 — Claro Fibra / Cabo
                                    </span>
                                    <span class="pill-badge pill-cyan" id="status_wan2">ONLINE (BACKUP / 50%)</span>
                                </div>
                                <div class="wan-info-grid">
                                    <div class="wan-info-item"><span>Endereço IP Público</span><strong id="ip_wan2">201.86.110.45</strong></div>
                                    <div class="wan-info-item"><span>Protocolo</span><strong id="proto_wan2">DHCP Cliente (MTU 1500)</strong></div>
                                    <div class="wan-info-item"><span>Servidores DNS</span><strong id="dns_wan2">8.8.8.8 (Google)</strong></div>
                                    <div class="wan-info-item"><span>Tempo Online</span><strong id="uptime_wan2">6 dias, 2 horas</strong></div>
                                </div>
                                <div class="wan-actions">
                                    <button class="ark-btn ark-btn-primary" style="flex:1;" onclick="openWanModal('wan2')">⚙️ Editar Internet</button>
                                    <button class="ark-btn ark-btn-secondary" onclick="testWanPing('wan2')">📶 Testar Ping</button>
                                </div>
                            </div>
                        </div>

                        <!-- LuCI Native: Configuração Global IPv6 & NPTv6 RFC 6296 (ARK-IPV6-001/002/003, ARK-WAN-011) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">🌐 Configuração Global IPv6 & NPTv6 (RFC 6296)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Nativo Dual-Stack com Delegação de Prefixo /56 e proteção exclusiva contra vazamentos</span>
                                </div>
                                <button class="ark-btn ark-btn-primary" onclick="saveIpv6Settings()">
                                    💾 Salvar Configurações IPv6
                                </button>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:12px;">
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Modo Operacional IPv6</label>
                                    <select class="form-select" id="m_ipv6_mode">
                                        <option value="dual_stack" selected>Nativo Dual-Stack (DHCPv6-PD /56 com SLAAC)</option>
                                        <option value="nptv6">NPTv6 Inteligente (RFC 6296 com Prefixo ULA Dinâmico)</option>
                                        <option value="relay">Modo Relay / Híbrido (NDP Proxy para ONUs sem PD)</option>
                                        <option value="disabled">Desativado (Modo IPv4 Estrito)</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Endereço IPv6 Global Delegado</label>
                                    <input type="text" class="form-input" id="m_ipv6_delegated" value="2804:3d90:8241:ac00::1/64" readonly style="color:#10b981;">
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Prefixo ULA Local Dinâmico</label>
                                    <input type="text" class="form-input" id="m_ipv6_ula" value="fd42:ark:0:1::/64" readonly style="color:#38bdf8;">
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Servidores DNS IPv6</label>
                                    <select class="form-select" id="m_ipv6_dns">
                                        <option value="cloudflare" selected>2606:4700:4700::1111 (Cloudflare IPv6)</option>
                                        <option value="google">2001:4860:4860::8888 (Google IPv6)</option>
                                        <option value="isp">Automático do Provedor de Internet (ISP)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- LuCI Native: Acesso à Interface Web de ONUs/Modems em Bridge (ARK-WAN-008) & Auto-WAN (ARK-WAN-004) -->
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:16px;" class="traffic-grid">
                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0 0 6px;">🔗 Acesso à Web GUI de ONUs / Modems em Bridge</h3>
                                <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4; margin-bottom:10px;">
                                    Acesse o painel do modem ou ONU de fibra óptica diretamente sem derrubar a conexão PPPoE da WAN.
                                </p>
                                <div class="form-group">
                                    <label class="form-label">IP de Gerenciamento da ONU</label>
                                    <select class="form-select" id="m_onu_ip">
                                        <option value="192.168.1.1" selected>192.168.1.1 (ZTE / FiberHome / Huawei GPON Padrão)</option>
                                        <option value="192.168.18.1">192.168.18.1 (Askey / Mitrastar Vivo Fibra)</option>
                                        <option value="192.168.100.1">192.168.100.1 (Huawei HG8245 / Claro DOCSIS)</option>
                                        <option value="192.168.0.1">192.168.0.1 (D-Link / Cudy / TP-Link)</option>
                                    </select>
                                </div>
                                <button class="ark-btn ark-btn-secondary" style="width:100%;" onclick="openOnuPanel()">
                                    🔗 Abrir Painel da ONU em Bridge ↗
                                </button>
                            </div>

                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0 0 6px;">🔄 Conversão Dinâmica Auto-WAN (Port Mapping)</h3>
                                <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4; margin-bottom:10px;">
                                    Alterne a porta física LAN 1 entre uma segunda interface WAN dedicada ou porta LAN local comum.
                                </p>
                                <div class="form-group">
                                    <label class="form-label">Atribuição da Porta Física LAN 1</label>
                                    <select class="form-select" id="m_autowan_map" onchange="saveAutoWan(this.value)">
                                        <option value="dual_wan" selected>Dual-WAN Ativo (LAN 1 convertida na 2ª Porta WAN Claro)</option>
                                        <option value="single_wan">Single-WAN Puro (LAN 1 liberada para rede local de computadores)</option>
                                    </select>
                                </div>
                                <div style="font-size:0.75rem; color:#10b981;">
                                    ● Política mwan3: Balanceamento ponderado 50% / 50% ativo com failover de sub-segundo.
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 3: WI-FI 6E & WI-FI 7 DEDICADO                     -->
                <!-- ========================================================= -->
                <section class="view-panel" id="view_wifi">
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>📶 Central Wi-Fi 6E & Wi-Fi 7 (Tri-Band BE11000)</h2>
                                <span class="badge pill-purple" id="badge_total_wifi_clients">43 Clientes Sem Fio</span>
                            </div>
                            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                <button class="ark-btn ark-btn-primary" onclick="openModal('add_wifi_network')" title="Criar nova interface sem fio virtual">
                                    ➕ Nova Rede Sem Fio (Novo SSID)
                                </button>
                                <button class="ark-btn ark-btn-secondary" onclick="openModal('wifi_qr')" title="Compartilhar Wi-Fi via QR Code Oficial">
                                    📲 QR Code
                                </button>
                                <button class="ark-btn ark-btn-secondary" onclick="openModal('wps')" title="Pareamento rápido WPS PBC">
                                    🤝 WPS Parear
                                </button>
                                <button class="ark-btn ark-btn-secondary" onclick="openModal('wifi')" title="Configurações globais e Smart Connect">
                                    ⚙️ Opções Globais
                                </button>
                            </div>
                        </div>

                        <!-- SEÇÃO 1: REDES SEM FIO CONFIGURADAS (SSIDs Virtuais / VAPs) -->
                        <div style="margin-bottom:24px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px; margin:0;">
                                        <span>📡</span> Redes Sem Fio Configuradas (Interfaces SSIDs Virtuais)
                                    </h3>
                                    <p style="font-size:0.8rem; color:#94a3b8; margin:3px 0 0 0;">
                                        Interfaces ativas no roteador. Cada rede possui senha, segurança, isolamento e controle de banda independentes.
                                    </p>
                                </div>
                                <span class="pill-badge pill-cyan" id="badge_ssid_count">3 Redes Ativas</span>
                            </div>

                            <!-- Dynamic List of Configured SSIDs -->
                            <div class="wifi-networks-container" id="wifi_networks_list">
                                <!-- Populated dynamically by renderWifiNetworks() -->
                            </div>
                        </div>

                        <!-- SEÇÃO 2: HARDWARE DOS RÁDIOS FÍSICOS (PHYs) -->
                        <div style="margin-bottom:24px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px; margin:0;">
                                        <span>📻</span> Rádios Físicos de RF (Hardware Transceiver / Chips)
                                    </h3>
                                    <p style="font-size:0.8rem; color:#94a3b8; margin:3px 0 0 0;">
                                        Controle de camada física: canais de frequência, potências de transmissão (dBm) e larguras de canal.
                                    </p>
                                </div>
                                <span class="pill-badge pill-purple">Tri-Band Ativo (2.4G + 5G + 6G)</span>
                            </div>

                            <!-- 3 Radios Grid -->
                            <div class="wifi-grid">
                                <div class="wifi-radio-card" id="card_radio_24">
                                    <div class="wifi-radio-header">
                                        <div style="display:flex; align-items:center; gap:8px;">
                                            <span class="wifi-radio-title"><span style="color:#f59e0b;">●</span> Rádio 2.4 GHz (phy0)</span>
                                            <span class="pill-badge pill-amber">12 Aparelhos</span>
                                        </div>
                                        <label class="ark-switch" title="Ligar/Desligar Hardware 2.4 GHz">
                                            <input type="checkbox" id="switch_radio_24" checked onchange="toggleRadioPhy('2.4', this.checked)">
                                            <span class="ark-slider"></span>
                                        </label>
                                    </div>
                                    <div class="wan-info-grid">
                                        <div class="wan-info-item"><span>Canal</span><strong id="ch_radio_24">Canal 6 (2437 MHz)</strong></div>
                                        <div class="wan-info-item"><span>Largura de Banda</span><strong id="width_radio_24">20 MHz</strong></div>
                                        <div class="wan-info-item"><span>Potência TX</span><strong id="tx_radio_24">20 dBm (100 mW)</strong></div>
                                        <div class="wan-info-item"><span>BSS Coloring</span><strong>Ativo (Cor 12)</strong></div>
                                    </div>
                                    <div style="background:rgba(0,0,0,0.25); border-radius:6px; padding:8px 10px; font-size:0.75rem; color:#94a3b8;">
                                        <span style="font-weight:700; color:#cbd5e1; display:block; margin-bottom:4px;">SSIDs transmitidos neste rádio:</span>
                                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                            <span class="pill-badge pill-purple" style="font-size:0.7rem;">Wi-Fi-H&R</span>
                                            <span class="pill-badge pill-cyan" style="font-size:0.7rem;">Wi-Fi-H&R-Visitantes</span>
                                            <span class="pill-badge pill-amber" style="font-size:0.7rem;">Wi-Fi-H&R-IoT</span>
                                        </div>
                                    </div>
                                    <div style="display:flex; gap:8px;">
                                        <button class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openRadioModal('2.4')">⚙️ Editar Rádio</button>
                                        <button class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openModal('add_wifi_network', '2.4')">➕ Adicionar SSID</button>
                                    </div>
                                </div>

                                <div class="wifi-radio-card" id="card_radio_5">
                                    <div class="wifi-radio-header">
                                        <div style="display:flex; align-items:center; gap:8px;">
                                            <span class="wifi-radio-title"><span style="color:#06b6d4;">●</span> Rádio 5 GHz (phy1)</span>
                                            <span class="pill-badge pill-cyan">15 Aparelhos</span>
                                        </div>
                                        <label class="ark-switch" title="Ligar/Desligar Hardware 5 GHz">
                                            <input type="checkbox" id="switch_radio_5" checked onchange="toggleRadioPhy('5', this.checked)">
                                            <span class="ark-slider"></span>
                                        </label>
                                    </div>
                                    <div class="wan-info-grid">
                                        <div class="wan-info-item"><span>Canal</span><strong id="ch_radio_5">Canal 36 (5180 MHz)</strong></div>
                                        <div class="wan-info-item"><span>Largura de Banda</span><strong id="width_radio_5">160 MHz Ultra</strong></div>
                                        <div class="wan-info-item"><span>Potência TX</span><strong id="tx_radio_5">23 dBm (200 mW)</strong></div>
                                        <div class="wan-info-item"><span>Fast Roaming</span><strong>802.11r / 802.11v</strong></div>
                                    </div>
                                    <div style="background:rgba(0,0,0,0.25); border-radius:6px; padding:8px 10px; font-size:0.75rem; color:#94a3b8;">
                                        <span style="font-weight:700; color:#cbd5e1; display:block; margin-bottom:4px;">SSIDs transmitidos neste rádio:</span>
                                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                            <span class="pill-badge pill-purple" style="font-size:0.7rem;">Wi-Fi-H&R</span>
                                            <span class="pill-badge pill-cyan" style="font-size:0.7rem;">Wi-Fi-H&R-Visitantes</span>
                                        </div>
                                    </div>
                                    <div style="display:flex; gap:8px;">
                                        <button class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openRadioModal('5')">⚙️ Editar Rádio</button>
                                        <button class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openModal('add_wifi_network', '5')">➕ Adicionar SSID</button>
                                    </div>
                                </div>

                                <div class="wifi-radio-card" id="card_radio_6">
                                    <div class="wifi-radio-header">
                                        <div style="display:flex; align-items:center; gap:8px;">
                                            <span class="wifi-radio-title"><span style="color:#a855f7;">●</span> Rádio 6 GHz (phy2)</span>
                                            <span class="pill-badge pill-purple">4 Aparelhos</span>
                                        </div>
                                        <label class="ark-switch" title="Ligar/Desligar Hardware 6 GHz">
                                            <input type="checkbox" id="switch_radio_6" checked onchange="toggleRadioPhy('6', this.checked)">
                                            <span class="ark-slider"></span>
                                        </label>
                                    </div>
                                    <div class="wan-info-grid">
                                        <div class="wan-info-item"><span>Canal</span><strong id="ch_radio_6">Canal 37 PSC (6135 MHz)</strong></div>
                                        <div class="wan-info-item"><span>Largura de Banda</span><strong id="width_radio_6">320 MHz (Extremo)</strong></div>
                                        <div class="wan-info-item"><span>Potência TX</span><strong id="tx_radio_6">23 dBm (200 mW)</strong></div>
                                        <div class="wan-info-item"><span>Modo MLO</span><strong>STR Multi-Link Ativo</strong></div>
                                    </div>
                                    <div style="background:rgba(0,0,0,0.25); border-radius:6px; padding:8px 10px; font-size:0.75rem; color:#94a3b8;">
                                        <span style="font-weight:700; color:#cbd5e1; display:block; margin-bottom:4px;">SSIDs transmitidos neste rádio:</span>
                                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                            <span class="pill-badge pill-purple" style="font-size:0.7rem;">Wi-Fi-H&R</span>
                                        </div>
                                    </div>
                                    <div style="display:flex; gap:8px;">
                                        <button class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openRadioModal('6')">⚙️ Editar Rádio</button>
                                        <button class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openModal('add_wifi_network', '6')">➕ Adicionar SSID</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- LuCI Native: Scanner de Redes Vizinhas & Site Survey (status/channel_analysis) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">📡 Scanner de Espectro & Redes Vizinhas (Site Survey)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Detecção de interferência de canais nos rádios 2.4, 5 e 6 GHz em tempo real</span>
                                </div>
                                <button class="ark-btn ark-btn-secondary" onclick="scanNeighborWifi()" id="btn_wifi_scan">
                                    🔍 Escanear Redes Próximas
                                </button>
                            </div>
                            <div class="device-table-container">
                                <table class="device-table" id="wifi_scan_table">
                                    <thead>
                                        <tr>
                                            <th>Nome da Rede (SSID)</th>
                                            <th>BSSID (MAC)</th>
                                            <th>Frequência</th>
                                            <th>Canal & Largura</th>
                                            <th>Sinal (RSSI)</th>
                                            <th>Diagnóstico de Interferência</th>
                                        </tr>
                                    </thead>
                                    <tbody id="wifi_scan_tbody">
                                        <tr>
                                            <td><strong>VIVO-FIBRA-5G-9A</strong></td>
                                            <td><code>94:2a:6f:11:22:33</code></td>
                                            <td><span class="pill-badge pill-cyan">5 GHz</span></td>
                                            <td>Canal 36 (80 MHz)</td>
                                            <td><strong style="color:#f59e0b;">-68 dBm</strong></td>
                                            <td><span style="color:#f59e0b;">⚠️ Canal concorrente com Rádio 5G</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>CLARO_NET_WIFI_2G</strong></td>
                                            <td><code>00:1c:10:aa:bb:cc</code></td>
                                            <td><span class="pill-badge pill-amber">2.4 GHz</span></td>
                                            <td>Canal 1 (20 MHz)</td>
                                            <td><strong style="color:#10b981;">-76 dBm</strong></td>
                                            <td><span style="color:#10b981;">✅ Sem sobreposição (Canal 6 livre)</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Vizinho-Apto-32</strong></td>
                                            <td><code>70:4f:57:44:55:66</code></td>
                                            <td><span class="pill-badge pill-cyan">5 GHz</span></td>
                                            <td>Canal 149 (160 MHz)</td>
                                            <td><strong style="color:#64748b;">-84 dBm</strong></td>
                                            <td><span style="color:#10b981;">✅ Sinal muito fraco, sem impacto</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Rede-Comercial-6G</strong></td>
                                            <td><code>3c:2a:f4:dd:ee:ff</code></td>
                                            <td><span class="pill-badge pill-purple">6 GHz</span></td>
                                            <td>Canal 69 (160 MHz)</td>
                                            <td><strong style="color:#64748b;">-89 dBm</strong></td>
                                            <td><span style="color:#10b981;">✅ Espectro 6 GHz livre (320 MHz MLO limpo)</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- LuCI Native: Rede Wi-Fi de Convidados / Visitantes (Guest Network / ARK-WIFI-001, ARK-QOS-001) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">👥 Rede Wi-Fi de Convidados (Guest Network Isolada)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Rede sem fio segregada com limitação de banda e isolamento de clientes (AP Isolation)</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <label class="ark-switch">
                                        <input type="checkbox" id="guest_wifi_toggle" checked onchange="toggleGuestWifi(this)">
                                        <span class="ark-slider"></span>
                                    </label>
                                    <button class="ark-btn ark-btn-secondary" onclick="openModal('guest_qr')">📲 QR Code Convidados</button>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:12px;">
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Nome da Rede de Convidados (SSID)</label>
                                    <input type="text" class="form-input" id="m_guest_ssid" value="Wi-Fi-H&R-Visitantes">
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Senha de Acesso dos Convidados</label>
                                    <input type="text" class="form-input" id="m_guest_pass" value="Visita2026Segura">
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Isolamento de Clientes (AP Isolation)</label>
                                    <select class="form-select" id="m_guest_isolate">
                                        <option value="1" selected>Ativado (Convidados não acessam PCs da casa)</option>
                                        <option value="0">Desativado</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Limite de Banda por Convidado</label>
                                    <select class="form-select" id="m_guest_rate">
                                        <option value="10" selected>10 Mbps Download / 5 Mbps Upload</option>
                                        <option value="25">25 Mbps Download / 10 Mbps Upload</option>
                                        <option value="50">50 Mbps Download / 25 Mbps Upload</option>
                                        <option value="0">Sem Limite de Banda</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- LuCI Native: Rede Mesh EasyMesh 802.11s & Descoberta de Satélites (ARK-WIFI-007) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">📶 Rede Mesh EasyMesh 802.11s & Topologia de Satélites</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Gerenciamento de nós satélites sem fio e transição rápida 802.11k/v/r</span>
                                </div>
                                <button class="ark-btn ark-btn-secondary" onclick="scanMeshSatellites()">
                                    🔍 Sincronizar Novos Nós Mesh
                                </button>
                            </div>

                            <div class="device-table-container">
                                <table class="device-table">
                                    <thead>
                                        <tr>
                                            <th>Nome do Nó Mesh</th>
                                            <th>Papel na Rede</th>
                                            <th>Canal & Enlace de Backhaul</th>
                                            <th>Sinal dBm</th>
                                            <th>Aparelhos Conectados</th>
                                            <th style="text-align:right;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>Predator-W6x-Master</strong></td>
                                            <td><span class="pill-badge pill-online">Controlador Raiz (Root AP)</span></td>
                                            <td>Ethernet Local (Switch 2.5G)</td>
                                            <td><strong style="color:#10b981;">0 dBm</strong></td>
                                            <td>17 aparelhos</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">ATIVO</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Predator-Node-Sala</strong></td>
                                            <td><span class="pill-badge pill-purple">Satélite Wi-Fi 6E</span></td>
                                            <td>6 GHz PSC 37 (160 MHz Backhaul)</td>
                                            <td><strong style="color:#10b981;">-58 dBm</strong></td>
                                            <td>8 aparelhos</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">SINCRONIZADO</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Predator-Node-Escritório</strong></td>
                                            <td><span class="pill-badge pill-cyan">Satélite Ethernet</span></td>
                                            <td>Cabo LAN Cat6 (1.0 Gbps Backhaul)</td>
                                            <td><strong style="color:#10b981;">0 dBm</strong></td>
                                            <td>6 aparelhos</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">SINCRONIZADO</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Wi-Fi Enhancer Section inside Wi-Fi Panel -->
                        <div style="margin-top:20px; background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:20px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="color:#fff; font-size:1.05rem; font-weight:800;">🚀 Smart Wi-Fi Package Enhancer</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Migração atômica de wpad-basic para wpad-mbedtls com WPA3-SAE e 802.11v/k</span>
                                </div>
                                <button class="ark-btn ark-btn-primary" id="btn_run_enhancer" onclick="startEnhancerProcess()">⚡ Iniciar Otimização Wi-Fi</button>
                            </div>
                            <div class="health-bar-bg" style="height:8px; margin-bottom:14px;">
                                <div class="health-bar-fill" id="enhancer_progress_bar" style="width:0%; background:linear-gradient(90deg, #0284c7, #10b981);"></div>
                            </div>
                            <div id="enhancer_log_box" style="background:#090e1a; border:1px solid var(--ark-border); border-radius:8px; padding:12px; font-family:monospace; font-size:0.78rem; color:#94a3b8; max-height:100px; overflow-y:auto;">
                                [SISTEMA] Pronto para checar pacotes de rádio...
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 4: DISPOSITIVOS (34 CLIENTES)                      -->
                <!-- ========================================================= -->
                <section class="view-panel" id="view_devices">
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>📱 Inventário de Dispositivos Conectados</h2>
                                <span class="badge pill-online" id="main_dev_badge">34 Aparelhos Online</span>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button class="ark-btn ark-btn-secondary" onclick="flushStaleLeases()">🧹 Limpar Leases Inativos</button>
                                <button class="ark-btn ark-btn-primary" onclick="openModal('add_device')">➕ Adicionar Reserva IP Fixo</button>
                            </div>
                        </div>

                        <div class="device-filters">
                            <div class="device-tabs">
                                <button class="device-tab active" onclick="filterDevices('all', this)">Todos (34)</button>
                                <button class="device-tab" onclick="filterDevices('2.4', this)">2.4 GHz (12)</button>
                                <button class="device-tab" onclick="filterDevices('5', this)">5 GHz (15)</button>
                                <button class="device-tab" onclick="filterDevices('6', this)">6 GHz (4)</button>
                                <button class="device-tab" onclick="filterDevices('eth', this)">Cabo LAN (3)</button>
                            </div>
                            <div class="device-search-box">
                                <input type="text" class="device-search-input" id="dev_search_input" placeholder="🔍 Buscar por nome, IP ou MAC..." oninput="searchDevices(this.value)">
                                <select class="form-select" style="width:auto; padding:6px 10px; font-size:0.8rem;" onchange="sortDevices(this.value)">
                                    <option value="traffic">Maior Consumo Total</option>
                                    <option value="speed">Velocidade Agora</option>
                                    <option value="name">Nome (A → Z)</option>
                                </select>
                            </div>
                        </div>

                        <div class="ark-table-swipe-hint" style="display:none; align-items:center; gap:6px; font-size:0.75rem; color:#38bdf8; margin-bottom:8px;">
                            <span>↔ Deslize a tabela para os lados para visualizar todas as colunas</span>
                        </div>

                        <div class="device-table-container">
                            <table class="device-table">
                                <thead>
                                    <tr>
                                        <th>Dispositivo</th>
                                        <th>Endereço IP</th>
                                        <th>Endereço MAC</th>
                                        <th>Banda / Enlace</th>
                                        <th>Sinal dBm</th>
                                        <th>Velocidade Agora</th>
                                        <th>Total Consumido</th>
                                        <th style="text-align:right;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="device_table_body">
                                    <!-- Populated dynamically -->
                                </tbody>
                            </table>
                        </div>

                        <!-- LuCI Native: Servidor DHCP & Domínio Local (network/dhcp) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">📦 Servidor DHCP & Domínio Local (dnsmasq)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Gerenciamento de faixa de concessão IP, tempo de lease e resolução local</span>
                                </div>
                                <button class="ark-btn ark-btn-primary" onclick="saveDhcpSettings()">
                                    💾 Salvar Parâmetros DHCP
                                </button>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:14px;">
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Faixa Inicial de IPs</label>
                                    <select class="form-select" id="dhcp_start_sel">
                                        <option value="100" selected>192.168.1.100 (Padrão Recomendado)</option>
                                        <option value="50">192.168.1.50 (Redes Maiores)</option>
                                        <option value="10">192.168.1.10 (Faixa Ampla)</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Limite de Clientes Simultâneos</label>
                                    <select class="form-select" id="dhcp_limit_sel">
                                        <option value="150" selected>150 Endereços (até .250)</option>
                                        <option value="100">100 Endereços (até .200)</option>
                                        <option value="200">200 Endereços (até .254)</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Tempo de Concessão (Lease Time)</label>
                                    <select class="form-select" id="dhcp_time_sel">
                                        <option value="12h" selected>12 Horas (Residencial Dinâmico)</option>
                                        <option value="24h">24 Horas (Misto)</option>
                                        <option value="7d">7 Dias (Dispositivos Fixos)</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Cache DNS em RAM (0.0ms Latência)</label>
                                    <select class="form-select" id="dhcp_dns_cache_sel">
                                        <option value="150000" selected>🧠 150.000 entradas em RAM (Modo Ultra 0ms)</option>
                                        <option value="50000">⚡ 50.000 entradas em RAM (Modo Equilibrado)</option>
                                        <option value="10000">🍃 10.000 entradas (Modo Econômico)</option>
                                        <option value="150">⚙️ Padrão OpenWrt (150 entradas)</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Sufixo de Domínio Local</label>
                                    <select class="form-select" id="dhcp_domain_sel">
                                        <option value="lan" selected>.lan (Padrão OpenWrt)</option>
                                        <option value="home.arpa">.home.arpa (RFC 8375)</option>
                                        <option value="ark.local">.ark.local</option>
                                    </select>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;" class="traffic-grid">
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
                                    <div>
                                        <strong style="font-size:0.88rem; color:#fff;">DHCP Autoritativo</strong>
                                        <div style="font-size:0.75rem; color:#94a3b8;">Responde de imediato com NAK para clientes com IP inválido</div>
                                    </div>
                                    <label class="ark-switch">
                                        <input type="checkbox" checked>
                                        <span class="ark-slider"></span>
                                    </label>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
                                    <div>
                                        <strong style="font-size:0.88rem; color:#fff;">Blindagem DNS Rebind</strong>
                                        <div style="font-size:0.75rem; color:#94a3b8;">Bloqueia respostas upstream que apontam para IPs privados (RFC 1918)</div>
                                    </div>
                                    <label class="ark-switch">
                                        <input type="checkbox" checked>
                                        <span class="ark-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 5: ENGENHARIA & OTIMIZAÇÃO (SQM + SPEEDTEST)       -->
                <!-- ========================================================= -->
                <section class="view-panel" id="view_optimization">
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>⚡ SQM CAKE — Mitigação de Bufferbloat (Nota A+)</h2>
                                <span class="badge pill-online">Escalonador CAKE Ativo</span>
                            </div>
                            <button class="ark-btn ark-btn-primary" onclick="openModal('sqm')">⚙️ Calibrar Banda & Framing</button>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;" class="traffic-grid">
                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <span style="font-size:0.75rem; text-transform:uppercase; color:#94a3b8; font-weight:700;">Conformidade Bufferbloat</span>
                                <div style="font-size:2rem; font-weight:900; color:#10b981; margin:4px 0;">NOTA A+ (0.4 ms)</div>
                                <p style="font-size:0.82rem; color:#cbd5e1; line-height:1.4;">
                                    O escalonador CAKE fragmenta fluxos pesados de download em microslots contínuos, garantindo 0 ms de fila sob saturação máxima.
                                </p>
                            </div>
                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <span style="font-size:0.75rem; text-transform:uppercase; color:#94a3b8; font-weight:700;">Parâmetros em Execução</span>
                                <div style="margin-top:6px; font-size:0.86rem; color:#fff; display:flex; flex-direction:column; gap:4px;">
                                    <div>• Limite de Download: <strong id="sqm_label_down">850 Mbps</strong></div>
                                    <div>• Limite de Upload: <strong id="sqm_label_up">450 Mbps</strong></div>
                                    <div>• Perfil de Overhead: <strong>Fibra Óptica GPON (44 bytes)</strong></div>
                                    <div>• Isolamento por Host: <strong>Ativo (Dual-ISOLATE)</strong></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- LuCI Native: Aceleração de Hardware & Otimizações do Kernel (ARK-HW-001, ARK-WAN-009, ARK-HW-004) -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>🚀 Aceleração de Hardware & Otimizações do Kernel</h2>
                                <span class="badge pill-online">Packet Processing Engine Ativo</span>
                            </div>
                            <button class="ark-btn ark-btn-primary" onclick="saveKernelOptimization()">💾 Salvar Parâmetros de Kernel</button>
                        </div>

                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; margin-bottom:14px;">
                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <strong style="font-size:0.9rem; color:#fff;">Hardware Flow Offloading</strong>
                                    <label class="ark-switch"><input type="checkbox" id="hw_offload_toggle" checked><span class="ark-slider"></span></label>
                                </div>
                                <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4;">
                                    Aceleração MediaTek PPE / Qualcomm NSS em silício. Encaminhamento NAT de 2.5 Gbps sem consumir CPU.
                                </p>
                            </div>

                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <strong style="font-size:0.9rem; color:#fff;">Software Flow Offloading</strong>
                                    <label class="ark-switch"><input type="checkbox" id="sw_offload_toggle" checked><span class="ark-slider"></span></label>
                                </div>
                                <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4;">
                                    Tabela de fluxo rápido no kernel (fastpath) para pacotes roteados e conexões TCP/UDP de alta taxa.
                                </p>
                            </div>

                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <strong style="font-size:0.9rem; color:#fff; display:block; margin-bottom:6px;">TCP Turbo (Congestão)</strong>
                                <select class="form-select" id="tcp_congestion_sel">
                                    <option value="bbr" selected>BBR v2 (Google Acelerado - Baixa Latência)</option>
                                    <option value="cubic">Cubic (Padrão Linux)</option>
                                    <option value="bbr1">BBR v1</option>
                                </select>
                                <p style="font-size:0.75rem; color:#94a3b8; margin-top:6px; line-height:1.3;">
                                    Acelera downloads de alta latência e streaming 4K.
                                </p>
                            </div>

                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <strong style="font-size:0.9rem; color:#fff; display:block; margin-bottom:6px;">Compactação ZRAM Swap</strong>
                                <select class="form-select" id="zram_size_sel">
                                    <option value="512" selected>512 MB Compactado LZ4 (Recomendado)</option>
                                    <option value="256">256 MB Compactado</option>
                                    <option value="1024">1024 MB (Alta Densidade de Tarefas)</option>
                                    <option value="0">Desativado (Apenas RAM física)</option>
                                </select>
                                <p style="font-size:0.75rem; color:#94a3b8; margin-top:6px; line-height:1.3;">
                                    Multiplica a capacidade de memória RAM em 2.5x com compressão LZ4 ultra-rápida.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Speedtest Multi-WAN -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>🚀 Teste de Velocidade Multi-WAN em Tempo Real</h2>
                                <span class="badge pill-online">Motor OOKLA Integrado</span>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;" class="traffic-grid">
                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:20px; text-align:center;">
                                <span style="font-size:0.8rem; text-transform:uppercase; color:#94a3b8; font-weight:700;">Selecione a Interface para Teste</span>
                                <div style="display:flex; justify-content:center; gap:10px; margin:14px 0;">
                                    <select class="form-select" id="speedtest_iface_select" style="max-width:260px;">
                                        <option value="wan1" selected>WAN 1 — Vivo Fibra (1 Gbps)</option>
                                        <option value="wan2">WAN 2 — Claro Fibra (500 Mbps)</option>
                                        <option value="all">Balanceamento Combinado (mwan3)</option>
                                    </select>
                                </div>
                                <button class="ark-btn ark-btn-primary" style="padding:10px 24px; font-size:0.92rem;" id="btn_run_speedtest" onclick="runSpeedtestProcess()">
                                    🚀 Iniciar Teste de Velocidade
                                </button>
                            </div>

                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:20px; display:flex; justify-content:space-around; align-items:center;">
                                <div>
                                    <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">Download</span>
                                    <div style="font-size:1.8rem; font-weight:900; color:#38bdf8;" id="sp_down_val">842.5 <span style="font-size:0.9rem;">Mbps</span></div>
                                </div>
                                <div>
                                    <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">Upload</span>
                                    <div style="font-size:1.8rem; font-weight:900; color:#a855f7;" id="sp_up_val">421.8 <span style="font-size:0.9rem;">Mbps</span></div>
                                </div>
                                <div>
                                    <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">Ping / Jitter</span>
                                    <div style="font-size:1.8rem; font-weight:900; color:#10b981;" id="sp_ping_val">3.2 <span style="font-size:0.9rem;">ms</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 6: SEGURANÇA & VPN (WIREGUARD & PBR)               -->
                <!-- ========================================================= -->
                <section class="view-panel" id="view_security">
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>🔒 VPN WireGuard & Roteamento por Políticas (PBR)</h2>
                                <span class="badge pill-purple">1 Túnel Ativo</span>
                            </div>
                            <button class="ark-btn ark-btn-purple" onclick="openModal('add_vpn')">➕ Adicionar Túnel</button>
                        </div>

                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <div style="font-size:1.05rem; font-weight:800; color:#fff;">Túnel wg0 — Servidor São Paulo (WireGuard)</div>
                                <div style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">Endpoint: 198.51.100.22:51820 • IP: 10.14.0.2/24 • Handshake: há 14s</div>
                            </div>
                            <span class="pill-badge pill-online">CONECTADO</span>
                        </div>

                        <div class="device-table-container">
                            <table class="device-table">
                                <thead>
                                    <tr>
                                        <th>Regra de Política</th>
                                        <th>Dispositivo Alvo</th>
                                        <th>Destino / Porta</th>
                                        <th>Interface de Saída</th>
                                        <th style="text-align:right;">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>TV Streaming Brasil</strong></td>
                                        <td>TV-Samsung-OLED (192.168.1.110)</td>
                                        <td>Qualquer Tráfego</td>
                                        <td><span class="pill-badge pill-cyan">WAN 1 (Vivo)</span></td>
                                        <td style="text-align:right;"><span class="pill-badge pill-online">Ativo</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Túnel Seguro Trabalho</strong></td>
                                        <td>MacBook-Pro-M3 (192.168.1.142)</td>
                                        <td>Rede Corporativa / SSH</td>
                                        <td><span class="pill-badge pill-purple">WireGuard wg0</span></td>
                                        <td style="text-align:right;"><span class="pill-badge pill-online">Ativo</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- LuCI Native: AdBlock & Privacidade DNS (ARK-BLOCK-001, ARK-BLOCK-002) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-bottom:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">🛡️ AdBlock Integrado & Filtro de Rastreamento DNS</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Bloqueio em nível de rede para smart TVs, celulares e computadores</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <label class="ark-switch">
                                        <input type="checkbox" id="adblock_toggle" checked onchange="toggleAdblock(this)">
                                        <span class="ark-slider"></span>
                                    </label>
                                    <button class="ark-btn ark-btn-secondary" onclick="updateAdblockList()">🔄 Atualizar Listas</button>
                                    <button class="ark-btn ark-btn-primary" onclick="openModal('adblock_lists')">📋 Whitelist & Blacklist</button>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
                                <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                    <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase;">Regras Carregadas</span>
                                    <div style="font-size:1.4rem; font-weight:800; color:#10b981; margin:2px 0;">148.291 domínios</div>
                                    <span style="font-size:0.72rem; color:#10b981;">● Listas StevenBlack + OISD</span>
                                </div>
                                <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                    <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase;">Taxa de Bloqueio Hoje</span>
                                    <div style="font-size:1.4rem; font-weight:800; color:#38bdf8; margin:2px 0;">34.2% filtrado</div>
                                    <span style="font-size:0.72rem; color:#38bdf8;">● 14.280 requisições barradas</span>
                                </div>
                                <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                    <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase;">Memória Alocada</span>
                                    <div style="font-size:1.4rem; font-weight:800; color:#a855f7; margin:2px 0;">4.8 MB RAM</div>
                                    <span style="font-size:0.72rem; color:#a855f7;">● Zero impacto no processamento</span>
                                </div>
                            </div>
                        </div>

                        <!-- LuCI Native: Mapeamento Dinâmico de Portas UPnP / NAT-PMP IGD (ARK-FW-005) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-bottom:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">🎮 Redirecionamentos Automáticos UPnP / NAT-PMP IGD</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Portas abertas dinamicamente por consoles de videogame, jogos multiplayer e torrents</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <label class="ark-switch">
                                        <input type="checkbox" id="upnp_toggle" checked onchange="toggleUpnp(this)">
                                        <span class="ark-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div class="device-table-container">
                                <table class="device-table">
                                    <thead>
                                        <tr>
                                            <th>Dispositivo / Cliente</th>
                                            <th>Protocolo</th>
                                            <th>Porta WAN Externa</th>
                                            <th>Porta Interna LAN</th>
                                            <th>Descrição da Aplicação</th>
                                            <th style="text-align:right;">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody id="upnp_tbody">
                                        <tr>
                                            <td><strong>PlayStation-5-Pro (192.168.1.189)</strong></td>
                                            <td><span class="pill-badge pill-purple">UDP</span></td>
                                            <td><code>3074</code></td>
                                            <td><code>3074</code></td>
                                            <td>Call of Duty: Warzone (NAT Aberto)</td>
                                            <td style="text-align:right;"><button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteUpnpPort(3074)">🗑️</button></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Xbox-Series-X (192.168.1.188)</strong></td>
                                            <td><span class="pill-badge pill-purple">UDP</span></td>
                                            <td><code>88</code></td>
                                            <td><code>88</code></td>
                                            <td>Xbox Live Multiplayer Voice</td>
                                            <td style="text-align:right;"><button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteUpnpPort(88)">🗑️</button></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Transmission-NAS (192.168.1.105)</strong></td>
                                            <td><span class="pill-badge pill-cyan">TCP</span></td>
                                            <td><code>51413</code></td>
                                            <td><code>51413</code></td>
                                            <td>BitTorrent Peer Sync</td>
                                            <td style="text-align:right;"><button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteUpnpPort(51413)">🗑️</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- LuCI Native: Host DMZ (Zona Desmilitarizada / ARK-FW-003) & Redes Virtuais SD-WAN (ZeroTier / Speedify) -->
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;" class="traffic-grid">
                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0;">🎯 Host DMZ (Zona Desmilitarizada)</h3>
                                    <label class="ark-switch"><input type="checkbox" id="dmz_toggle" onchange="toggleDmz(this)"><span class="ark-slider"></span></label>
                                </div>
                                <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4; margin-bottom:10px;">
                                    Redireciona todas as portas não mapeadas diretamente para um único aparelho.
                                </p>
                                <div class="form-group" style="margin-bottom:10px;">
                                    <label class="form-label">Dispositivo Destino na DMZ</label>
                                    <select class="form-select" id="dmz_host_sel">
                                        <option value="none" selected>Nenhum (DMZ Desativada com Segurança)</option>
                                        <option value="192.168.1.189">PlayStation-5-Pro (192.168.1.189)</option>
                                        <option value="192.168.1.188">Xbox-Series-X (192.168.1.188)</option>
                                        <option value="192.168.1.146">MacMini-M2-Server (192.168.1.146)</option>
                                    </select>
                                </div>
                                <button class="ark-btn ark-btn-secondary" style="width:100%;" onclick="saveDmzSettings()">💾 Salvar Host DMZ</button>
                            </div>

                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0 0 6px;">🌐 SD-WAN: ZeroTier & Speedify Bonding</h3>
                                <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4; margin-bottom:8px;">
                                    Integrações nativas de rede corporativa mesh e agregação multi-link.
                                </p>
                                <div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); padding:8px 10px; border-radius:6px;">
                                        <div><strong>ZeroTier:</strong> <code>17d709436cb89a12</code></div>
                                        <span class="pill-badge pill-online">ONLINE (10.147.19.42)</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); padding:8px 10px; border-radius:6px;">
                                        <div><strong>Speedify Bonding:</strong> WAN 1 + WAN 2 + Starlink</div>
                                        <span class="pill-badge pill-purple">1.34 Gbps COMBINADO</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- LuCI Native: Redirecionamento de Portas (Port Forwarding / NAT) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">🔀 Redirecionamento de Portas (Port Forwarding / NAT)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Permita acesso externo a servidores internos, jogos online, torrents e CFTV</span>
                                </div>
                                <button class="ark-btn ark-btn-primary" onclick="openPortForwardModal()">
                                    ➕ Nova Regra de Porta
                                </button>
                            </div>

                            <div class="device-table-container">
                                <table class="device-table">
                                    <thead>
                                        <tr>
                                            <th>Nome da Regra</th>
                                            <th>Protocolo</th>
                                            <th>Porta WAN Externa</th>
                                            <th>Dispositivo Destino (IP)</th>
                                            <th>Porta Interna</th>
                                            <th>Ativo</th>
                                            <th style="text-align:right;">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody id="port_forward_tbody">
                                        <tr>
                                            <td><strong>Plex Media Server</strong></td>
                                            <td><span class="pill-badge pill-cyan">TCP</span></td>
                                            <td><code>32400</code></td>
                                            <td>192.168.1.105 (NAS Synology)</td>
                                            <td><code>32400</code></td>
                                            <td>
                                                <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                                            </td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deletePortRule(this)">🗑️</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Servidor Web Seguro</strong></td>
                                            <td><span class="pill-badge pill-cyan">TCP</span></td>
                                            <td><code>8443</code></td>
                                            <td>192.168.1.146 (MacMini M2)</td>
                                            <td><code>443</code></td>
                                            <td>
                                                <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                                            </td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deletePortRule(this)">🗑️</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Câmeras CFTV RTSP</strong></td>
                                            <td><span class="pill-badge pill-purple">TCP+UDP</span></td>
                                            <td><code>554</code></td>
                                            <td>192.168.1.150 (Câmera Frente)</td>
                                            <td><code>554</code></td>
                                            <td>
                                                <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                                            </td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deletePortRule(this)">🗑️</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- LuCI Native: Regras de Tráfego do Firewall (Traffic Rules) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0 0 4px;">🛡️ Regras de Tráfego & Bloqueio (Firewall nftables)</h3>
                            <span style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:12px;">Proteção perimetral contra sondagens e ataques de força bruta na WAN</span>

                            <div style="display:flex; flex-direction:column; gap:10px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
                                    <div>
                                        <strong style="font-size:0.88rem; color:#fff;">Bloqueio Total de Gerenciamento na WAN (Drop Portas 80, 443, 22)</strong>
                                        <div style="font-size:0.75rem; color:#94a3b8;">Impede tentativas de login externo na interface LuCI e no terminal SSH</div>
                                    </div>
                                    <span class="pill-badge pill-online">ATIVO (SEGURO)</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
                                    <div>
                                        <strong style="font-size:0.88rem; color:#fff;">Responder a Pings ICMP Externos na WAN</strong>
                                        <div style="font-size:0.75rem; color:#94a3b8;">Permite testes de latência e monitoramento do seu provedor de internet</div>
                                    </div>
                                    <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
                                    <div>
                                        <strong style="font-size:0.88rem; color:#fff;">Forçar Redirecionamento de DNS para Servidor Criptografado</strong>
                                        <div style="font-size:0.75rem; color:#94a3b8;">Intercepta requisições da porta 53 plana de smart TVs e IoTs e força AdGuard/Cloudflare</div>
                                    </div>
                                    <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 7: DIAGNÓSTICO DOCTOR & TELEMETRIA STARLINK       -->
                <!-- ========================================================= -->
                <section class="view-panel" id="view_doctor">
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>🩺 Ark Doctor — Diagnóstico Vital Inteligente</h2>
                                <span class="badge pill-online">12/12 Subsistemas Saudáveis</span>
                            </div>
                            <button class="ark-btn ark-btn-primary" onclick="runDoctorCheck()">🔄 Executar Diagnóstico Completo</button>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;" id="doctor_checks_grid">
                            <!-- Populated by JS -->
                        </div>
                    </div>

                    <!-- Starlink Telemetry -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>🛰️ Starlink Dishy — Telemetria Orbital LEO</h2>
                                <span class="badge pill-cyan">Antena Starlink Mini Conectada</span>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button class="ark-btn ark-btn-secondary" onclick="dishyAction('stow')">📐 Recolher Antena (Stow)</button>
                                <button class="ark-btn ark-btn-secondary" onclick="dishyAction('reboot')">🔄 Reiniciar Dishy</button>
                                <button class="ark-btn ark-btn-cyan" onclick="openModal('starlink_config')">⚙️ Configurações Dishy</button>
                            </div>
                        </div>
                        <div class="wan-grid">
                            <div class="wan-card">
                                <div class="wan-header">
                                    <span class="wan-title">📡 Estado Operacional da Antena</span>
                                    <span class="pill-badge pill-online">ONLINE • SATÉLITE FIXADO</span>
                                </div>
                                <div class="wan-info-grid">
                                    <div class="wan-info-item"><span>Latência Orbital</span><strong>28 ms (Excelente)</strong></div>
                                    <div class="wan-info-item"><span>Obstrução do Céu</span><strong>0.0% (Visão Limpa)</strong></div>
                                    <div class="wan-info-item"><span>Azimute / Elevação</span><strong>184° / 42° Norte</strong></div>
                                    <div class="wan-info-item"><span>Consumo Energético</span><strong>24.2 Watts</strong></div>
                                </div>
                            </div>
                            <div class="wan-card">
                                <div class="wan-header">
                                    <span class="wan-title">❄️ Degelo Térmico & Modo Noturno</span>
                                    <span class="pill-badge pill-cyan">STANDBY TÉRMICO</span>
                                </div>
                                <div class="wan-info-grid">
                                    <div class="wan-info-item"><span>Temperatura Antena</span><strong>38.4°C</strong></div>
                                    <div class="wan-info-item"><span>Sensor de Neve</span><strong>Automático</strong></div>
                                    <div class="wan-info-item"><span>Modo Bypass</span><strong>Ativado (ARK Gateway)</strong></div>
                                    <div class="wan-info-item"><span>Horário de Sleep</span><strong>Programado (02:00 - 06:00)</strong></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- LuCI Native: Ferramentas Interativas de Diagnóstico de Rede (network/diagnostics) -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>🎯 Ferramentas Interativas de Diagnóstico de Rede</h2>
                                <span class="badge pill-cyan">Ping • Traceroute • Nslookup</span>
                            </div>
                            <button class="ark-btn ark-btn-primary" onclick="runDiagnosticTool()" id="btn_run_diag">🚀 Disparar Teste</button>
                        </div>

                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:14px;">
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label">Ferramenta</label>
                                <select class="form-select" id="diag_tool_sel">
                                    <option value="ping" selected>Ping (Latência & ICMP)</option>
                                    <option value="traceroute">Traceroute (Saltos de Rota)</option>
                                    <option value="nslookup">Nslookup (Resolução de DNS)</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label">Destino do Teste</label>
                                <select class="form-select" id="diag_target_sel">
                                    <option value="1.1.1.1" selected>1.1.1.1 (Cloudflare Anycast SP)</option>
                                    <option value="8.8.8.8">8.8.8.8 (Google Primary)</option>
                                    <option value="starlink.com">starlink.com (Telemetria LEO)</option>
                                    <option value="registro.br">registro.br (IX.br São Paulo)</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label">Contagem de Pacotes</label>
                                <select class="form-select" id="diag_count_sel">
                                    <option value="4" selected>4 Pacotes (Rápido)</option>
                                    <option value="10">10 Pacotes (Alta Precisão)</option>
                                </select>
                            </div>
                        </div>

                        <div style="background:#090d16; border:1px solid #1e293b; border-radius:8px; padding:14px; font-family:monospace; font-size:0.82rem; color:#38bdf8; min-height:100px; max-height:160px; overflow-y:auto;" id="diag_output_box">
                            <div>PING 1.1.1.1 (1.1.1.1): 56 data bytes</div>
                            <div>64 bytes from 1.1.1.1: seq=0 ttl=58 time=1.842 ms</div>
                            <div>64 bytes from 1.1.1.1: seq=1 ttl=58 time=1.654 ms</div>
                            <div>64 bytes from 1.1.1.1: seq=2 ttl=58 time=1.720 ms</div>
                            <div>64 bytes from 1.1.1.1: seq=3 ttl=58 time=1.588 ms</div>
                            <div style="color:#10b981; margin-top:4px;">--- 1.1.1.1 ping statistics --- 4 packets transmitted, 4 packets received, 0% packet loss</div>
                            <div style="color:#10b981;">round-trip min/avg/max = 1.588/1.701/1.842 ms (Jitter: 0.12 ms)</div>
                        </div>
                    </div>

                    <!-- LuCI Native: Logs do Sistema em Tempo Real (status/syslog & status/dmesg) -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>📜 Logs do Sistema em Tempo Real (Syslog & Kernel)</h2>
                                <span class="badge pill-online">Buffer Ativo (logread)</span>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button class="ark-btn ark-btn-secondary" style="padding:6px 12px; font-size:0.8rem;" onclick="copySyslogs()">📋 Copiar</button>
                                <button class="ark-btn ark-btn-secondary" style="padding:6px 12px; font-size:0.8rem;" onclick="clearSyslogs()">🧹 Limpar</button>
                            </div>
                        </div>

                        <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
                            <button class="ark-btn ark-btn-secondary active" style="padding:4px 10px; font-size:0.75rem;" onclick="filterLogs('all', this)">Todos</button>
                            <button class="ark-btn ark-btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick="filterLogs('wifi', this)">Wi-Fi (hostapd/usteer)</button>
                            <button class="ark-btn ark-btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick="filterLogs('firewall', this)">Firewall (nftables)</button>
                            <button class="ark-btn ark-btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick="filterLogs('dhcp', this)">DHCP (dnsmasq)</button>
                            <button class="ark-btn ark-btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick="filterLogs('kernel', this)">Kernel (dmesg)</button>
                        </div>

                        <div style="background:#090d16; border:1px solid #1e293b; border-radius:8px; padding:14px; font-family:monospace; font-size:0.78rem; line-height:1.5; color:#cbd5e1; height:180px; overflow-y:auto;" id="syslog_box">
                            <div><span style="color:#64748b;">[14/Oct 03:42:01]</span> <span style="color:#38bdf8;">hostapd:</span> phy1-ap0: STA f4:d4:88:55:66:77 WPA: pairwise key handshake completed (WPA3-SAE)</div>
                            <div><span style="color:#64748b;">[14/Oct 03:42:15]</span> <span style="color:#a855f7;">usteer:</span> Client 34:ab:95:11:22:33 Roam event: 5GHz -> 6GHz (RSSI: -42 dBm, 320MHz MLO link active)</div>
                            <div><span style="color:#64748b;">[14/Oct 03:43:00]</span> <span style="color:#10b981;">dnsmasq-dhcp[1422]:</span> DHCPACK(br-lan) 192.168.1.101 34:ab:95:11:22:33 iPhone-16-Pro-Max</div>
                            <div><span style="color:#64748b;">[14/Oct 03:43:22]</span> <span style="color:#eab308;">mwan3[2104]:</span> Interface wan1 (Vivo Fibra) is online (ping: 1.8ms, packet loss: 0%)</div>
                            <div><span style="color:#64748b;">[14/Oct 03:44:05]</span> <span style="color:#10b981;">kernel:</span> [mtk_ppe] Hardware flow table offload active (PPE MT7986A, WED enabled)</div>
                            <div><span style="color:#64748b;">[14/Oct 03:45:10]</span> <span style="color:#38bdf8;">firewall:</span> fw4: 0 legacy iptables rules detected. 100% pure nftables active.</div>
                        </div>
                    </div>
                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 8: SISTEMA & HARDWARE                              -->
                <!-- ========================================================= -->
                <section class="view-panel" id="view_system">
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>💡 Iluminação, LEDs & Sistema</h2>
                                <span class="badge pill-online">Controle de Hardware</span>
                            </div>
                            <button class="ark-btn ark-btn-secondary" onclick="openModal('reboot')">🔄 Reiniciar Roteador</button>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-bottom:14px;">
                            <div>
                                <div style="font-size:1rem; font-weight:800; color:#fff;">Modo Noturno (Desligar Iluminação do Roteador)</div>
                                <div style="font-size:0.8rem; color:#94a3b8;">Desativa todos os LEDs físicos das portas e logotipo frontal para ambientes escuros.</div>
                            </div>
                            <label class="ark-switch">
                                <input type="checkbox" id="led_night_toggle" onchange="toggleNightLeds(this)">
                                <span class="ark-slider"></span>
                            </label>
                        </div>

                        <!-- Otimização Imediata de Memória RAM & Armazenamento Flash (ARK-HW-004, ARK-HW-005) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-bottom:14px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0;">🧹 Manutenção Operacional Imediata de Memória & Flash</h3>
                                    <span style="font-size:0.75rem; color:#94a3b8;">Despejo de caches estagnados e limpeza de arquivos temporários da partição /overlay</span>
                                </div>
                                <div style="display:flex; gap:8px;">
                                    <button class="ark-btn ark-btn-secondary" onclick="purgeRam()">
                                        🧹 Purgar Memória RAM (Drop Caches)
                                    </button>
                                    <button class="ark-btn ark-btn-secondary" onclick="cleanFlashStorage()">
                                        🗑️ Limpar Temporários da Flash
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Central de Plugins e Módulos do Sistema (OpenWrt Packages & Daemons) -->
                        <div style="background:var(--ark-surface-2); border:1px solid rgba(56, 189, 248, 0.25); border-radius:var(--ark-radius-md); padding:16px; margin-bottom:14px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                                <div>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <h3 style="font-size:0.98rem; font-weight:800; color:#fff; margin:0;">📦 Central de Plugins & Módulos do Sistema (12)</h3>
                                        <span class="pill-badge pill-online" style="font-size:0.7rem;">opkg & daemons</span>
                                    </div>
                                    <p style="font-size:0.78rem; color:#94a3b8; margin:4px 0 0;">Gerencie os serviços de aceleração, pacotes instalados na partição /overlay, UPnP, mwan3, ZeroTier e Speedify.</p>
                                </div>
                                <div style="display:flex; gap:8px;">
                                    <button class="ark-btn ark-btn-primary" onclick="openModal('plugins')">
                                        📦 Gerenciar Plugins & Módulos
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;" class="traffic-grid">
                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <strong style="color:#fff; font-size:0.95rem;">🎨 Personalização Visual</strong>
                                <p style="font-size:0.8rem; color:#94a3b8; margin:6px 0 12px;">Selecione o esquema de cores e tema escuro ativo.</p>
                                <button class="ark-btn ark-btn-secondary" onclick="openModal('theme_picker')">Escolher Tema Visual</button>
                            </div>
                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <strong style="color:#fff; font-size:0.95rem;">🌐 Modo de Operação</strong>
                                <p style="font-size:0.8rem; color:#94a3b8; margin:6px 0 12px;">Alterne entre Roteador Gateway Principal e AP Bridge.</p>
                                <button class="ark-btn ark-btn-secondary" onclick="openModal('op_mode')">Alterar Modo</button>
                            </div>
                        </div>

                        <!-- LuCI Native: Backup, Restauração de Configurações & Sysupgrade (system/flash) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div class="section-header" style="margin-bottom:12px;">
                                <div class="section-title">
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">💾 Backup, Restauração & Gravação de Firmware (Sysupgrade)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Preservação completa das configurações UCI, senhas e chaves criptográficas</span>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px;">
                                <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:14px; display:flex; flex-direction:column; justify-content:space-between;">
                                    <div>
                                        <strong style="font-size:0.92rem; color:#fff;">Gerar Cópia de Segurança</strong>
                                        <p style="font-size:0.78rem; color:#94a3b8; margin:6px 0 12px; line-height:1.4;">
                                            Baixe um arquivo compactado <code>.tar.gz</code> contendo todas as alterações de rede, Wi-Fi e firewall.
                                        </p>
                                    </div>
                                    <button class="ark-btn ark-btn-secondary" onclick="generateConfigBackup()" style="width:100%;">
                                        ⬇ Baixar Backup (.tar.gz)
                                    </button>
                                </div>

                                <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:14px; display:flex; flex-direction:column; justify-content:space-between;">
                                    <div>
                                        <strong style="font-size:0.92rem; color:#fff;">Restaurar Configuração</strong>
                                        <p style="font-size:0.78rem; color:#94a3b8; margin:6px 0 12px; line-height:1.4;">
                                            Substitua os parâmetros atuais por uma cópia de segurança salva anteriormente.
                                        </p>
                                    </div>
                                    <button class="ark-btn ark-btn-secondary" onclick="openModal('restore_backup')" style="width:100%;">
                                        ⬆ Enviar Backup
                                    </button>
                                </div>

                                <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:14px; display:flex; flex-direction:column; justify-content:space-between;">
                                    <div>
                                        <strong style="font-size:0.92rem; color:#fff;">Atualização de Firmware</strong>
                                        <p style="font-size:0.78rem; color:#94a3b8; margin:6px 0 12px; line-height:1.4;">
                                            OpenWrt 24.10.0 • Acer Predator W6x. Verifique novas imagens oficiais com 1 clique.
                                        </p>
                                    </div>
                                    <button class="ark-btn ark-btn-primary" onclick="openModal('ota_update')" style="width:100%;">
                                        🔍 Verificar Atualizações
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- LuCI Native: Armazenamento Flash SPI & Gerenciador de Pacotes (system/packages) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">📦 Armazenamento Flash SPI & Pacotes Instalados (OPKG / APK)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Gerenciador nativo de softwares e daemons do OpenWrt</span>
                                </div>
                                <button class="ark-btn ark-btn-secondary" onclick="packageUpdateCheck()">
                                    🔄 Atualizar Repositórios (opkg update)
                                </button>
                            </div>

                            <div style="background:rgba(0,0,0,0.3); border-radius:8px; padding:12px; margin-bottom:14px;">
                                <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:6px;">
                                    <span style="color:#94a3b8;">Capacidade da Memória Flash (NAND 128 MB):</span>
                                    <strong style="color:#10b981;">84.8 MB Livres (66% Disponível)</strong>
                                </div>
                                <div style="background:rgba(255,255,255,0.1); border-radius:4px; height:8px; overflow:hidden;">
                                    <div style="background:#38bdf8; width:34%; height:100%;"></div>
                                </div>
                            </div>

                            <div class="device-table-container">
                                <table class="device-table">
                                    <thead>
                                        <tr>
                                            <th>Nome do Pacote</th>
                                            <th>Versão Instalada</th>
                                            <th>Descrição Operacional</th>
                                            <th style="text-align:right;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>mwan3</strong></td>
                                            <td><code>2.11.1-2</code></td>
                                            <td>Multi-WAN policy based routing & failover</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>sqm-scripts</strong></td>
                                            <td><code>1.5.2-1 (CAKE-mq)</code></td>
                                            <td>Smart Queue Management com mitigação de Bufferbloat</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>wpad-mbedtls</strong></td>
                                            <td><code>2024-03-09</code></td>
                                            <td>Daemon Wi-Fi completo (WPA3-SAE, 802.11r/k/v, MLO)</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>kmod-nft-offload</strong></td>
                                            <td><code>6.6.54-1</code></td>
                                            <td>Módulo de aceleração de fluxo por hardware no kernel</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>wireguard-tools</strong></td>
                                            <td><code>1.0.20210914</code></td>
                                            <td>Controle de túneis criptográficos VPN de alta velocidade</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- LuCI Native: Daemons & Serviços de Inicialização (system/startup) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div class="section-header" style="margin-bottom:12px;">
                                <div class="section-title">
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">⚙️ Daemons & Serviços de Inicialização (/etc/init.d/)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Controle de processos em segundo plano do roteador</span>
                                </div>
                            </div>

                            <div class="device-table-container">
                                <table class="device-table">
                                    <thead>
                                        <tr>
                                            <th>Nome do Serviço</th>
                                            <th>Função no Roteador</th>
                                            <th>Status</th>
                                            <th>Inicialização Automática</th>
                                            <th style="text-align:right;">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>dnsmasq</strong></td>
                                            <td>Servidor DHCP & Cache DNS Local</td>
                                            <td><span class="pill-badge pill-online">RODANDO</span></td>
                                            <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="serviceAction('dnsmasq', 'restart')">🔄 Reiniciar</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>firewall</strong></td>
                                            <td>Motor fw4 (nftables puro)</td>
                                            <td><span class="pill-badge pill-online">RODANDO</span></td>
                                            <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="serviceAction('firewall', 'restart')">🔄 Reiniciar</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>dropbear</strong></td>
                                            <td>Terminal Seguro SSH (Porta 22)</td>
                                            <td><span class="pill-badge pill-online">RODANDO</span></td>
                                            <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="serviceAction('dropbear', 'restart')">🔄 Reiniciar</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>sqm</strong></td>
                                            <td>Fila CAKE Bufferbloat</td>
                                            <td><span class="pill-badge pill-online">RODANDO</span></td>
                                            <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="serviceAction('sqm', 'restart')">🔄 Reiniciar</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>ark-telemetry</strong></td>
                                            <td>Métricas em tempo real & Doctor</td>
                                            <td><span class="pill-badge pill-online">RODANDO</span></td>
                                            <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="serviceAction('ark-telemetry', 'restart')">🔄 Reiniciar</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    </div>

    
    <!-- ========================================================= -->
    <!-- LUCI NAVIGATION DRAWER (CANONICAL OPENWRT MENUS)           -->
    <!-- ========================================================= -->
    <div id="luci_drawer_backdrop" onclick="toggleLuciDrawer()"></div>
    <div id="luci_drawer">
        <div class="drawer-header">
            <div>
                <h3 style="margin:0; font-size:1.1rem; color:#fff; font-weight:700;">Navegação OpenWrt LuCI</h3>
                <span style="font-size:0.75rem; color:#94a3b8;">Estrutura Canônica de Menus & Ajustes UCI</span>
            </div>
            <button class="modal-close-btn" onclick="toggleLuciDrawer()">✕</button>
        </div>
        <div style="position:relative;">
            <input type="text" id="drawer_search" placeholder="🔍 Filtrar menus ou ajustes UCI..." oninput="filterLuciDrawer(this.value)" style="width:100%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:10px 14px; color:#fff; font-size:0.85rem; box-sizing:border-box;">
        </div>
        <div id="drawer_links_container" style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; padding-right:4px;">
            <div class="drawer-category">📊 Status do Roteador</div>
            <a class="drawer-link" onclick="openLuciSimulator('status/overview'); toggleLuciDrawer();">
                <span>Visão Geral do Sistema</span><span class="drawer-link-meta">/status/overview</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('status/routes'); toggleLuciDrawer();">
                <span>Tabela de Roteamento Kernel</span><span class="drawer-link-meta">/status/routes</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('status/syslog'); toggleLuciDrawer();">
                <span>Registro do Sistema (Syslog)</span><span class="drawer-link-meta">/status/syslog</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('status/dmesg'); toggleLuciDrawer();">
                <span>Registro do Kernel (Dmesg)</span><span class="drawer-link-meta">/status/dmesg</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('status/processes'); toggleLuciDrawer();">
                <span>Processos Ativos & Uso de CPU</span><span class="drawer-link-meta">/status/processes</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('status/realtime'); toggleLuciDrawer();">
                <span>Gráficos em Tempo Real</span><span class="drawer-link-meta">/status/realtime</span>
            </a>

            <div class="drawer-category">⚙️ Sistema & Administração</div>
            <a class="drawer-link" onclick="openLuciSimulator('system/system'); toggleLuciDrawer();">
                <span>Propriedades do Sistema & Fuso</span><span class="drawer-link-meta">/system/system</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('system/admin'); toggleLuciDrawer();">
                <span>Administração & Chaves SSH</span><span class="drawer-link-meta">/system/admin</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('system/packages'); toggleLuciDrawer();">
                <span>Gerenciador de Pacotes (opkg / apk)</span><span class="drawer-link-meta">/system/packages</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('system/startup'); toggleLuciDrawer();">
                <span>Serviços de Inicialização (Initscripts)</span><span class="drawer-link-meta">/system/startup</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('system/crontab'); toggleLuciDrawer();">
                <span>Tarefas Agendadas (Crontab)</span><span class="drawer-link-meta">/system/crontab</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('system/flash'); toggleLuciDrawer();">
                <span>Backup & Gravar Firmware</span><span class="drawer-link-meta">/system/flash</span>
            </a>

            <div class="drawer-category">🌐 Rede & Firewall</div>
            <a class="drawer-link" onclick="openLuciSimulator('network/network'); toggleLuciDrawer();">
                <span>Interfaces de Rede (LAN, WAN, WAN2)</span><span class="drawer-link-meta">/network/network</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('network/wireless'); toggleLuciDrawer();">
                <span>Rádios Wi-Fi & Pontos de Acesso</span><span class="drawer-link-meta">/network/wireless</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('network/switch'); toggleLuciDrawer();">
                <span>Switch / DSA VLANs</span><span class="drawer-link-meta">/network/switch</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('network/dhcp'); toggleLuciDrawer();">
                <span>DHCP e DNS (dnsmasq)</span><span class="drawer-link-meta">/network/dhcp</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('network/firewall'); toggleLuciDrawer();">
                <span>Firewall & Zonas (fw4 / nftables)</span><span class="drawer-link-meta">/network/firewall</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('network/diagnostics'); toggleLuciDrawer();">
                <span>Diagnósticos de Conexão (Ping/Trace)</span><span class="drawer-link-meta">/network/diagnostics</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('network/mwan'); toggleLuciDrawer();">
                <span>Multi-WAN Balanceamento (mwan3)</span><span class="drawer-link-meta">/network/mwan</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('network/sqm'); toggleLuciDrawer();">
                <span>Controle de Bufferbloat (SQM CAKE)</span><span class="drawer-link-meta">/network/sqm</span>
            </a>

            <div class="drawer-category">🛡️ Serviços Adicionais</div>
            <a class="drawer-link" onclick="openLuciSimulator('services/adblock'); toggleLuciDrawer();">
                <span>AdBlock DNS Sinkhole</span><span class="drawer-link-meta">/services/adblock</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('services/upnp'); toggleLuciDrawer();">
                <span>UPnP / NAT-PMP IGD</span><span class="drawer-link-meta">/services/upnp</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('services/ddns'); toggleLuciDrawer();">
                <span>DNS Dinâmico (DDNS)</span><span class="drawer-link-meta">/services/ddns</span>
            </a>

            <div class="drawer-category">🔒 Redes Virtuais & VPN</div>
            <a class="drawer-link" onclick="openLuciSimulator('vpn/wireguard'); toggleLuciDrawer();">
                <span>WireGuard Status & Peers</span><span class="drawer-link-meta">/vpn/wireguard</span>
            </a>
            <a class="drawer-link" onclick="openLuciSimulator('vpn/zerotier'); toggleLuciDrawer();">
                <span>ZeroTier SD-WAN</span><span class="drawer-link-meta">/vpn/zerotier</span>
            </a>
        </div>
    </div>

    <!-- SIMULADOR INTERATIVO DE PÁGINAS DO LUCI -->
    <!-- ========================================================= -->
    <div id="luci_native_view_container">
        <div class="luci-sim-bar">
            <div style="display:flex; align-items:center; gap:12px;">
                <button class="ark-btn ark-btn-primary" onclick="closeLuciSimulator()">
                    ⬅ Voltar ao Painel ARK Router V2
                </button>
                <span style="font-size:0.85rem; color:#9ca3af;" id="luci_sim_current_route">Rota: /cgi-bin/luci/admin/status/overview</span>
            </div>
            <span class="pill-badge pill-cyan">MODO LUCI CLÁSSICO SIMULADO</span>
        </div>

        <div class="luci-sim-classic-header">
            <div>
                <h1 style="font-size:1.3rem; font-weight:700; margin:0;">OpenWrt LuCI</h1>
                <span style="font-size:0.75rem; opacity:0.8;">Acer Predator W6x • OpenWrt 24.10.0 r27208</span>
            </div>
            <div style="font-size:0.82rem;">Usuário: <strong>root</strong></div>
        </div>

        <div class="luci-sim-classic-nav" id="luci_main_tabs">
            <a class="luci-nav-tab active" id="ltab_status" onclick="switchLuciCategory('status')">📊 Status</a>
            <a class="luci-nav-tab" id="ltab_system" onclick="switchLuciCategory('system')">⚙️ Sistema</a>
            <a class="luci-nav-tab" id="ltab_network" onclick="switchLuciCategory('network')">🌐 Rede</a>
            <a class="luci-nav-tab" id="ltab_services" onclick="switchLuciCategory('services')">🛡️ Serviços</a>
            <a class="luci-nav-tab" id="ltab_vpn" onclick="switchLuciCategory('vpn')">🔒 VPN</a>
            <a class="luci-nav-tab" style="background:#0284c7; color:#fff; margin-left:auto;" onclick="closeLuciSimulator()">⚡ Voltar ao ARK Router V2</a>
        </div>
        <div class="luci-sim-subnav" id="luci_subnav_tabs"></div>

        <div class="luci-sim-content" id="luci_sim_content_body"></div>
    </div>

    <!-- ========================================================= -->
    <!-- MODAL OVERLAY (100% COM SELECTS)                          -->
    <!-- ========================================================= -->
    <div id="modal_overlay">
        <div class="modal-box">
            <div id="modal_content_holder"></div>
        </div>
    </div>

    <!-- TOAST NOTIFICATION -->
    <div id="toast_notify"></div>

    <!-- JAVASCRIPT LOGIC -->
    <script>
        // Genuine Scannable QR Codes injected from Python backend
        window._wifiQrData = __WIFI_QR_DATA_JSON__;
        let currentQrNetwork = 'main';

        // Configured Wi-Fi Interfaces (SSIDs / VAPs) Database
        let WIFI_NETWORKS = [
            {
                id: 'net_main',
                ssid: 'Wi-Fi-H&R',
                alias: 'Rede Principal Unificada (Master MLO Tri-Band)',
                pass: 'MinhaSenhaForte2026',
                active: true,
                radios: ['2.4', '5', '6'],
                bssid: '70:9e:29:ab:11:01',
                crypto: 'mixed',
                cryptoLabel: 'WPA3-SAE / WPA2-PSK Misto + PMF Ativo',
                mode: 'lan',
                modeLabel: 'LAN Principal (Acesso total)',
                clients: 27,
                limitDown: 0,
                limitUp: 0,
                hidden: false,
                isolate: false,
                roaming: true,
                badgeType: 'pill-purple',
                badgeText: 'MLO Tri-Band (2.4G + 5G + 6G)'
            },
            {
                id: 'net_guest',
                ssid: 'Wi-Fi-H&R-Visitantes',
                alias: 'Rede de Visitantes e Hóspedes',
                pass: 'Visitas@Ark2026',
                active: true,
                radios: ['2.4', '5'],
                bssid: '70:9e:29:ab:11:02',
                crypto: 'psk2',
                cryptoLabel: 'WPA2-PSK (AES-CCMP)',
                mode: 'guest',
                modeLabel: 'Isolada da Intranet (Apenas Internet)',
                clients: 4,
                limitDown: 25,
                limitUp: 10,
                hidden: false,
                isolate: true,
                roaming: true,
                badgeType: 'pill-cyan',
                badgeText: 'Dual-Band (2.4G + 5G)'
            },
            {
                id: 'net_iot',
                ssid: 'Wi-Fi-H&R-IoT',
                alias: 'Rede para Casa Inteligente e Automação IoT',
                pass: 'IoTSmartHome2026',
                active: true,
                radios: ['2.4'],
                bssid: '70:9e:29:ab:11:03',
                crypto: 'psk2',
                cryptoLabel: 'WPA2-PSK Legado',
                mode: 'iot',
                modeLabel: 'VLAN 30 (Segmentada)',
                clients: 12,
                limitDown: 10,
                limitUp: 5,
                hidden: false,
                isolate: false,
                roaming: false,
                badgeType: 'pill-amber',
                badgeText: '2.4 GHz Exclusivo'
            }
        ];

        // System Plugins & Modules Database (OpenWrt Packages)
        let SYSTEM_PLUGINS = [
            {
                id: 'sqm',
                name: 'SQM / CAKE (Anti-Bufferbloat)',
                pkg: 'sqm-scripts',
                desc: 'Organiza as filas de tráfego CAKE / FQ-CoDel, eliminando picos de latência e lag em jogos.',
                installed: true,
                size: '240 KB',
                version: '1.5.2-r3',
                category: 'net',
                actionType: 'modal',
                actionTarget: 'sqm'
            },
            {
                id: 'mwan3',
                name: 'Multi-WAN & Failover Inteligente',
                pkg: 'mwan3',
                desc: 'Adiciona redundância de sub-segundo e balanceamento de carga entre múltiplos links de internet.',
                installed: true,
                size: '380 KB',
                version: '2.11.8-1',
                category: 'net',
                actionType: 'modal',
                actionTarget: 'mwan3'
            },
            {
                id: 'adblock',
                name: 'Bloqueador de Anúncios (AdBlock Fast)',
                pkg: 'adblock-fast',
                desc: 'Intercepta anúncios invasivos, rastreadores e telemetria de Smart TVs diretamente no DNS.',
                installed: true,
                size: '180 KB',
                version: '1.1.2-4',
                category: 'sec',
                actionType: 'modal',
                actionTarget: 'adblock'
            },
            {
                id: 'upnp',
                name: 'UPnP IGD & NAT-PMP (Jogos / Consoles)',
                pkg: 'miniupnpd',
                desc: 'Abertura automática e dinâmica de portas para PlayStation 5, Xbox Series X, PC Gamer e torrents.',
                installed: true,
                size: '120 KB',
                version: '2.2.3-2',
                category: 'net',
                actionType: 'modal',
                actionTarget: 'upnp'
            },
            {
                id: 'wireguard',
                name: 'WireGuard VPN (Kernel Mode)',
                pkg: 'kmod-wireguard',
                desc: 'Túneis VPN modernos e de altíssimo desempenho operando em nível de kernel com criptografia Curve25519.',
                installed: true,
                size: '310 KB',
                version: '1.0.20210914',
                category: 'sec',
                actionType: 'modal',
                actionTarget: 'add_vpn'
            },
            {
                id: 'nlbwmon',
                name: 'Consumo & Tráfego por Aparelho',
                pkg: 'nlbwmon',
                desc: 'Coletor em tempo real do volume de dados e velocidade individual de cada aparelho conectado.',
                installed: true,
                size: '190 KB',
                version: '0.7.0-2',
                category: 'sys',
                actionType: 'view',
                actionTarget: 'devices'
            },
            {
                id: 'usteer',
                name: 'Assistente de Roaming Wi-Fi (usteer)',
                pkg: 'usteer',
                desc: 'Orquestra troca suave de sinal (AP Steering) e Band Steering 802.11k/v/r sem interrupção de chamada.',
                installed: true,
                size: '160 KB',
                version: '2024-03-01',
                category: 'wifi',
                actionType: 'view',
                actionTarget: 'wifi'
            },
            {
                id: 'zerotier',
                name: 'ZeroTier SD-WAN (Rede Virtual P2P)',
                pkg: 'zerotier',
                desc: 'Cria uma rede privada virtual mesh para acesso remoto seguro sem precisar abrir portas ou IP público.',
                installed: true,
                size: '2.8 MB',
                version: '1.12.2-1',
                category: 'sec',
                actionType: 'modal',
                actionTarget: 'zerotier'
            },
            {
                id: 'speedify',
                name: 'Speedify Bonding (Starlink + Fibra)',
                pkg: 'speedify-router',
                desc: 'Soma links de internet distintos agregando largura de banda e protegendo contra perdas de pacotes.',
                installed: false,
                size: '14.2 MB',
                version: '14.5.0',
                category: 'net',
                actionType: 'modal',
                actionTarget: 'speedify'
            },
            {
                id: 'zram',
                name: 'Compressão ZRAM LZ4 (RAM Turbo)',
                pkg: 'zram-swap',
                desc: 'Compacta a memória RAM em tempo real, dobrando a capacidade útil para roteadores e serviços.',
                installed: true,
                size: '45 KB',
                version: '1.2.0-1',
                category: 'sys',
                actionType: 'modal',
                actionTarget: 'hardware_ram'
            },
            {
                id: 'irqbalance',
                name: 'Balanceador Multicore CPU (irqbalance)',
                pkg: 'irqbalance',
                desc: 'Distribui interrupções de pacotes de rede e Wi-Fi entre os 4 núcleos do processador Filogic.',
                installed: true,
                size: '85 KB',
                version: '1.9.3-1',
                category: 'sys',
                actionType: 'modal',
                actionTarget: 'hardware_cpu'
            },
            {
                id: 'htop',
                name: 'Monitor de Processos (htop Terminal)',
                pkg: 'htop',
                desc: 'Visualizador interativo em tempo real com árvore de processos, memória e medidores por núcleo.',
                installed: true,
                size: '140 KB',
                version: '3.3.0-1',
                category: 'sys',
                actionType: 'modal',
                actionTarget: 'diagnostics'
            }
        ];

        // Device Database
        const DEVICES = [
            { id: 1, name: "iPhone-16-Pro-Max", ip: "192.168.1.101", mac: "34:ab:95:11:22:33", band: "6", rssi: -42, speed: "2.8 Gbps", total: "14.8 GB", type: "phone", prio: "high" },
            { id: 2, name: "MacBook-Pro-M3-Max", ip: "192.168.1.142", mac: "f4:d4:88:55:66:77", band: "6", rssi: -45, speed: "2.4 Gbps", total: "38.2 GB", type: "laptop", prio: "high" },
            { id: 3, name: "Galaxy-S24-Ultra", ip: "192.168.1.109", mac: "cc:46:d6:33:44:55", band: "6", rssi: -48, speed: "2.1 Gbps", total: "9.5 GB", type: "phone", prio: "normal" },
            { id: 4, name: "iPad-Pro-M4", ip: "192.168.1.115", mac: "18:af:61:77:88:99", band: "6", rssi: -50, speed: "1.9 Gbps", total: "12.1 GB", type: "laptop", prio: "normal" },
            { id: 5, name: "PlayStation-5-Pro", ip: "192.168.1.189", mac: "70:9e:29:aa:bb:cc", band: "eth", rssi: 0, speed: "2.5 Gbps", total: "84.2 GB", type: "console", prio: "gamer" },
            { id: 6, name: "TV-Samsung-OLED-65", ip: "192.168.1.110", mac: "a0:c9:a0:12:34:56", band: "5", rssi: -54, speed: "866 Mbps", total: "45.0 GB", type: "tv", prio: "normal" },
            { id: 7, name: "Apple-TV-4K", ip: "192.168.1.112", mac: "e8:04:0b:aa:11:22", band: "eth", rssi: 0, speed: "1.0 Gbps", total: "29.4 GB", type: "tv", prio: "normal" },
            { id: 8, name: "Servidor-NAS-Synology", ip: "192.168.1.105", mac: "00:11:32:44:55:66", band: "eth", rssi: 0, speed: "2.5 Gbps", total: "112.4 GB", type: "server", prio: "normal" },
            { id: 9, name: "Notebook-Dell-XPS", ip: "192.168.1.144", mac: "74:70:fd:88:99:00", band: "5", rssi: -58, speed: "866 Mbps", total: "16.8 GB", type: "laptop", prio: "normal" },
            { id: 10, name: "Xbox-Series-X", ip: "192.168.1.188", mac: "60:45:bd:11:22:33", band: "5", rssi: -52, speed: "1.2 Gbps", total: "52.3 GB", type: "console", prio: "gamer" },
            { id: 11, name: "Nintendo-Switch-OLED", ip: "192.168.1.192", mac: "98:b6:e9:22:33:44", band: "5", rssi: -62, speed: "433 Mbps", total: "8.1 GB", type: "console", prio: "normal" },
            { id: 12, name: "Amazon-Echo-Show-10", ip: "192.168.1.120", mac: "fc:65:de:33:44:55", band: "5", rssi: -56, speed: "433 Mbps", total: "3.2 GB", type: "iot", prio: "low" },
            { id: 13, name: "Google-Nest-Hub", ip: "192.168.1.122", mac: "20:df:b9:44:55:66", band: "5", rssi: -60, speed: "300 Mbps", total: "2.8 GB", type: "iot", prio: "low" },
            { id: 14, name: "Camera-Seguranca-Frente", ip: "192.168.1.150", mac: "10:2c:6b:55:66:77", band: "2.4", rssi: -64, speed: "72 Mbps", total: "18.5 GB", type: "iot", prio: "normal" },
            { id: 15, name: "Camera-Seguranca-Fundos", ip: "192.168.1.151", mac: "10:2c:6b:66:77:88", band: "2.4", rssi: -68, speed: "72 Mbps", total: "17.9 GB", type: "iot", prio: "normal" },
            { id: 16, name: "Lampada-Smart-Sala-1", ip: "192.168.1.160", mac: "50:02:91:77:88:99", band: "2.4", rssi: -70, speed: "24 Mbps", total: "120 MB", type: "iot", prio: "low" },
            { id: 17, name: "Lampada-Smart-Sala-2", ip: "192.168.1.161", mac: "50:02:91:88:99:aa", band: "2.4", rssi: -72, speed: "24 Mbps", total: "115 MB", type: "iot", prio: "low" },
            { id: 18, name: "Tomada-Smart-Cafeteira", ip: "192.168.1.162", mac: "68:c6:3a:99:aa:bb", band: "2.4", rssi: -66, speed: "36 Mbps", total: "85 MB", type: "iot", prio: "low" },
            { id: 19, name: "Robo-Aspirador-Xiaomi", ip: "192.168.1.170", mac: "7c:49:eb:aa:bb:cc", band: "2.4", rssi: -59, speed: "54 Mbps", total: "1.4 GB", type: "iot", prio: "low" },
            { id: 20, name: "Ar-Condicionado-LG-Quarto", ip: "192.168.1.172", mac: "84:25:3f:bb:cc:dd", band: "2.4", rssi: -65, speed: "36 Mbps", total: "420 MB", type: "iot", prio: "low" },
            { id: 21, name: "Ar-Condicionado-LG-Sala", ip: "192.168.1.173", mac: "84:25:3f:cc:dd:ee", band: "2.4", rssi: -62, speed: "48 Mbps", total: "510 MB", type: "iot", prio: "low" },
            { id: 22, name: "Fechadura-Smart-Entrada", ip: "192.168.1.175", mac: "90:b6:86:dd:ee:ff", band: "2.4", rssi: -58, speed: "24 Mbps", total: "95 MB", type: "iot", prio: "high" },
            { id: 23, name: "Impressora-HP-LaserJet", ip: "192.168.1.130", mac: "3c:2a:f4:ee:ff:00", band: "2.4", rssi: -55, speed: "72 Mbps", total: "2.1 GB", type: "printer", prio: "normal" },
            { id: 24, name: "Kindle-Paperwhite-Leitor", ip: "192.168.1.135", mac: "ac:63:be:00:11:22", band: "2.4", rssi: -63, speed: "48 Mbps", total: "340 MB", type: "phone", prio: "low" },
            { id: 25, name: "Tablet-Samsung-Tab-S9", ip: "192.168.1.118", mac: "54:27:1e:11:22:33", band: "5", rssi: -50, speed: "1.2 Gbps", total: "8.9 GB", type: "laptop", prio: "normal" },
            { id: 26, name: "TV-LG-WebOS-Quarto", ip: "192.168.1.111", mac: "28:ee:52:22:33:44", band: "5", rssi: -61, speed: "433 Mbps", total: "22.4 GB", type: "tv", prio: "normal" },
            { id: 27, name: "Sonos-One-Sala-Som", ip: "192.168.1.125", mac: "78:28:ca:33:44:55", band: "5", rssi: -53, speed: "300 Mbps", total: "14.2 GB", type: "iot", prio: "normal" },
            { id: 28, name: "Sonos-One-Cozinha", ip: "192.168.1.126", mac: "78:28:ca:44:55:66", band: "5", rssi: -58, speed: "300 Mbps", total: "9.6 GB", type: "iot", prio: "normal" },
            { id: 29, name: "HomePod-Mini-Escritorio", ip: "192.168.1.128", mac: "94:e9:79:55:66:77", band: "5", rssi: -49, speed: "433 Mbps", total: "6.8 GB", type: "iot", prio: "normal" },
            { id: 30, name: "Sensor-Presenca-Corredor", ip: "192.168.1.180", mac: "a4:c1:38:66:77:88", band: "2.4", rssi: -71, speed: "12 Mbps", total: "45 MB", type: "iot", prio: "low" },
            { id: 31, name: "Sensor-Vazamento-Cozinha", ip: "192.168.1.181", mac: "a4:c1:38:77:88:99", band: "2.4", rssi: -69, speed: "12 Mbps", total: "38 MB", type: "iot", prio: "high" },
            { id: 32, name: "Motor-Portao-Garagem", ip: "192.168.1.185", mac: "b8:d6:1a:88:99:aa", band: "2.4", rssi: -74, speed: "24 Mbps", total: "62 MB", type: "iot", prio: "normal" },
            { id: 33, name: "Chromecast-HD-Hospedes", ip: "192.168.1.114", mac: "f8:8f:12:99:aa:bb", band: "5", rssi: -67, speed: "300 Mbps", total: "11.2 GB", type: "tv", prio: "normal" },
            { id: 34, name: "MacMini-M2-Backup", ip: "192.168.1.146", mac: "3c:06:30:aa:bb:cc", band: "5", rssi: -44, speed: "1.2 Gbps", total: "28.1 GB", type: "laptop", prio: "normal" }
        ];

        let currentFilter = 'all';
        let currentSearch = '';
        let currentSort = 'traffic';

        // SPA View Switcher
        function switchView(viewId) {
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

            const targetPanel = document.getElementById('view_' + viewId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }

            const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(a => a.getAttribute('onclick')?.includes(viewId));
            if (activeNav) activeNav.classList.add('active');

            if (window.innerWidth <= 854) {
                const sb = document.getElementById('sidebar');
                const bd = document.getElementById('sidebar_backdrop');
                if (sb && sb.classList.contains('open')) sb.classList.remove('open');
                if (bd) bd.style.display = 'none';
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });

            if (viewId === 'overview') {
                setTimeout(initTrafficCanvas, 50);
            }
        }

        function toggleSidebar() {
            const sb = document.getElementById('sidebar');
            const bd = document.getElementById('sidebar_backdrop');
            sb.classList.toggle('open');
            if (bd) {
                bd.style.display = sb.classList.contains('open') ? 'block' : 'none';
            }
        }

        // Render Devices
        function renderDevicesTable() {
            const tbody = document.getElementById('device_table_body');
            if (!tbody) return;

            let list = [...DEVICES];
            if (currentFilter !== 'all') list = list.filter(d => d.band === currentFilter);
            if (currentSearch.trim()) {
                const q = currentSearch.toLowerCase();
                list = list.filter(d => d.name.toLowerCase().includes(q) || d.ip.includes(q) || d.mac.toLowerCase().includes(q));
            }
            if (currentSort === 'traffic') list.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
            else if (currentSort === 'speed') list.sort((a, b) => parseFloat(b.speed) - parseFloat(a.speed));
            else if (currentSort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));

            tbody.innerHTML = list.map(d => {
                let icon = '📱';
                if (d.type === 'laptop') icon = '💻';
                else if (d.type === 'tv') icon = '📺';
                else if (d.type === 'console') icon = '🎮';
                else if (d.type === 'server') icon = '🖥️';
                else if (d.type === 'printer') icon = '🖨️';
                else if (d.type === 'iot') icon = '🏠';

                let bandBadge = '<span class="pill-badge pill-amber">2.4 GHz</span>';
                if (d.band === '5') bandBadge = '<span class="pill-badge pill-cyan">5 GHz</span>';
                else if (d.band === '6') bandBadge = '<span class="pill-badge pill-purple">6 GHz BE</span>';
                else if (d.band === 'eth') bandBadge = '<span class="pill-badge pill-online">Cabo LAN</span>';

                let signalStr = d.band === 'eth' ? '— (Cabo)' : `${d.rssi} dBm`;

                return `
                    <tr>
                        <td>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:1.15rem;">${icon}</span>
                                <div>
                                    <strong style="color:#fff;">${d.name}</strong>
                                    <div style="font-size:0.72rem; color:#64748b;">${d.prio === 'gamer' ? '⚡ Prioridade Gamer' : (d.prio === 'high' ? 'Alta Prioridade' : 'Normal')}</div>
                                </div>
                            </div>
                        </td>
                        <td><code>${d.ip}</code></td>
                        <td><code style="color:#94a3b8;">${d.mac}</code></td>
                        <td>${bandBadge}</td>
                        <td style="color:${d.rssi > -60 ? '#34d399' : (d.rssi > -70 ? '#fbbf24' : '#f87171')}; font-weight:700;">${signalStr}</td>
                        <td style="color:#38bdf8; font-weight:700;">${d.speed}</td>
                        <td style="color:#c084fc; font-weight:800;">${d.total}</td>
                        <td style="text-align:right;">
                            <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="openDeviceModal('${d.mac}')" title="Configurar IP fixo e regras">
                                ⚙️ Editar
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function filterDevices(band, btn) {
            currentFilter = band;
            document.querySelectorAll('.device-tab').forEach(t => t.classList.remove('active'));
            if (btn) btn.classList.add('active');
            renderDevicesTable();
        }

        function searchDevices(val) {
            currentSearch = val;
            renderDevicesTable();
        }

        function sortDevices(val) {
            currentSort = val;
            renderDevicesTable();
        }

        // Live Clock Ticker
        function updateClock() {
            const now = new Date();
            const timeEl = document.getElementById('live_clock');
            const dateEl = document.getElementById('live_date');
            if (timeEl) timeEl.textContent = now.toLocaleTimeString('pt-BR', { hour12: false });
            if (dateEl) dateEl.textContent = now.toLocaleDateString('pt-BR');
        }
        setInterval(updateClock, 1000);
        updateClock();

        // LuCI Classic Direct Navigation
        function openClassicLuci(ev) {
            if (ev) ev.preventDefault();
            if (window.location.pathname.includes('/cgi-bin/luci')) {
                window.location.href = '/cgi-bin/luci/admin/status/overview';
            } else {
                openLuciSimulator('overview');
            }
        }

        // Action Handlers for Native LuCI Features
        function scanNeighborWifi() {
            const btn = document.getElementById('btn_wifi_scan');
            if (btn) btn.textContent = '⏳ Escaneando frequências 2.4 / 5 / 6 GHz...';
            setTimeout(() => {
                if (btn) btn.textContent = '🔍 Escanear Redes Próximas';
                showToast('✅ Varredura concluída! 4 redes detectadas. Canal 6 e 37 PSC permanecem limpos.');
            }, 1200);
        }

        function saveDhcpSettings() {
            const start = document.getElementById('dhcp_start_sel').value;
            const limit = document.getElementById('dhcp_limit_sel').value;
            const lease = document.getElementById('dhcp_time_sel').value;
            const domain = document.getElementById('dhcp_domain_sel').value;
            showToast(`✅ Servidor DHCP atualizado: Faixa .${start} (máx ${limit} IPs, lease ${lease}, domínio ${domain})`);
        }

        function openPortForwardModal() {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');
            cont.innerHTML = `
                <div class="modal-header">
                    <h3>🔀 Nova Regra de Redirecionamento de Porta (Port Forwarding)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    <!-- Presets Rápidos -->
                    <div class="form-group">
                        <label class="form-label">Preenchimento Rápido (Serviços Comuns)</label>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="fillPortPreset('Plex Server', 'TCP', '32400', '192.168.1.105', '32400')">🎬 Plex (32400)</button>
                            <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="fillPortPreset('Servidor Web', 'TCP', '8080', '192.168.1.105', '80')">🌐 Web (8080->80)</button>
                            <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="fillPortPreset('Minecraft', 'TCP+UDP', '25565', '192.168.1.144', '25565')">⛏️ Minecraft (25565)</button>
                            <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="fillPortPreset('Torrent P2P', 'TCP+UDP', '51413', '192.168.1.105', '51413')">📥 BitTorrent (51413)</button>
                            <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="fillPortPreset('SSH Externo', 'TCP', '2222', '192.168.1.105', '22')">🔒 SSH (2222->22)</button>
                        </div>
                    </div>

                    <!-- Manual Input Fields -->
                    <div class="form-group">
                        <label class="form-label">Nome da Regra</label>
                        <input type="text" class="form-input" id="pf_name" value="Servidor Local" placeholder="Ex: Servidor Plex / Câmera">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Protocolo de Transporte</label>
                        <select class="form-select" id="pf_proto">
                            <option value="TCP" selected>TCP (Web, SSH, Plex, HTTPS)</option>
                            <option value="UDP">UDP (Jogos de Baixa Latência, DNS)</option>
                            <option value="TCP+UDP">TCP + UDP (Ambos)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Porta WAN Externa (ou faixa: 3000-3050)</label>
                        <input type="text" class="form-input" id="pf_ext_port" value="8443" placeholder="Ex: 8443 ou 32400">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Endereço IP do Dispositivo na LAN (Manual)</label>
                        <input type="text" class="form-input" id="pf_int_ip" value="192.168.1.105" placeholder="Ex: 192.168.1.105">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Porta Interna de Destino</label>
                        <input type="text" class="form-input" id="pf_int_port" value="443" placeholder="Ex: 443 ou 32400">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="savePortForward()">💾 Adicionar Regra</button>
                </div>
            `;
        }

        function fillPortPreset(name, proto, ext, ip, intp) {
            document.getElementById('pf_name').value = name;
            document.getElementById('pf_proto').value = proto;
            document.getElementById('pf_ext_port').value = ext;
            document.getElementById('pf_int_ip').value = ip;
            document.getElementById('pf_int_port').value = intp;
        }

        function savePortForward() {
            const name = document.getElementById('pf_name').value;
            const proto = document.getElementById('pf_proto').value;
            const ext = document.getElementById('pf_ext_port').value;
            const ip = document.getElementById('pf_int_ip').value;
            const intp = document.getElementById('pf_int_port') ? document.getElementById('pf_int_port').value : ext;
            const tbody = document.getElementById('port_forward_tbody');
            if (tbody) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${name}</strong></td>
                    <td><span class="pill-badge pill-cyan">${proto}</span></td>
                    <td><code>${ext}</code></td>
                    <td>${ip}</td>
                    <td><code>${intp}</code></td>
                    <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                    <td style="text-align:right;"><button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deletePortRule(this)">🗑️</button></td>
                `;
                tbody.appendChild(tr);
            }
            closeModal();
            showToast(`✅ Regra "${name}" adicionada com sucesso! Porta externa ${ext} -> ${ip}:${intp}.`);
        }

        function deletePortRule(btn) {
            const row = btn.closest('tr');
            if (row) row.remove();
            showToast('🗑️ Regra de redirecionamento removida do firewall.');
        }

        function runDiagnosticTool() {
            const tool = document.getElementById('diag_tool_sel').value;
            const target = document.getElementById('diag_target_sel').value;
            const count = document.getElementById('diag_count_sel').value;
            const box = document.getElementById('diag_output_box');
            if (!box) return;

            box.innerHTML = `<div>⏳ Executando ${tool.toUpperCase()} em direção a ${target} (${count} pacotes)...</div>`;
            setTimeout(() => {
                if (tool === 'ping') {
                    box.innerHTML = `
                        <div>PING ${target} (${target}): 56 data bytes</div>
                        <div>64 bytes from ${target}: seq=0 ttl=58 time=1.842 ms</div>
                        <div>64 bytes from ${target}: seq=1 ttl=58 time=1.654 ms</div>
                        <div>64 bytes from ${target}: seq=2 ttl=58 time=1.720 ms</div>
                        <div>64 bytes from ${target}: seq=3 ttl=58 time=1.588 ms</div>
                        <div style="color:#10b981; margin-top:4px;">--- ${target} ping statistics --- ${count} packets transmitted, ${count} received, 0% packet loss</div>
                        <div style="color:#10b981;">rtt min/avg/max = 1.588/1.701/1.842 ms (Jitter: 0.12 ms)</div>
                    `;
                } else if (tool === 'traceroute') {
                    box.innerHTML = `
                        <div>traceroute to ${target} (56 bytes max, 30 hops max):</div>
                        <div> 1  192.168.73.1 (gateway)  0.284 ms  0.198 ms  0.176 ms</div>
                        <div> 2  187.54.21.1 (vivo-gpon-pe)  1.240 ms  1.180 ms  1.150 ms</div>
                        <div> 3  10.200.4.1 (backbone-sp)  1.420 ms  1.390 ms  1.380 ms</div>
                        <div> 4  ${target} (destination)  1.710 ms  1.680 ms  1.650 ms</div>
                        <div style="color:#10b981; margin-top:4px;">✅ Rota direta otimizada via IX.br São Paulo (4 saltos).</div>
                    `;
                } else {
                    box.innerHTML = `
                        <div>Server:    1.1.1.1</div>
                        <div>Address:   1.1.1.1#53</div>
                        <div style="margin-top:4px;">Non-authoritative answer:</div>
                        <div>Name:      ${target}</div>
                        <div>Address:   104.26.8.128</div>
                        <div>Address:   172.67.68.22</div>
                        <div>Address:   2606:4700:20::681a:880</div>
                        <div style="color:#10b981; margin-top:4px;">✅ Resolução IPv4 e IPv6 autoritativa concluída em 2.1 ms.</div>
                    `;
                }
            }, 800);
        }

        function copySyslogs() {
            const box = document.getElementById('syslog_box');
            if (box) {
                navigator.clipboard.writeText(box.innerText);
                showToast('📋 Logs copiados para a área de transferência!');
            }
        }

        function clearSyslogs() {
            const box = document.getElementById('syslog_box');
            if (box) {
                box.innerHTML = '<div style="color:#94a3b8;">[Buffer de log limpo pelo operador]</div>';
                showToast('🧹 Buffer de logs limpo.');
            }
        }

        function filterLogs(category, btn) {
            document.querySelectorAll('#view_doctor .ark-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            const box = document.getElementById('syslog_box');
            if (!box) return;

            if (category === 'wifi') {
                box.innerHTML = `
                    <div><span style="color:#64748b;">[14/Oct 03:42:01]</span> <span style="color:#38bdf8;">hostapd:</span> phy1-ap0: STA f4:d4:88:55:66:77 WPA: pairwise key handshake completed (WPA3-SAE)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:42:15]</span> <span style="color:#a855f7;">usteer:</span> Client 34:ab:95:11:22:33 Roam event: 5GHz -> 6GHz (RSSI: -42 dBm, 320MHz MLO link active)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:46:00]</span> <span style="color:#38bdf8;">hostapd:</span> nl80211: send_action_frame OK (BSS Transition Request 802.11v accepted)</div>
                `;
            } else if (category === 'firewall') {
                box.innerHTML = `
                    <div><span style="color:#64748b;">[14/Oct 03:45:10]</span> <span style="color:#38bdf8;">firewall:</span> fw4: 0 legacy iptables rules detected. 100% pure nftables active.</div>
                    <div><span style="color:#64748b;">[14/Oct 03:45:12]</span> <span style="color:#10b981;">nftables:</span> Table inet fw4 loaded: 14 chains, 48 rules, hardware flow offload enabled</div>
                    <div><span style="color:#64748b;">[14/Oct 03:47:00]</span> <span style="color:#eab308;">nftables:</span> DROP wan_in: probe TCP 185.220.101.5:44582 -> 187.54.21.90:23 (Telnet Scan blocked)</div>
                `;
            } else if (category === 'dhcp') {
                box.innerHTML = `
                    <div><span style="color:#64748b;">[14/Oct 03:43:00]</span> <span style="color:#10b981;">dnsmasq-dhcp[1422]:</span> DHCPACK(br-lan) 192.168.1.101 34:ab:95:11:22:33 iPhone-16-Pro-Max</div>
                    <div><span style="color:#64748b;">[14/Oct 03:43:04]</span> <span style="color:#10b981;">dnsmasq-dhcp[1422]:</span> DHCPACK(br-lan) 192.168.1.142 f4:d4:88:55:66:77 MacBook-Pro-M3-Max</div>
                `;
            } else if (category === 'kernel') {
                box.innerHTML = `
                    <div><span style="color:#64748b;">[14/Oct 03:44:05]</span> <span style="color:#10b981;">kernel:</span> [mtk_ppe] Hardware flow table offload active (PPE MT7986A, WED enabled)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:44:06]</span> <span style="color:#38bdf8;">kernel:</span> mt7915e 0000:01:00.0: Firmware init completed (Filogic Tri-Band 4x4)</div>
                `;
            } else {
                box.innerHTML = `
                    <div><span style="color:#64748b;">[14/Oct 03:42:01]</span> <span style="color:#38bdf8;">hostapd:</span> phy1-ap0: STA f4:d4:88:55:66:77 WPA: pairwise key handshake completed (WPA3-SAE)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:42:15]</span> <span style="color:#a855f7;">usteer:</span> Client 34:ab:95:11:22:33 Roam event: 5GHz -> 6GHz (RSSI: -42 dBm, 320MHz MLO link active)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:43:00]</span> <span style="color:#10b981;">dnsmasq-dhcp[1422]:</span> DHCPACK(br-lan) 192.168.1.101 34:ab:95:11:22:33 iPhone-16-Pro-Max</div>
                    <div><span style="color:#64748b;">[14/Oct 03:43:22]</span> <span style="color:#eab308;">mwan3[2104]:</span> Interface wan1 (Vivo Fibra) is online (ping: 1.8ms, packet loss: 0%)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:44:05]</span> <span style="color:#10b981;">kernel:</span> [mtk_ppe] Hardware flow table offload active (PPE MT7986A, WED enabled)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:45:10]</span> <span style="color:#38bdf8;">firewall:</span> fw4: 0 legacy iptables rules detected. 100% pure nftables active.</div>
                `;
            }
        }

        function generateConfigBackup() {
            showToast('💾 Gerando backup de configurações (/etc/config/)... O download iniciará em instantes.');
            setTimeout(() => {
                showToast('✅ Arquivo backup-ark-router-2026-10-14.tar.gz gerado com sucesso!');
            }, 1000);
        }

        function triggerSysupgradeCheck() {
            showToast('🔍 Verificando repositórios oficiais OpenWrt... Seu firmware 24.10.0 é a versão estável mais recente.');
        }

        function packageUpdateCheck() {
            showToast('🔄 Executando opkg update... Repositórios base, packages, routing e telephony sincronizados!');
        }

        function serviceAction(service, action) {
            showToast(`⚙️ Serviço ${service}: ação "${action}" executada com sucesso (/etc/init.d/${service} ${action}).`);
        }

        // =========================================================
        // OPENWRT LUCI CANONICAL SIMULATION ENGINE (20+ ROUTES)
        // =========================================================
        let currentLuciCategory = 'status';
        let currentLuciRoute = 'status/overview';

        const LUCI_SUBROUTES = {
            'status': [
                { id: 'status/overview', label: 'Visão Geral' },
                { id: 'status/routes', label: 'Rotas Kernel' },
                { id: 'status/syslog', label: 'Syslog (Sistema)' },
                { id: 'status/dmesg', label: 'Kernel Log (Dmesg)' },
                { id: 'status/processes', label: 'Processos' },
                { id: 'status/realtime', label: 'Gráficos Tempo Real' }
            ],
            'system': [
                { id: 'system/system', label: 'Propriedades & Fuso' },
                { id: 'system/admin', label: 'Administração & SSH' },
                { id: 'system/packages', label: 'Pacotes (opkg/apk)' },
                { id: 'system/startup', label: 'Inicialização (Init)' },
                { id: 'system/crontab', label: 'Tarefas (Crontab)' },
                { id: 'system/flash', label: 'Backup & Firmware' }
            ],
            'network': [
                { id: 'network/network', label: 'Interfaces' },
                { id: 'network/wireless', label: 'Wi-Fi Sem Fio' },
                { id: 'network/switch', label: 'Switch & VLANs' },
                { id: 'network/dhcp', label: 'DHCP & DNS' },
                { id: 'network/firewall', label: 'Firewall (fw4)' },
                { id: 'network/diagnostics', label: 'Diagnósticos (Ping)' },
                { id: 'network/mwan', label: 'Multi-WAN (mwan3)' },
                { id: 'network/sqm', label: 'QoS SQM (CAKE)' }
            ],
            'services': [
                { id: 'services/adblock', label: 'AdBlock DNS' },
                { id: 'services/upnp', label: 'UPnP IGD' },
                { id: 'services/ddns', label: 'DNS Dinâmico' }
            ],
            'vpn': [
                { id: 'vpn/wireguard', label: 'WireGuard Status' },
                { id: 'vpn/zerotier', label: 'ZeroTier SD-WAN' }
            ]
        };

        function toggleLuciDrawer() {
            const drawer = document.getElementById('luci_drawer');
            const backdrop = document.getElementById('luci_drawer_backdrop');
            if (!drawer || !backdrop) return;
            const isOpen = drawer.classList.contains('open');
            if (isOpen) {
                drawer.classList.remove('open');
                backdrop.classList.remove('open');
            } else {
                drawer.classList.add('open');
                backdrop.classList.add('open');
                const inp = document.getElementById('drawer_search');
                if (inp) { inp.value = ''; filterLuciDrawer(''); inp.focus(); }
            }
        }

        function filterLuciDrawer(query) {
            const term = (query || '').toLowerCase().trim();
            const links = document.querySelectorAll('#drawer_links_container .drawer-link');
            const cats = document.querySelectorAll('#drawer_links_container .drawer-category');
            
            links.forEach(el => {
                const txt = el.textContent.toLowerCase();
                el.style.display = (!term || txt.includes(term)) ? 'flex' : 'none';
            });
            cats.forEach(el => {
                el.style.display = (!term) ? 'block' : 'none';
            });
        }

        function switchLuciCategory(cat) {
            currentLuciCategory = cat;
            document.querySelectorAll('#luci_main_tabs .luci-nav-tab').forEach(el => {
                el.classList.remove('active');
            });
            const activeTab = document.getElementById('ltab_' + cat);
            if (activeTab) activeTab.classList.add('active');

            renderLuciSubnav();
            const firstSub = LUCI_SUBROUTES[cat] && LUCI_SUBROUTES[cat][0] ? LUCI_SUBROUTES[cat][0].id : cat;
            openLuciSimulator(firstSub);
        }

        function renderLuciSubnav() {
            const subnav = document.getElementById('luci_subnav_tabs');
            if (!subnav) return;
            const items = LUCI_SUBROUTES[currentLuciCategory] || [];
            subnav.innerHTML = items.map(item => `
                <a class="luci-subnav-pill ${currentLuciRoute === item.id ? 'active' : ''}" onclick="openLuciSimulator('${item.id}')">
                    ${item.label}
                </a>
            `).join('');
        }

        function openLuciSimulator(route) {
            currentLuciRoute = route;
            const container = document.getElementById('luci_native_view_container');
            const routeLabel = document.getElementById('luci_sim_current_route');
            const body = document.getElementById('luci_sim_content_body');
            
            if (!container || !body) return;
            container.classList.add('active');
            if (routeLabel) routeLabel.textContent = `Rota Original: /cgi-bin/luci/admin/${route}`;

            // Sync Category Tab
            const cat = route.split('/')[0] || 'status';
            if (cat !== currentLuciCategory) {
                currentLuciCategory = cat;
                document.querySelectorAll('#luci_main_tabs .luci-nav-tab').forEach(el => el.classList.remove('active'));
                const tab = document.getElementById('ltab_' + cat);
                if (tab) tab.classList.add('active');
            }
            renderLuciSubnav();

            // Render Views Based on Exact Route
            if (route === 'status/overview' || route === 'status' || route === 'overview') {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:8px; padding:20px; color:#fff; margin-bottom:20px;">
                        <h2 style="font-size:1.15rem; font-weight:700; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">Visão Geral do Sistema (LuCI Overview)</h2>
                        <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:10px 0; color:#9ca3af; width:220px;">Nome do Host</td><td><strong>OpenWrt</strong></td></tr>
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:10px 0; color:#9ca3af;">Modelo do Roteador</td><td>Acer Predator Connect W6x (Wi-Fi 6E / Wi-Fi 7 Ready)</td></tr>
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:10px 0; color:#9ca3af;">Arquitetura do Chip</td><td>MediaTek Filogic 830 MT7986 (ARMv8 Cortex-A53 4 núcleos @ 2.0 GHz)</td></tr>
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:10px 0; color:#9ca3af;">Versão do Firmware</td><td>OpenWrt 24.10.0 r27208 / LuCI openwrt-24.10 branch</td></tr>
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:10px 0; color:#9ca3af;">Versão do Kernel</td><td>6.6.54 (Linux SMP com aceleração nftables fw4)</td></tr>
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:10px 0; color:#9ca3af;">Hora Local</td><td>${new Date().toLocaleString('pt-BR')} (Fuso America/Sao_Paulo)</td></tr>
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:10px 0; color:#9ca3af;">Tempo Ativo (Uptime)</td><td>14 dias, 8 horas, 12 minutos</td></tr>
                            <tr><td style="padding:10px 0; color:#9ca3af;">Carga Média (Load)</td><td>0.15, 0.12, 0.08 (1, 5 e 15 minutos)</td></tr>
                        </table>
                    </div>
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:8px; padding:20px; color:#fff; margin-bottom:20px;">
                        <h2 style="font-size:1.15rem; font-weight:700; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">Memória & Armazenamento</h2>
                        <div style="margin-bottom:14px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
                                <span>Memória RAM Total (512 MB)</span>
                                <span>146 MB em uso / 366 MB livres (28%)</span>
                            </div>
                            <div style="background:#374151; height:10px; border-radius:5px; overflow:hidden;">
                                <div style="background:#10b981; width:28%; height:100%;"></div>
                            </div>
                        </div>
                        <div>
                            <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
                                <span>Armazenamento Flash Interno (/overlay 128 MB)</span>
                                <span>28.4 MB em uso / 99.6 MB livres (22%)</span>
                            </div>
                            <div style="background:#374151; height:10px; border-radius:5px; overflow:hidden;">
                                <div style="background:#38bdf8; width:22%; height:100%;"></div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (route === 'status/routes') {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:8px; padding:20px; color:#fff;">
                        <h2 style="font-size:1.15rem; font-weight:700; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">Tabela de Roteamento Kernel (IPv4 & IPv6)</h2>
                        <div style="overflow-x:auto;">
                            <table class="table" style="width:100%; font-size:0.82rem; border-collapse:collapse;">
                                <thead>
                                    <tr style="border-bottom:2px solid #374151; text-align:left; color:#9ca3af;">
                                        <th style="padding:8px;">Rede de Destino</th>
                                        <th style="padding:8px;">Gateway / Próximo Salto</th>
                                        <th style="padding:8px;">Interface</th>
                                        <th style="padding:8px;">Métrica</th>
                                        <th style="padding:8px;">Tabela</th>
                                        <th style="padding:8px;">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;"><code>default (0.0.0.0/0)</code></td>
                                        <td style="padding:8px;">100.64.12.1</td>
                                        <td style="padding:8px;"><span class="pill-badge pill-online">pppoe-wan</span></td>
                                        <td style="padding:8px;">10</td>
                                        <td style="padding:8px;">main</td>
                                        <td style="padding:8px; color:#10b981;">Ativo (mwan3 WAN1)</td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;"><code>default (0.0.0.0/0)</code></td>
                                        <td style="padding:8px;">192.168.15.1</td>
                                        <td style="padding:8px;"><span class="pill-badge pill-cyan">eth1 (WAN2)</span></td>
                                        <td style="padding:8px;">20</td>
                                        <td style="padding:8px;">main</td>
                                        <td style="padding:8px; color:#38bdf8;">Standby (mwan3 WAN2)</td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;"><code>192.168.73.0/24</code></td>
                                        <td style="padding:8px;">Direto (link local)</td>
                                        <td style="padding:8px;"><span class="pill-badge pill-online">br-lan</span></td>
                                        <td style="padding:8px;">0</td>
                                        <td style="padding:8px;">main</td>
                                        <td style="padding:8px; color:#10b981;">Rede Local LAN</td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;"><code>2804:3d90:8234:5600::/56</code></td>
                                        <td style="padding:8px;">fe80::1 (ISP Gateway)</td>
                                        <td style="padding:8px;"><span class="pill-badge pill-cyan">wan6</span></td>
                                        <td style="padding:8px;">512</td>
                                        <td style="padding:8px;">main</td>
                                        <td style="padding:8px; color:#10b981;">Prefixo Delegado IPv6</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            } else if (route === 'status/syslog') {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:8px; padding:20px; color:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">
                            <h2 style="font-size:1.15rem; font-weight:700; margin:0;">Registro de Eventos do Sistema (Syslog / logread)</h2>
                            <button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 10px;" onclick="showToast('🔄 Syslog atualizado!')">🔄 Atualizar Log</button>
                        </div>
                        <div class="luci-terminal-box">Thu Oct 15 02:40:01 2026 daemon.info netifd: Network device 'eth0' link is up (2500baseT/Full)
Thu Oct 15 02:40:02 2026 daemon.info pppd[1452]: Plugin rp-pppoe.so loaded
Thu Oct 15 02:40:02 2026 daemon.info pppd[1452]: PPP session is 4821 (0x12d5)
Thu Oct 15 02:40:02 2026 daemon.info pppd[1452]: Connected to 00:11:22:33:44:55 via interface eth0
Thu Oct 15 02:40:02 2026 daemon.info pppd[1452]: local  IP address 100.64.12.89
Thu Oct 15 02:40:02 2026 daemon.info pppd[1452]: remote IP address 100.64.12.1
Thu Oct 15 02:40:02 2026 daemon.info pppd[1452]: primary   DNS address 1.1.1.1
Thu Oct 15 02:40:02 2026 daemon.info pppd[1452]: secondary DNS address 8.8.8.8
Thu Oct 15 02:40:03 2026 daemon.info dnsmasq[1840]: started, version 2.90 cachesize 150000
Thu Oct 15 02:40:03 2026 daemon.info dnsmasq[1840]: compile time options: IPv6 GNU-getopt no-DBus UBus i18n IDN DHCP DHCPv6 Lua TFTP conntrack ipset nftset auth DNSSEC loop-detect inotify dumpfile
Thu Oct 15 02:40:04 2026 daemon.notice mwan3[2104]: Interface wan (pppoe-wan) is online
Thu Oct 15 02:40:05 2026 daemon.info hostapd: ath0: AP-STA-CONNECTED 34:ab:95:11:22:33
Thu Oct 15 02:40:05 2026 daemon.info hostapd: ath0: STA 34:ab:95:11:22:33 WPA: pairwise key handshake completed (RSN)
Thu Oct 15 02:40:06 2026 daemon.notice firewall: Reloading firewall due to ifup of wan (pppoe-wan)
Thu Oct 15 02:40:07 2026 daemon.info ark-telemetry[2480]: Hardware offload Fastpath active. CPU: 8%, Temp: 48°C</div>
                    </div>
                `;
            } else if (route === 'status/dmesg') {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:8px; padding:20px; color:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">
                            <h2 style="font-size:1.15rem; font-weight:700; margin:0;">Registro de Mensagens do Kernel (Dmesg)</h2>
                            <button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 10px;" onclick="showToast('🔄 Dmesg atualizado!')">🔄 Atualizar</button>
                        </div>
                        <div class="luci-terminal-box" style="color:#38bdf8;">[    0.000000] Linux version 6.6.54 (builder@openwrt) (gcc version 13.3.0) #0 SMP Mon Oct 12 2026
[    0.000000] Machine model: Acer Predator Connect W6x
[    0.000000] MediaTek MT7986 Filogic 830 (4 cores Cortex-A53 @ 2.0 GHz)
[    1.428109] nft_flow_offload: Hardware flow offload engine enabled via PPE
[    2.109840] mtk_soc_eth 15100000.ethernet eth0: Link is Up - 2.5Gbps/Full - flow control rx/tx
[    2.512091] mt7915e 0000:01:00.0: HW/SW Version: 0x8a108a10, Build Time: 20261012
[    2.894102] ath12k_pci 0000:02:00.0: Wi-Fi 7 BE11000 320MHz MLO calibrated successfully
[    3.109482] br-lan: port 1(eth2) entered forwarding state
[    3.109485] br-lan: port 2(eth3) entered forwarding state
[    4.209841] wireguard: WireGuard 1.0.0 loaded. Keypair handshake engine initialized</div>
                    </div>
                `;
            } else if (route === 'status/processes') {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:8px; padding:20px; color:#fff;">
                        <h2 style="font-size:1.15rem; font-weight:700; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">Processos Ativos do Sistema</h2>
                        <div style="overflow-x:auto;">
                            <table class="table" style="width:100%; font-size:0.82rem; border-collapse:collapse;">
                                <thead>
                                    <tr style="border-bottom:2px solid #374151; text-align:left; color:#9ca3af;">
                                        <th style="padding:8px;">PID</th>
                                        <th style="padding:8px;">Usuário</th>
                                        <th style="padding:8px;">Comando / Processo</th>
                                        <th style="padding:8px;">CPU %</th>
                                        <th style="padding:8px;">Memória %</th>
                                        <th style="padding:8px; text-align:right;">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;">1</td><td style="padding:8px;">root</td><td style="padding:8px;"><code>/sbin/init</code></td><td style="padding:8px;">0.0%</td><td style="padding:8px;">0.4%</td>
                                        <td style="padding:8px; text-align:right;"><span style="color:#64748b; font-size:0.75rem;">Protegido</span></td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;">780</td><td style="padding:8px;">root</td><td style="padding:8px;"><code>/sbin/ubusd</code></td><td style="padding:8px;">0.1%</td><td style="padding:8px;">0.3%</td>
                                        <td style="padding:8px; text-align:right;"><span style="color:#64748b; font-size:0.75rem;">Protegido</span></td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;">1420</td><td style="padding:8px;">dnsmasq</td><td style="padding:8px;"><code>/usr/sbin/dnsmasq -C /var/etc/dnsmasq.conf</code></td><td style="padding:8px;">0.2%</td><td style="padding:8px;">2.1%</td>
                                        <td style="padding:8px; text-align:right;"><button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:3px 8px;" onclick="showToast('🔄 dnsmasq reiniciado com sucesso!')">🔄 SIGHUP</button></td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;">2104</td><td style="padding:8px;">root</td><td style="padding:8px;"><code>/usr/sbin/mwan3 track</code></td><td style="padding:8px;">0.1%</td><td style="padding:8px;">0.6%</td>
                                        <td style="padding:8px; text-align:right;"><button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:3px 8px;" onclick="showToast('🔄 mwan3 track reiniciado!')">🔄 SIGHUP</button></td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;">2480</td><td style="padding:8px;">root</td><td style="padding:8px;"><code>/usr/sbin/ark-telemetry-daemon</code></td><td style="padding:8px;">0.4%</td><td style="padding:8px;">0.8%</td>
                                        <td style="padding:8px; text-align:right;"><button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:3px 8px;" onclick="showToast('🔄 Telemetria reiniciada!')">🔄 SIGHUP</button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            } else if (route === 'status/realtime') {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:8px; padding:20px; color:#fff;">
                        <h2 style="font-size:1.15rem; font-weight:700; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">Gráficos em Tempo Real (Carga & Tráfego)</h2>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
                            <div style="background:#111827; border:1px solid #374151; border-radius:6px; padding:16px;">
                                <h4 style="margin:0 0 10px 0; font-size:0.9rem; color:#38bdf8;">Carga do Processador (Load Average)</h4>
                                <div style="font-size:1.8rem; font-weight:800; color:#10b981;">0.15 <span style="font-size:0.8rem; color:#9ca3af; font-weight:400;">(4 vCPUs)</span></div>
                                <p style="font-size:0.78rem; color:#94a3b8; margin:6px 0 0 0;">Utilização tranquila com aceleração por hardware MediaTek PPE.</p>
                            </div>
                            <div style="background:#111827; border:1px solid #374151; border-radius:6px; padding:16px;">
                                <h4 style="margin:0 0 10px 0; font-size:0.9rem; color:#c084fc;">Tráfego Acumulado (WAN 1)</h4>
                                <div style="font-size:1.8rem; font-weight:800; color:#fff;">245.1 <span style="font-size:0.8rem; color:#9ca3af; font-weight:400;">GB recebidos</span></div>
                                <p style="font-size:0.78rem; color:#94a3b8; margin:6px 0 0 0;">Velocidade atual: 84.5 Mbps download / 12.4 Mbps upload.</p>
                            </div>
                            <div style="background:#111827; border:1px solid #374151; border-radius:6px; padding:16px;">
                                <h4 style="margin:0 0 10px 0; font-size:0.9rem; color:#fbbf24;">Tabela de Conexões (Conntrack)</h4>
                                <div style="font-size:1.8rem; font-weight:800; color:#fbbf24;">620 <span style="font-size:0.8rem; color:#9ca3af; font-weight:400;">/ 65.536 conexões</span></div>
                                <p style="font-size:0.78rem; color:#94a3b8; margin:6px 0 0 0;">0.9% de ocupação da tabela de estados do firewall nftables.</p>
                            </div>
                        </div>
                    </div>
                `;
            } else if (route === 'network/network') {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:8px; padding:20px; color:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">
                            <h2 style="font-size:1.15rem; font-weight:700; margin:0;">Configuração de Interfaces de Rede (UCI network)</h2>
                            <button class="ark-btn ark-btn-primary" style="font-size:0.78rem;" onclick="openModal('setup')">⚡ Assistente WAN</button>
                        </div>
                        <div style="overflow-x:auto;">
                            <table class="table" style="width:100%; font-size:0.82rem; border-collapse:collapse;">
                                <thead>
                                    <tr style="border-bottom:2px solid #374151; text-align:left; color:#9ca3af;">
                                        <th style="padding:8px;">Interface</th>
                                        <th style="padding:8px;">Dispositivo Físico</th>
                                        <th style="padding:8px;">Protocolo & Endereço IP</th>
                                        <th style="padding:8px;">Tráfego (RX / TX)</th>
                                        <th style="padding:8px; text-align:right;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;"><span class="pill-badge pill-online">LAN</span></td>
                                        <td style="padding:8px;"><code>br-lan</code></td>
                                        <td style="padding:8px;">Estático: <strong>192.168.73.1/24</strong><br><span style="font-size:0.75rem; color:#94a3b8;">IPv6: fd73:ark::1/64</span></td>
                                        <td style="padding:8px;">84.2 GB / 112.8 GB</td>
                                        <td style="padding:8px; text-align:right;">
                                            <button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="showToast('⚙️ Abrindo edição da interface LAN...')">Editar</button>
                                        </td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;"><span class="pill-badge pill-online">WAN 1</span></td>
                                        <td style="padding:8px;"><code>eth0 (2.5G)</code></td>
                                        <td style="padding:8px;">PPPoE: <strong>100.64.12.89</strong> (MTU 1492)<br><span style="font-size:0.75rem; color:#94a3b8;">Gateway: 100.64.12.1</span></td>
                                        <td style="padding:8px;">245.1 GB / 68.4 GB</td>
                                        <td style="padding:8px; text-align:right;">
                                            <button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="openModal('wan1')">Editar</button>
                                            <button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="showToast('🔄 Interface WAN reconectando...')">Reconectar</button>
                                        </td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;"><span class="pill-badge pill-cyan">WAN 2</span></td>
                                        <td style="padding:8px;"><code>eth1 (1G)</code></td>
                                        <td style="padding:8px;">DHCP: <strong>192.168.15.50/24</strong> (MTU 1500)<br><span style="font-size:0.75rem; color:#94a3b8;">Gateway: 192.168.15.1</span></td>
                                        <td style="padding:8px;">18.2 GB / 4.1 GB</td>
                                        <td style="padding:8px; text-align:right;">
                                            <button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="openModal('wan2')">Editar</button>
                                        </td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;"><span class="pill-badge pill-cyan">WAN6</span></td>
                                        <td style="padding:8px;"><code>pppoe-wan</code></td>
                                        <td style="padding:8px;">DHCPv6 SLAAC: <strong>2804:3d90:8234:5600::1/64</strong><br><span style="font-size:0.75rem; color:#94a3b8;">Prefixo: 2804:3d90:8234:5600::/56</span></td>
                                        <td style="padding:8px;">Sincronizado</td>
                                        <td style="padding:8px; text-align:right;">
                                            <button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="showToast('⚙️ Configuração IPv6')">Editar</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            } else if (route === 'network/wireless') {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:8px; padding:20px; color:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">
                            <h2 style="font-size:1.15rem; font-weight:700; margin:0;">Dispositivos Sem Fio & Pontos de Acesso (Wi-Fi 7 / 6E)</h2>
                            <button class="ark-btn ark-btn-secondary" style="font-size:0.78rem;" onclick="scanNeighborWifi()" id="btn_wifi_scan">🔍 Escanear Redes Próximas</button>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:16px;">
                            <div style="background:#111827; border:1px solid #374151; border-radius:6px; padding:16px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <h4 style="margin:0; font-size:0.95rem; color:#fff;">Generic 802.11ax/be (radio0 — 2.4 GHz)</h4>
                                    <span class="pill-badge pill-online">ATIVO • 20 dBm (100 mW)</span>
                                </div>
                                <div style="font-size:0.82rem; color:#cbd5e1;">Canal 6 (2.437 GHz) | Largura: 40 MHz | SSID: <strong>Ark-Router-2.4G</strong> | Segurança: WPA2/WPA3 Personal</div>
                            </div>
                            <div style="background:#111827; border:1px solid #374151; border-radius:6px; padding:16px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <h4 style="margin:0; font-size:0.95rem; color:#fff;">Generic 802.11ax/be (radio1 — 5 GHz)</h4>
                                    <span class="pill-badge pill-online">ATIVO • 24 dBm (250 mW)</span>
                                </div>
                                <div style="font-size:0.82rem; color:#cbd5e1;">Canal 36 (5.180 GHz) | Largura: 160 MHz | SSID: <strong>Ark-Router-5G</strong> | Segurança: WPA3 Personal (SAE)</div>
                            </div>
                            <div style="background:#111827; border:1px solid #374151; border-radius:6px; padding:16px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <h4 style="margin:0; font-size:0.95rem; color:#fff;">Qualcomm / MediaTek Wi-Fi 7 BE11000 (radio2 — 6 GHz)</h4>
                                    <span class="pill-badge pill-online" style="background:rgba(192,132,252,0.2); color:#c084fc; border:1px solid rgba(192,132,252,0.4);">WI-FI 7 ATIVO • 320 MHz</span>
                                </div>
                                <div style="font-size:0.82rem; color:#cbd5e1;">Canal 37 PSC (6.135 GHz) | Largura: 320 MHz Puro | SSID: <strong>Ark-Router-6G-Pro</strong> | Segurança: WPA3 SAE Exclusivo</div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (route === 'network/diagnostics') {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:8px; padding:20px; color:#fff;">
                        <h2 style="font-size:1.15rem; font-weight:700; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">Diagnósticos de Conectividade de Rede</h2>
                        <div style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap;">
                            <input type="text" id="diag_host" value="1.1.1.1" placeholder="Endereço IP ou Host (ex: 8.8.8.8)" style="background:#111827; border:1px solid #374151; color:#fff; padding:8px 14px; border-radius:6px; font-size:0.88rem; min-width:200px;">
                            <button class="ark-btn ark-btn-primary" onclick="runPingDiagnostic()">Executar Ping</button>
                            <button class="ark-btn ark-btn-secondary" onclick="runTracerouteDiagnostic()">Traceroute</button>
                            <button class="ark-btn ark-btn-secondary" onclick="runNslookupDiagnostic()">Nslookup</button>
                        </div>
                        <div class="luci-terminal-box" id="diag_output">Aguardando comando de diagnóstico... Clique em 'Executar Ping' para testar a latência do gateway e da internet.</div>
                    </div>
                `;
            } else if (route === 'system/packages') {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:8px; padding:20px; color:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px; flex-wrap:wrap; gap:8px;">
                            <h2 style="font-size:1.15rem; font-weight:700; margin:0;">Gerenciador de Pacotes de Software (opkg / apk)</h2>
                            <button class="ark-btn ark-btn-primary" style="font-size:0.78rem;" onclick="packageUpdateCheck()">🔄 Atualizar Listas (opkg update)</button>
                        </div>
                        <input type="text" placeholder="Filtrar pacotes instalados..." oninput="filterPackagesTable(this.value)" style="width:100%; background:#111827; border:1px solid #374151; color:#fff; padding:8px 12px; border-radius:6px; font-size:0.85rem; margin-bottom:14px; box-sizing:border-box;">
                        <div style="overflow-x:auto;">
                            <table class="table" style="width:100%; font-size:0.82rem; border-collapse:collapse;" id="pkgs_table">
                                <thead>
                                    <tr style="border-bottom:2px solid #374151; text-align:left; color:#9ca3af;">
                                        <th style="padding:8px;">Nome do Pacote</th>
                                        <th style="padding:8px;">Versão Instalada</th>
                                        <th style="padding:8px;">Tamanho</th>
                                        <th style="padding:8px;">Descrição</th>
                                        <th style="padding:8px; text-align:right;">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;"><strong>luci-app-ark-router</strong></td><td style="padding:8px;">1.5.17-r1</td><td style="padding:8px;">713 KB</td><td>Tema Ark, daemons de telemetria e dashboard responsivo</td>
                                        <td style="padding:8px; text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;"><strong>kmod-sched-cake</strong></td><td style="padding:8px;">6.6.54-1</td><td style="padding:8px;">84 KB</td><td>Módulo de kernel CAKE para eliminação de Bufferbloat</td>
                                        <td style="padding:8px; text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;"><strong>mwan3</strong></td><td style="padding:8px;">2.11.4-1</td><td style="padding:8px;">42 KB</td><td>Gerenciador e balanceador de carga Multi-WAN</td>
                                        <td style="padding:8px; text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #374151;">
                                        <td style="padding:8px;"><strong>wireguard-tools</strong></td><td style="padding:8px;">1.0.20210914-2</td><td style="padding:8px;">36 KB</td><td>Utilitários de configuração para túneis WireGuard</td>
                                        <td style="padding:8px; text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            } else {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:8px; padding:20px; color:#fff;">
                        <h2 style="font-size:1.15rem; font-weight:700; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">Configuração LuCI: ${route}</h2>
                        <p style="font-size:0.9rem; color:#cbd5e1; line-height:1.5;">
                            Esta rota nativa do OpenWrt LuCI (<code>/cgi-bin/luci/admin/${route}</code>) está simulada com perfeição. Todos os menus, sub-menus e categorias da arquitetura LuCI moderna estão mapeados.
                        </p>
                        <div style="margin-top:20px;">
                            <button class="ark-btn ark-btn-primary" onclick="showToast('✅ Configurações salvas e aplicadas na rota ${route}!')">Salvar & Aplicar</button>
                            <button class="ark-btn ark-btn-secondary" onclick="showToast('Ajustes descartados.')">Descartar</button>
                        </div>
                    </div>
                `;
            }
        }

        function runPingDiagnostic() {
            const host = document.getElementById('diag_host') ? document.getElementById('diag_host').value.trim() : '1.1.1.1';
            const out = document.getElementById('diag_output');
            if (out) {
                out.textContent = `PING ${host} (${host}) 56(84) bytes of data.
`;
                setTimeout(() => {
                    out.textContent += `64 bytes from ${host}: icmp_seq=1 ttl=58 time=0.812 ms
`;
                }, 300);
                setTimeout(() => {
                    out.textContent += `64 bytes from ${host}: icmp_seq=2 ttl=58 time=0.795 ms
`;
                }, 600);
                setTimeout(() => {
                    out.textContent += `64 bytes from ${host}: icmp_seq=3 ttl=58 time=0.840 ms
`;
                }, 900);
                setTimeout(() => {
                    out.textContent += `64 bytes from ${host}: icmp_seq=4 ttl=58 time=0.801 ms

--- ${host} ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 0.795/0.812/0.840/0.017 ms
`;
                    showToast(`✅ Ping para ${host}: 4 pacotes respondidos com sucesso (RTT médio: 0.81 ms)!`);
                }, 1200);
            }
        }

        function runTracerouteDiagnostic() {
            const host = document.getElementById('diag_host') ? document.getElementById('diag_host').value.trim() : '1.1.1.1';
            const out = document.getElementById('diag_output');
            if (out) {
                out.textContent = `traceroute to ${host} (1.1.1.1), 30 hops max, 38 byte packets
 1  100.64.12.1 (100.64.12.1)  1.214 ms  1.109 ms  1.082 ms
 2  10.200.0.1 (10.200.0.1)  2.410 ms  2.380 ms  2.401 ms
 3  one.one.one.one (1.1.1.1)  3.840 ms  3.812 ms  3.790 ms
`;
                showToast(`✅ Traceroute para ${host} concluído em 3 saltos!`);
            }
        }

        function runNslookupDiagnostic() {
            const host = document.getElementById('diag_host') ? document.getElementById('diag_host').value.trim() : 'one.one.one.one';
            const out = document.getElementById('diag_output');
            if (out) {
                out.textContent = `Server:    127.0.0.1
Address 1: 127.0.0.1 localhost

Name:      ${host}
Address 1: 1.1.1.1 one.one.one.one
Address 2: 1.0.0.1 one.one.one.one
Address 3: 2606:4700:4700::1111
Address 4: 2606:4700:4700::1001
`;
                showToast(`✅ Resolução DNS para ${host} resolvida em 0.0 ms via RAM cache!`);
            }
        }

        function filterPackagesTable(q) {
            const term = (q || '').toLowerCase();
            const rows = document.querySelectorAll('#pkgs_table tbody tr');
            rows.forEach(r => {
                const txt = r.textContent.toLowerCase();
                r.style.display = (!term || txt.includes(term)) ? '' : 'none';
            });
        }

        function closeLuciSimulator() {
            const container = document.getElementById('luci_native_view_container');
            if (container) container.classList.remove('active');
        }

        function switchLuciTab(tab) {
            openLuciSimulator(tab);
        }

        // Modals with 100% Selects
        function openModal(type, extraArg) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');

            if (type === 'setup') {
                renderEzSetupModal(cont);
            } else if (type === 'plugins') {
                renderPluginsCentralModal(cont);
            } else if (type === 'pkg_install') {
                renderPackageInstallModal(cont, extraArg);
            } else if (type === 'upnp') {
                renderUpnpModal(cont);
            } else if (type === 'mwan3') {
                renderMwan3Modal(cont);
            } else if (type === 'zerotier') {
                renderZeroTierModal(cont);
            } else if (type === 'speedify') {
                renderSpeedifyModal(cont);
            } else if (type === 'wifi') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>📶 Configurar Redes Wi-Fi (2.4 GHz, 5 GHz & Wi-Fi 7 6 GHz)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <!-- Unified vs Split SSID Option from V1 -->
                        <div style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; margin-bottom:14px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong style="color:#fff; font-size:0.88rem;">Separar Nomes por Frequência (2.4G / 5G / 6G)</strong>
                                    <div style="font-size:0.75rem; color:#94a3b8;">Desative para usar Smart Connect (SSID único com troca suave entre bandas)</div>
                                </div>
                                <label class="ark-switch">
                                    <input type="checkbox" id="m_wifi_split_toggle" onchange="toggleWifiSplitFields(this.checked)">
                                    <span class="ark-slider"></span>
                                </label>
                            </div>
                        </div>

                        <!-- Unified SSID Fields -->
                        <div id="wifi_unified_fields">
                            <div class="form-group">
                                <label class="form-label">Nome da Rede Wi-Fi Unificada (SSID)</label>
                                <input type="text" class="form-input" id="m_wifi_ssid" value="Wi-Fi-H&R" maxlength="32">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Senha de Acesso (Mínimo 8 dígitos)</label>
                                <div style="display:flex; gap:8px;">
                                    <input type="password" class="form-input" id="m_wifi_pass" value="MinhaSenhaForte2026" maxlength="63">
                                    <button type="button" class="ark-btn ark-btn-secondary" onclick="togglePassVisibility('m_wifi_pass', this)">👁️ Ver</button>
                                </div>
                            </div>
                        </div>

                        <!-- Split SSID Fields -->
                        <div id="wifi_split_fields" style="display:none; flex-direction:column; gap:12px;">
                            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:10px;">
                                <label class="form-label" style="color:#38bdf8;">Rádio 2.4 GHz (Maior Alcance)</label>
                                <input type="text" class="form-input" id="m_wifi_ssid_2g" value="Wi-Fi-H&R-2.4G" placeholder="Nome 2.4G" style="margin-bottom:6px;">
                                <input type="password" class="form-input" id="m_wifi_pass_2g" value="MinhaSenhaForte2026" placeholder="Senha 2.4G">
                            </div>
                            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:10px;">
                                <label class="form-label" style="color:#c084fc;">Rádio 5 GHz (Alta Velocidade 160 MHz)</label>
                                <input type="text" class="form-input" id="m_wifi_ssid_5g" value="Wi-Fi-H&R-5G" placeholder="Nome 5G" style="margin-bottom:6px;">
                                <input type="password" class="form-input" id="m_wifi_pass_5g" value="MinhaSenhaForte2026" placeholder="Senha 5G">
                            </div>
                            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:10px;">
                                <label class="form-label" style="color:#10b981;">Rádio 6 GHz (Wi-Fi 7 BE11000 320 MHz)</label>
                                <input type="text" class="form-input" id="m_wifi_ssid_6g" value="Wi-Fi-H&R-6G-Pro" placeholder="Nome 6G" style="margin-bottom:6px;">
                                <input type="password" class="form-input" id="m_wifi_pass_6g" value="MinhaSenhaForte2026" placeholder="Senha 6G (WPA3 SAE Obrigatório)">
                            </div>
                        </div>

                        <!-- Security & Advanced Toggles -->
                        <div class="form-group" style="margin-top:12px;">
                            <label class="form-label">Criptografia & Blindagem</label>
                            <select class="form-select" id="m_wifi_crypto">
                                <option value="mixed" selected>WPA3-SAE / WPA2-PSK Misto + PMF (Recomendado para Compatibilidade)</option>
                                <option value="sae">WPA3-SAE Puro (Exclusivo Wi-Fi 6E/7 — Máxima Segurança)</option>
                                <option value="psk2">WPA2-PSK Legado (Apenas Dispositivos Antigos)</option>
                            </select>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" id="m_wifi_roaming" checked>
                                <span>Ativar Roaming Rápido 802.11k/v (BSS Transition + RNR Co-located)</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" id="m_wifi_bss_color" checked>
                                <span>Ativar BSS Coloring (Eliminação de interferência de redes vizinhas)</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" id="m_wifi_hide_ssid">
                                <span>Ocultar Nome da Rede (Hidden SSID / Broadcast desativado)</span>
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveWifiModal()">💾 Atualizar Redes Wi-Fi</button>
                    </div>
                `;


            } else if (type === 'sqm') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>⚡ Calibrar SQM CAKE & Eliminação de Bufferbloat</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <!-- Fast.com direct button from V1 -->
                        <div style="background:rgba(56, 189, 248, 0.1); border:1px solid rgba(56, 189, 248, 0.25); border-radius:8px; padding:12px; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between;">
                            <div>
                                <strong style="color:#fff; font-size:0.88rem;">Medição Precisa de Velocidade</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Recomendamos medir a velocidade real antes de aplicar os limites do CAKE</div>
                            </div>
                            <button type="button" class="ark-btn ark-btn-cyan" style="font-size:0.8rem; padding:6px 12px;" onclick="window.open('https://fast.com', '_blank')">🎬 Medir no Fast.com ↗</button>
                        </div>

                        <!-- Manual Bandwidth Inputs (V1 Mandatory) -->
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                            <div class="form-group">
                                <label class="form-label">Velocidade de Download (Mbps)</label>
                                <input type="number" class="form-input" id="m_sqm_down" value="850" min="1" max="10000" step="1" placeholder="Ex: 850">
                                <small style="color:#94a3b8; font-size:0.72rem;">Configure 90% a 95% do plano contratado</small>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Velocidade de Upload (Mbps)</label>
                                <input type="number" class="form-input" id="m_sqm_up" value="450" min="1" max="10000" step="1" placeholder="Ex: 450">
                                <small style="color:#94a3b8; font-size:0.72rem;">Evita fila de saída saturada</small>
                            </div>
                        </div>

                        <!-- Quick Presets -->
                        <div class="form-group">
                            <label class="form-label">Preenchimento Rápido por Perfil (Presets)</label>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="setSqmValues(1000, 500)">1 Gbps / 500M</button>
                                <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="setSqmValues(850, 450)">850M / 450M</button>
                                <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="setSqmValues(600, 300)">600M / 300M</button>
                                <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="setSqmValues(300, 150)">300M / 150M</button>
                                <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="setSqmValues(100, 50)">100M / 50M</button>
                            </div>
                        </div>

                        <!-- Algorithm Qdisc -->
                        <div class="form-group">
                            <label class="form-label">Algoritmo Ativo de Fila (Qdisc)</label>
                            <select class="form-select" id="m_sqm_qdisc">
                                <option value="cake" selected>CAKE — Common Applications Kept Enhanced (Recomendado OpenWrt Moderno)</option>
                                <option value="fq_codel">FQ-CoDel — Fair Queueing Controlled Delay</option>
                            </select>
                        </div>

                        <!-- Framing / Overhead -->
                        <div class="form-group">
                            <label class="form-label">Enquadramento de Camada Física (Overhead)</label>
                            <div style="display:flex; gap:8px;">
                                <select class="form-select" id="m_sqm_overhead_sel" onchange="document.getElementById('m_sqm_overhead').value = this.value" style="flex:2;">
                                    <option value="44" selected>Fibra Óptica FTTH / GPON (44 bytes de overhead)</option>
                                    <option value="18">Ethernet Pura / Switch (18 bytes)</option>
                                    <option value="34">VDSL2 PTM (34 bytes)</option>
                                    <option value="0">Desativar Compensação (0 bytes)</option>
                                </select>
                                <input type="number" class="form-input" id="m_sqm_overhead" value="44" placeholder="Bytes" style="flex:1;">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveSqmModal()">💾 Salvar Calibração SQM</button>
                    </div>
                `;

            } else if (type === 'reboot') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3 style="color:#f43f5e;">⚠️ Reinicialização Segura do Sistema</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size:0.88rem; color:#cbd5e1; line-height:1.5;">
                            Deseja reiniciar o roteador agora? Todos os 34 aparelhos conectados serão temporariamente desconectados durante 45 segundos.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-danger" id="btn_confirm_reboot" onclick="executeReboot()">
                            🔄 Reiniciar Agora (Aguarde 2s)
                        </button>
                    </div>
                `;
                setTimeout(() => {
                    const btn = document.getElementById('btn_confirm_reboot');
                    if (btn) btn.textContent = '🔄 Confirmar e Reiniciar';
                }, 2000);
            } else if (type === 'wifi_qr') {
                renderWifiQrModal(extraArg || 'main');
            } else if (type === 'add_wifi_network') {
                renderAddWifiNetworkModal(extraArg);

            } else if (type === 'wps') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>🤝 Conectar Dispositivo por WPS (Push Button)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body" style="text-align:center;">
                        <p style="font-size:0.85rem; color:#cbd5e1; line-height:1.5;">
                            Pressione o botão virtual abaixo e, em seguida, pressione o botão WPS na sua impressora ou TV dentro de 2 minutos.
                        </p>
                        <div style="padding:20px 0;">
                            <button class="ark-btn ark-btn-primary" style="padding:14px 28px; font-size:1.05rem;" onclick="closeModal(); showToast('🤝 Pareamento WPS PBC ativado por 120s!')">
                                🔘 Iniciar Pareamento WPS (2 min)
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button></div>
                `;
            } else if (type === 'theme_picker') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>🎨 Personalização Visual & Marca do Painel (White-Label)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Título / Nome do Roteador no Cabeçalho</label>
                            <input type="text" class="form-input" id="m_theme_brand_name" value="ARK Router" maxlength="40" placeholder="Nome personalizado">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Paleta de Cores e Estilo Visual</label>
                            <select class="form-select" id="m_theme_preset" onchange="applyThemePreset(this.value)">
                                <option value="cyan" selected>ARK Flagship Cyan & Deep Blue (Padrão)</option>
                                <option value="rog">Predator Gamer Red & Carbon (ASUS ROG)</option>
                                <option value="emerald">Cyber Emerald Green</option>
                                <option value="purple">Quantum Purple & Violet</option>
                                <option value="custom">Personalizado (Escolher Cores Manualmente)</option>
                            </select>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:10px;">
                            <div class="form-group">
                                <label class="form-label">Cor Primária de Destaque</label>
                                <input type="color" class="form-input" id="m_theme_color_primary" value="#0284c7" style="height:44px; padding:2px 6px; cursor:pointer;">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Cor Secundária de Gradiente</label>
                                <input type="color" class="form-input" id="m_theme_color_secondary" value="#38bdf8" style="height:44px; padding:2px 6px; cursor:pointer;">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveThemeCustomization()">💾 Salvar e Aplicar Tema</button>
                    </div>
                `;
            } else if (type === 'op_mode') {
                const currentOp = window.currentOperationMode || 'gateway';
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>🌐 Modo de Operação do Roteador</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Perfil de Topologia de Rede</label>
                            <select class="form-select" id="m_op_mode" onchange="onOpModeChange(this.value)">
                                <option value="gateway" ${currentOp === 'gateway' ? 'selected' : ''}>🌐 Roteador Gateway Principal (NAT + Firewall + Dual-WAN + DHCP)</option>
                                <option value="ap" ${currentOp === 'ap' ? 'selected' : ''}>📡 Ponto de Acesso / AP Secundário (Ponte Transparente sem Duplo NAT)</option>
                                <option value="mesh" ${currentOp === 'mesh' ? 'selected' : ''}>📶 Nó Repetidor Mesh 802.11s (Extensor Wi-Fi Sincronizado)</option>
                            </select>
                        </div>
                        <div id="ap_extra_settings" style="display:${currentOp === 'ap' ? 'block' : 'none'}; background:rgba(0,0,0,0.25); border-radius:8px; padding:12px; margin-bottom:12px;">
                            <div class="form-group">
                                <label class="form-label">Atribuição de Endereço IP do AP na LAN</label>
                                <select class="form-select" id="m_ap_ip_mode">
                                    <option value="dhcp" selected>Cliente DHCP Automático (Recomendado)</option>
                                    <option value="static">IP Estático Fixo (192.168.1.2)</option>
                                </select>
                            </div>
                            <div style="font-size:0.8rem; color:#f59e0b; line-height:1.4;">
                                ⚠️ No modo Ponto de Acesso (AP), o servidor DHCP local e o Firewall NAT são desativados para evitar Duplo NAT (Double NAT). As portas WAN passam a funcionar como portas LAN adicionais.
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Isolamento de Clientes Wi-Fi (AP Isolation)</label>
                            <select class="form-select" id="m_ap_isolate">
                                <option value="0" selected>Desativado (Dispositivos na rede enxergam uns aos outros, AirPlay/Chromecast OK)</option>
                                <option value="1">Ativado (Isolamento total entre aparelhos sem fio - Máxima Privacidade)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveOpModeModal()">💾 Aplicar Modo de Operação</button>
                    </div>
                `;
            } else if (type === 'gamer_mode') {
                const isGamer = window.isGamerActive || false;
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3 style="color:#f43f5e;">🎮 Modo Gamer Ultra — Otimização de Baixa Latência</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size:0.85rem; color:#cbd5e1; line-height:1.5; margin-bottom:14px;">
                            O Modo Gamer programa o escalonador SQM CAKE com marcação <strong>DSCP Expedited Forwarding (EF / CS4)</strong>, priorizando pacotes de jogos multiplayer (PUBG, Valorant, Warzone, CS2, FIFA) antes de qualquer tráfego pesado de streaming ou download.
                        </p>
                        <div class="form-group">
                            <label class="form-label">Status do Perfil Gamer</label>
                            <select class="form-select" id="m_gamer_status">
                                <option value="1" ${isGamer ? 'selected' : ''}>🎮 ATIVADO — Modo Gamer Ultra (0.2 ms Latência de Fila)</option>
                                <option value="0" ${!isGamer ? 'selected' : ''}>Desativado — Modo Padrão Equilibrado</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Host ou Console Principal Prioritário</label>
                            <select class="form-select" id="m_gamer_host">
                                <option value="ps5" selected>PlayStation-5-Pro (192.168.1.189 - Cabo LAN 2.5G)</option>
                                <option value="xbox">Xbox-Series-X (192.168.1.188 - Wi-Fi 5G)</option>
                                <option value="dell">Notebook-Dell-XPS (192.168.1.144 - PC Gamer)</option>
                                <option value="switch">Nintendo-Switch-OLED (192.168.1.192)</option>
                                <option value="all">Priorizar Qualquer Aparelho com Tráfego UDP de Jogos</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Compensação de Jitter e Bufferbloat</label>
                            <select class="form-select" id="m_gamer_queue">
                                <option value="diffserv4" selected>CAKE DiffServ4 (Voz/Jogos > Vídeo > Best Effort > Background)</option>
                                <option value="fq_codel">FQ-CoDel com ECN Ativo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Reserva Mínima de Banda para Jogos</label>
                            <select class="form-select" id="m_gamer_bw">
                                <option value="30" selected>30% de Banda Exclusiva Garantida (Zero Oscilação)</option>
                                <option value="50">50% de Banda Exclusiva (Competitivo / Torneios)</option>
                                <option value="15">15% de Banda (Uso Moderado)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-danger" onclick="saveGamerModeModal()">💾 Salvar Perfil Gamer</button>
                    </div>
                `;
            } else if (type === 'language') {
                const currentLang = window.currentLang || 'pt-br';
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>🌐 Selecionar Idioma da Interface (Language)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Idioma da Interface LuCI e ARK OS</label>
                            <select class="form-select" id="m_lang_sel">
                                <option value="pt-br" ${currentLang === 'pt-br' ? 'selected' : ''}>🇧🇷 Português do Brasil (PT-BR) — Padrão Oficial</option>
                                <option value="en" ${currentLang === 'en' ? 'selected' : ''}>🇺🇸 English (EN) — International Standard</option>
                                <option value="es" ${currentLang === 'es' ? 'selected' : ''}>🇪🇸 Español (ES) — Neutro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fuso Horário Regional (Timezone)</label>
                            <select class="form-select" id="m_lang_tz">
                                <option value="America/Sao_Paulo" selected>América / São Paulo (Horário de Brasília - UTC-3)</option>
                                <option value="America/Manaus">América / Manaus (Amazonas - UTC-4)</option>
                                <option value="America/New_York">América / New York (Eastern Time - UTC-5)</option>
                                <option value="Europe/Madrid">Europa / Madrid (UTC+1)</option>
                            </select>
                        </div>
                        <p style="font-size:0.8rem; color:#94a3b8; line-height:1.4;">
                            O ARK Router compila os catálogos GNU gettext (.po / .mo) diretamente na ROM. A troca de idioma não reinicia os serviços de internet.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveLanguageModal()">💾 Salvar Preferência</button>
                    </div>
                `;
            } else if (type === 'clock') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>⏰ Configuração de Relógio, Fuso & Servidores NTP</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Servidor NTP de Sincronização Principal</label>
                            <select class="form-select" id="m_ntp_server">
                                <option value="pool.ntp.br" selected>pool.ntp.br (a.ntp.br / b.ntp.br - Observatório Nacional NIC.br)</option>
                                <option value="time.cloudflare.com">time.cloudflare.com (Cloudflare NTS Anycast SP)</option>
                                <option value="time.google.com">time.google.com (Google Public Time)</option>
                                <option value="time.apple.com">time.apple.com (Apple Network Time)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fuso Horário do Roteador (Timezone)</label>
                            <select class="form-select" id="m_clock_tz">
                                <option value="America/Sao_Paulo" selected>América / São Paulo (UTC-3 - Brasília)</option>
                                <option value="America/Noronha">Fernando de Noronha (UTC-2)</option>
                                <option value="America/Cuiaba">Cuiabá / Campo Grande (UTC-4)</option>
                                <option value="America/Rio_Branco">Rio Branco (Acre - UTC-5)</option>
                            </select>
                        </div>
                        <div style="background:rgba(0,0,0,0.25); border-radius:8px; padding:12px; margin-bottom:12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong style="color:#fff; font-size:0.88rem;">Preservador Fake RTC (/etc/fake-rtc)</strong>
                                    <div style="font-size:0.75rem; color:#94a3b8;">Salva timestamp a cada 60s para evitar que o relógio volte para 1970 em quedas de energia</div>
                                </div>
                                <span class="pill-badge pill-online">ATIVO & PROTEGIDO</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveClockModal()">💾 Sincronizar Agora</button>
                    </div>
                `;
            } else if (type === 'starlink_config') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>🛰️ Configurações da Antena Starlink Dishy</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Modo Térmico de Degelo de Neve (Snow Melt)</label>
                            <select class="form-select" id="m_sl_snow">
                                <option value="auto" selected>Automático (Detecta obstrução de sinal e aquece a 40°C)</option>
                                <option value="forced">Aquecimento Forçado Contínuo (45 Watts)</option>
                                <option value="off">Desligado / Standby Econômico (20 Watts)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Modo Bypass (Roteador ARK Gerencia a Rede)</label>
                            <select class="form-select" id="m_sl_bypass">
                                <option value="active" selected>Bypass Ativado (Roteador Starlink em modo Bridge transparente)</option>
                                <option value="disabled">Desativado (Roteador Starlink com Wi-Fi ativo)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Horário de Sleep / Modo Silencioso</label>
                            <select class="form-select" id="m_sl_sleep">
                                <option value="prog" selected>Programado: Desligar rádio das 02:00 às 06:00 (Economia de Bateria)</option>
                                <option value="none">Sempre Ligado (Operação 24 Horas)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">IP de Telemetria gRPC da Antena</label>
                            <select class="form-select">
                                <option selected>192.168.100.1:9200 (Porta Padrão Starlink Dishy)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-cyan" onclick="saveStarlinkModal()">💾 Aplicar na Antena Dishy</button>
                    </div>
                `;

            } else if (type === 'add_device') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>📱 Adicionar Reserva Estática de IP (DHCP Lease Fixo)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Nome Amigável do Aparelho</label>
                            <input type="text" class="form-input" id="m_new_dev_name" placeholder="Ex: Servidor-Docker-Pro">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Endereço MAC Físico (Placa de Rede)</label>
                            <input type="text" class="form-input" id="m_new_dev_mac" placeholder="Ex: b8:27:eb:11:22:33">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Endereço IP Reservado Desejado (Manual)</label>
                            <input type="text" class="form-input" id="m_new_dev_ip" value="192.168.73.150" placeholder="Ex: 192.168.73.150">
                            <small style="color:#94a3b8; font-size:0.75rem;">Digite o IP fixo desejado dentro da sub-rede local</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tipo de Aparelho (Ícone & Identificação)</label>
                            <select class="form-select" id="m_new_dev_type">
                                <option value="phone" selected>📱 Smartphone / Celular</option>
                                <option value="laptop">💻 Computador / Notebook</option>
                                <option value="console">🎮 Console Gamer (PS5, Xbox, Switch)</option>
                                <option value="server">🖥️ Servidor Local / NAS / Docker</option>
                                <option value="tv">📺 Smart TV / Streaming Box</option>
                                <option value="iot">🏠 Automação Residencial / IoT</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Prioridade de Fila SQM & Tráfego</label>
                            <select class="form-select" id="m_new_dev_prio">
                                <option value="gamer">🎮 Gamer Ultra (Baixa Latência Instantânea)</option>
                                <option value="high">Alta Prioridade (Streaming & Home Office)</option>
                                <option value="normal" selected>Normal</option>
                                <option value="low">Baixa Prioridade (Dispositivos IoT & Sensores)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveNewDeviceModal()">💾 Cadastrar Dispositivo</button>
                    </div>
                `;

            } else if (type === 'add_vpn') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>🔒 Adicionar Novo Túnel WireGuard (VPN)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <!-- Import .conf button from V1 -->
                        <div style="background:rgba(192, 132, 252, 0.1); border:1px solid rgba(192, 132, 252, 0.3); border-radius:8px; padding:12px; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between;">
                            <div>
                                <strong style="color:#fff; font-size:0.88rem;">Importar Arquivo de Configuração (.conf)</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Preenche automaticamente chaves, servidor e rotas do túnel</div>
                            </div>
                            <label class="ark-btn ark-btn-purple" style="font-size:0.8rem; padding:6px 12px; cursor:pointer;">
                                📥 Importar .conf
                                <input type="file" accept=".conf" onchange="importWireguardFile(this)" style="display:none;">
                            </label>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Nome da Interface Virtual</label>
                            <input type="text" class="form-input" id="m_vpn_iface" value="wg0" placeholder="ex: wg0 ou wg_trabalho">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Endereço IP do Cliente no Túnel (com máscara)</label>
                            <input type="text" class="form-input" id="m_vpn_client_ip" value="10.8.0.2/24" placeholder="ex: 10.8.0.2/24">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Chave Privada do Cliente (Private Key)</label>
                            <div style="display:flex; gap:8px;">
                                <input type="password" class="form-input" id="m_vpn_privkey" value="eG1ha2V5cHJpdmF0ZTEyMzQ1Njc4OWFiY2RlZjAxMjM0" placeholder="Chave privada base64">
                                <button type="button" class="ark-btn ark-btn-secondary" onclick="generateWgKeypair()">🔑 Gerar</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Chave Pública do Servidor Remoto (Public Key)</label>
                            <input type="text" class="form-input" id="m_vpn_pubkey" value="c2VydmVycHVibGlja2V5MTIzNDU2Nzg5YWJjZGVmMDEy" placeholder="Chave pública do servidor WireGuard">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Chave Pré-Compartilhada (PresharedKey — opcional)</label>
                            <input type="password" class="form-input" id="m_vpn_psk" placeholder="Opcional (segurança pós-quântica)">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Servidor Endpoint Remoto & Porta (Manual)</label>
                            <input type="text" class="form-input" id="m_vpn_endpoint" value="vpn.sp.arkrouter.net:51820" placeholder="ex: vpn.servidor.com:51820 ou 198.51.100.1:51820">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Redes Permitidas / Roteadas (AllowedIPs)</label>
                            <input type="text" class="form-input" id="m_vpn_allowed_ips" value="0.0.0.0/0, ::/0" placeholder="0.0.0.0/0 (Toda a Internet) ou 192.168.10.0/24">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Keepalive Periódico (segundos)</label>
                            <input type="number" class="form-input" id="m_vpn_keepalive" value="25" min="0" max="300">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-purple" onclick="saveVpnModal()">💾 Salvar e Ativar Túnel</button>
                    </div>
                `;
            } else if (type === 'wan_optimizations') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>⚙️ Otimizações Avançadas de Conexão WAN</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            <label style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:10px 14px; border-radius:6px; cursor:pointer;">
                                <div>
                                    <strong style="color:#fff; font-size:0.88rem;">MSS Clamping Automático</strong>
                                    <div style="font-size:0.75rem; color:#94a3b8;">Ajusta o tamanho máximo de segmento TCP para eliminar fragmentação em túneis PPPoE</div>
                                </div>
                                <label class="ark-switch"><input type="checkbox" id="m_wan_opt_mss" checked><span class="ark-slider"></span></label>
                            </label>

                            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:10px 14px; border-radius:6px;">
                                <div class="form-group" style="margin-bottom:8px;">
                                    <label class="form-label">Intervalo de Verificação LCP Echo (segundos)</label>
                                    <input type="number" class="form-input" id="m_wan_lcp_interval" value="5" min="1" max="60">
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label class="form-label">Tolerância a Quedas Consecutivas de LCP</label>
                                    <input type="number" class="form-input" id="m_wan_lcp_failure" value="3" min="1" max="10">
                                </div>
                            </div>

                            <label style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:10px 14px; border-radius:6px; cursor:pointer;">
                                <div>
                                    <strong style="color:#fff; font-size:0.88rem;">TCP Turbo BBR v2</strong>
                                    <div style="font-size:0.75rem; color:#94a3b8;">Algoritmo de controle de congestionamento do Google baseado em modelo de gargalo</div>
                                </div>
                                <label class="ark-switch"><input type="checkbox" id="m_wan_opt_bbr" checked><span class="ark-slider"></span></label>
                            </label>

                            <label style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:10px 14px; border-radius:6px; cursor:pointer;">
                                <div>
                                    <strong style="color:#fff; font-size:0.88rem;">Aceleração de Fluxo por Hardware (MediaTek PPE)</strong>
                                    <div style="font-size:0.75rem; color:#94a3b8;">Desvia pacotes da CPU para o silício com latência submilisegundo</div>
                                </div>
                                <label class="ark-switch"><input type="checkbox" id="m_wan_opt_ppe" checked><span class="ark-slider"></span></label>
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="showToast('✅ Otimizações avançadas da WAN salvas e aplicadas!'); closeModal();">💾 Salvar Otimizações</button>
                    </div>
                `;
            } else if (type === 'pppoe_logs') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>📜 Registro da Sessão PPPoE (Daemon pppd)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div style="background:#090d16; border:1px solid #1e293b; border-radius:8px; padding:14px; font-family:monospace; font-size:0.8rem; line-height:1.5; color:#cbd5e1; height:200px; overflow-y:auto;">
                            <div><span style="color:#64748b;">[03:40:12]</span> pppd[1842]: Plugin rp-pppoe.so loaded.</div>
                            <div><span style="color:#64748b;">[03:40:12]</span> pppd[1842]: PPPoE discovery phase initiated on eth0.10...</div>
                            <div><span style="color:#64748b;">[03:40:13]</span> pppd[1842]: PADS packet received from AC: SPO-GPON-BRAS-04</div>
                            <div><span style="color:#64748b;">[03:40:13]</span> pppd[1842]: PPP session 0x4f12 established.</div>
                            <div><span style="color:#64748b;">[03:40:14]</span> pppd[1842]: PAP authentication succeeded for user vivo@cliente</div>
                            <div><span style="color:#64748b;">[03:40:14]</span> pppd[1842]: local  IP address 187.54.21.90 (MTU 1492)</div>
                            <div><span style="color:#64748b;">[03:40:14]</span> pppd[1842]: remote IP address 187.54.21.1</div>
                            <div><span style="color:#64748b;">[03:40:14]</span> pppd[1842]: primary   DNS address 1.1.1.1</div>
                            <div><span style="color:#64748b;">[03:40:15]</span> netifd: Interface 'wan1' is now up (IPv4 + IPv6-PD /56)</div>
                            <div><span style="color:#10b981;">[03:40:15]</span> mwan3: Interface wan1 marked ONLINE. Traffic route established.</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                        <button class="ark-btn ark-btn-primary" onclick="showToast('🔄 Renovando sessão PPPoE...'); closeModal();">🔄 Reconectar PPPoE</button>
                    </div>
                `;
            } else if (type === 'restore_backup') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>⬆ Restaurar Cópia de Segurança do Roteador</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <p style="font-size:0.85rem; color:#cbd5e1; line-height:1.5;">
                            Envie o arquivo compactado <code>.tar.gz</code> com as configurações previamente exportadas. O sistema validará a integridade do arquivo antes de aplicar.
                        </p>
                        <div class="form-group" style="margin-top:12px;">
                            <label class="form-label">Arquivo de Backup (.tar.gz)</label>
                            <input type="file" class="form-input" id="backup_file_input" accept=".tar.gz,.tgz">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Modo de Restauração</label>
                            <select class="form-select" id="restore_policy">
                                <option value="keep" selected>Preservar Senhas de Rede e Chaves SSH se ausentes no arquivo</option>
                                <option value="full">Substituição Completa (Sobrescrever 100% dos Parâmetros)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="showToast('✅ Arquivo de backup validado e restaurado com sucesso! Daemons recarregados.'); closeModal();">💾 Restaurar e Reiniciar Serviços</button>
                    </div>
                `;
            } else if (type === 'adblock_lists') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>🛡️ Gerenciamento de Listas AdBlock (Whitelist & Blacklist)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Adicionar Domínio à Lista Branca (Sempre Permitir - Whitelist)</label>
                            <div style="display:flex; gap:8px;">
                                <input type="text" class="form-input" id="m_adblock_wl_input" placeholder="exemplo: login.banco.com.br">
                                <button class="ark-btn ark-btn-secondary" onclick="addWhitelistDomain()">Adicionar</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Adicionar Domínio à Lista Negra (Sempre Bloquear - Blacklist)</label>
                            <div style="display:flex; gap:8px;">
                                <input type="text" class="form-input" id="m_adblock_bl_input" placeholder="exemplo: rastreador.smarttv.com">
                                <button class="ark-btn ark-btn-danger" onclick="addBlacklistDomain()">Bloquear</button>
                            </div>
                        </div>
                        <div style="background:rgba(0,0,0,0.25); border-radius:8px; padding:12px; margin-top:12px;">
                            <strong style="color:#fff; font-size:0.85rem;">Domínios Customizados Ativos (2):</strong>
                            <div style="margin-top:6px; font-size:0.8rem; color:#94a3b8; display:flex; flex-direction:column; gap:4px;">
                                <div>• <span style="color:#10b981;">[WHITELIST]</span> telemetry.playstation.net</div>
                                <div>• <span style="color:#f43f5e;">[BLACKLIST]</span> ads.samsungads.com</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                        <button class="ark-btn ark-btn-primary" onclick="showToast('✅ Listas AdBlock sincronizadas com o dnsmasq!'); closeModal();">💾 Salvar e Recarregar DNS</button>
                    </div>
                `;
            } else if (type === 'ota_update') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>🔍 Verificador de Atualizações OTA (ARK Router OS)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div style="text-align:center; padding:12px 0;">
                            <div style="font-size:2.5rem; margin-bottom:8px;">✨</div>
                            <h4 style="color:#fff; font-size:1.15rem; margin-bottom:4px;">Seu Sistema está 100% Atualizado</h4>
                            <span class="pill-badge pill-online">ARK OS v1.5.17 (ESTÁVEL)</span>
                        </div>
                        <div style="background:rgba(0,0,0,0.25); border-radius:8px; padding:14px; margin-top:12px; font-size:0.82rem; color:#cbd5e1; line-height:1.5;">
                            <div>• Versão Instalada: <strong>1.5.17</strong> (Kernel 6.6.54)</div>
                            <div>• Canal de Distribuição: <strong>Oficial Release (GitHub Releases)</strong></div>
                            <div>• Pacote: <code>luci-app-ark-router_1.5.17_all.ipk / .apk</code></div>
                            <div>• Integridade SHA-256: <code>e3b0c44298fc1c149afbf4c8996fb92427ae41e4...</code></div>
                            <div style="margin-top:8px; color:#10b981;">
                                ✅ Todos os 74 contratos de engenharia e regras de firewall estão em conformidade.
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                        <button class="ark-btn ark-btn-primary" onclick="showToast('🔄 Verificando servidores do GitHub... Versão atual v1.5.17 é a mais recente!');">🔍 Checar Novamente</button>
                    </div>
                `;
            } else if (type === 'guest_qr') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>📲 Conexão Wi-Fi de Convidados via QR Code</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body" style="text-align:center;">
                        <div style="display:inline-block; padding:16px; background:#fff; border-radius:12px; margin:10px 0;">
                            <svg width="180" height="180" viewBox="0 0 100 100">
                                <rect width="100" height="100" fill="#fff" />
                                <rect x="10" y="10" width="30" height="30" fill="#000" />
                                <rect x="15" y="15" width="20" height="20" fill="#fff" />
                                <rect x="20" y="20" width="10" height="10" fill="#000" />
                                <rect x="60" y="10" width="30" height="30" fill="#000" />
                                <rect x="65" y="15" width="20" height="20" fill="#fff" />
                                <rect x="70" y="20" width="10" height="10" fill="#000" />
                                <rect x="10" y="60" width="30" height="30" fill="#000" />
                                <rect x="15" y="65" width="20" height="20" fill="#fff" />
                                <rect x="20" y="70" width="10" height="10" fill="#000" />
                                <circle cx="50" cy="50" r="10" fill="#10b981" />
                            </svg>
                        </div>
                        <h4 style="color:#fff;">Wi-Fi-H&R-Visitantes</h4>
                        <p style="font-size:0.8rem; color:#94a3b8;">Aponte a câmera do celular para conectar à rede de convidados sem pedir senha.</p>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button></div>
                `;
} else if (type === 'hardware_cpu' || type === 'cpu') {
                return openHardwareModal('cpu');
            } else if (type === 'hardware_ram' || type === 'ram') {
                return openHardwareModal('ram');
            } else if (type === 'hardware_flash' || type === 'flash') {
                return openHardwareModal('flash');
            } else if (type === 'hardware_temp' || type === 'temp') {
                return openHardwareModal('temp');
            } else if (type === 'diagnostics') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🩺 Diagnóstico de Rede & Resiliência (Ping / Traceroute)</h3>
                        <div class="modal-header-actions">
                            <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                            <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Endereço IP ou Host de Destino</label>
                            <div style="display:flex; gap:8px;">
                                <input type="text" class="form-input" id="diag_host" value="1.1.1.1" placeholder="ex: 1.1.1.1 ou google.com" style="flex:1;">
                                <button type="button" class="ark-btn ark-btn-primary" onclick="runPingDiagnostic()">Ping</button>
                                <button type="button" class="ark-btn ark-btn-secondary" onclick="runTracerouteDiagnostic()">Trace</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Saída do Console do Kernel (ICMP)</label>
                            <pre id="diag_output" style="background:#090d16; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px; font-size:0.8rem; color:#38bdf8; min-height:160px; max-height:240px; overflow-y:auto; font-family:monospace; margin:0;">Pressione "Ping" ou "Trace" para testar a rota WAN...</pre>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    </div>
                `;
            } else if (type === 'speedtest') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🎬 Medidor de Velocidade da WAN (Speedtest)</h3>
                        <div class="modal-header-actions">
                            <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                            <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div style="background:rgba(56, 189, 248, 0.1); border:1px solid rgba(56, 189, 248, 0.25); border-radius:8px; padding:14px; margin-bottom:14px; text-align:center;">
                            <div style="font-size:0.85rem; color:#94a3b8; margin-bottom:4px;">ÚLTIMA MEDIÇÃO CANÔNICA</div>
                            <div style="font-size:2rem; font-weight:800; color:#38bdf8;">842.1 Mbps <span style="font-size:1rem; color:#fff;">↓</span> • 412.5 Mbps <span style="font-size:1rem; color:#fff;">↑</span></div>
                            <div style="font-size:0.75rem; color:#10b981;">● Latência sob carga: 1.8 ms (CAKE SQM Ativo)</div>
                        </div>
                        <div style="display:flex; gap:10px; justify-content:center;">
                            <button type="button" class="ark-btn ark-btn-primary" style="flex:1;" onclick="window.open('https://fast.com', '_blank')">Fast.com (Netflix CDN) ↗</button>
                            <button type="button" class="ark-btn ark-btn-secondary" style="flex:1;" onclick="window.open('https://speedtest.net', '_blank')">Ookla Speedtest ↗</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    </div>
                `;
            } else if (type === 'adblock') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🛡️ Bloqueador de Anúncios DNS (AdBlock Sinkhole)</h3>
                        <div class="modal-header-actions">
                            <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                            <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:8px;">
                            <div>
                                <strong style="color:#fff; font-size:0.9rem;">Filtro DNS Ativo (AdGuard + StevenBlack)</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">142.850 domínios maliciosos e rastreadores bloqueados em RAM</div>
                            </div>
                            <label class="ark-switch"><input type="checkbox" checked onchange="toggleAdblock(this.checked)"><span class="ark-slider"></span></label>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button type="button" class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openModal('adblock_lists')">📋 Listas Negras & Brancas</button>
                            <button type="button" class="ark-btn ark-btn-primary" style="flex:1;" onclick="showToast('🔄 Listas DNS sincronizadas e recarregadas em 1.2s!'); closeModal();">🔄 Atualizar Listas</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    </div>
                `;
            } else if (type === 'mesh') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📶 Controlador EasyMesh 802.11s & Nós Satélites</h3>
                        <div class="modal-header-actions">
                            <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                            <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:8px;">
                            <div>
                                <strong style="color:#fff; font-size:0.9rem;">Mesh Controller 802.11s</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Sincronização contínua de SSID, chaves e roaming com nós adicionais</div>
                            </div>
                            <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                        </div>
                        <div style="margin-top:10px;">
                            <button type="button" class="ark-btn ark-btn-purple" style="width:100%;" onclick="showToast('🔍 Buscando novos nós EasyMesh via WPS/802.11s... Pressione o botão no repetidor.'); closeModal();">🔍 Parear Novo Nó Satélite (WPS 120s)</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    </div>
                `;
            } else if (type === 'guest_wifi') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>👥 Rede Wi-Fi de Convidados (Sub-rede Isolada)</h3>
                        <div class="modal-header-actions">
                            <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                            <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:8px;">
                            <div>
                                <strong style="color:#fff; font-size:0.9rem;">Status da Rede de Convidados</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Isolada da LAN principal (VLAN 10 • 192.168.10.0/24)</div>
                            </div>
                            <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Nome da Rede de Convidados (SSID)</label>
                            <input type="text" class="form-input" id="m_guest_ssid" value="Wi-Fi-H&R-Visitas">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Senha de Acesso</label>
                            <div style="display:flex; gap:8px;">
                                <input type="password" class="form-input" id="m_guest_pass" value="Visitas2026">
                                <button type="button" class="ark-btn ark-btn-secondary" onclick="togglePassVisibility('m_guest_pass', this)">👁️ Ver</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Limite de Velocidade por Aparelho (Rate Limit)</label>
                            <select class="form-select" id="m_guest_limit">
                                <option value="50" selected>50 Mbps Download / 20 Mbps Upload (Recomendado)</option>
                                <option value="25">25 Mbps Download / 10 Mbps Upload</option>
                                <option value="100">100 Mbps Download / 50 Mbps Upload</option>
                                <option value="0">Sem Limite</option>
                            </select>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button type="button" class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openModal('guest_qr')">📲 Ver QR Code</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="showToast('✅ Configurações da Rede de Convidados salvas!'); closeModal();">💾 Salvar Rede</button>
                    </div>
                `;
            } else if (type === 'starlink') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🛰️ Telemetria Orbital Starlink (Antena Dishy)</h3>
                        <div class="modal-header-actions">
                            <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                            <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; margin-bottom:12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong style="color:#fff; font-size:0.9rem;">Terminal Starlink Dishy v2</strong>
                                    <div style="font-size:0.75rem; color:#10b981;">● Conectado via gRPC (192.168.100.1:9200)</div>
                                </div>
                                <span class="pill-badge pill-online">ONLINE LEO</span>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.82rem; margin-bottom:12px;">
                            <div><span>Obstrução:</span> <strong style="color:#10b981;">0.00% (Céu Limpo)</strong></div>
                            <div><span>Pop Ping:</span> <strong style="color:#38bdf8;">28 ms</strong></div>
                            <div><span>Satélites Visíveis:</span> <strong style="color:#fff;">14 Ativos</strong></div>
                            <div><span>Buffer 25h:</span> <strong style="color:#10b981;">100% Retido</strong></div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button type="button" class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openModal('starlink_config')">⚙️ Parâmetros</button>
                            <button type="button" class="ark-btn ark-btn-cyan" style="flex:1;" onclick="starlinkStowAction('reboot')">🔄 Reiniciar Dishy</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    </div>
                `;
            } else if (type === 'firmware_ota') {
                return openModal('ota_update');
            } else if (type === 'backup_restore') {
                return openModal('restore_backup');
            } else {
                closeModal();
            }
        }

        // Advanced Master Design Handlers (100% of V1 Features)
        function purgeRam() {
            const ramVal = document.getElementById('health_ram');
            const barRam = document.getElementById('bar_ram');
            if (ramVal) ramVal.textContent = '146 / 512 MB';
            if (barRam) barRam.style.width = '28%';
            showToast('🧹 142 MB de buffers e caches de RAM purgados com sucesso! Memória livre aumentada.');
        }

        function cleanFlashStorage() {
            showToast('🗑️ Limpeza concluída: 18.4 MB de caches temporários do LuCI removidos da partição /overlay!');
        }

        function flushStaleLeases() {
            showToast('🧹 Coleta de lixo concluída: 4 leases DHCP inativos estagnados removidos!');
        }

        function toggleAdblock(el) {
            showToast(el.checked ? '🛡️ AdBlock ATIVADO: 148.291 domínios filtrados no dnsmasq.' : '⚠️ AdBlock pausado temporariamente.');
        }

        function updateAdblockList() {
            showToast('🔄 Atualizando listas StevenBlack e OISD... 148.291 regras sincronizadas!');
        }

        function addWhitelistDomain() {
            const inp = document.getElementById('m_adblock_wl_input');
            const val = inp ? inp.value.trim() : '';
            if (!val) return;
            showToast(`✅ Domínio "${val}" adicionado à Whitelist!`);
            if (inp) inp.value = '';
        }

        function addBlacklistDomain() {
            const inp = document.getElementById('m_adblock_bl_input');
            const val = inp ? inp.value.trim() : '';
            if (!val) return;
            showToast(`🚫 Domínio "${val}" bloqueado na Blacklist!`);
            if (inp) inp.value = '';
        }

        function toggleUpnp(el) {
            showToast(el.checked ? '🎮 Serviço UPnP IGD ativado para jogos e consoles.' : '⚠️ UPnP IGD desativado.');
        }

        function deleteUpnpPort(port) {
            showToast(`🗑️ Redirecionamento UPnP da porta ${port} revogado com sucesso!`);
            const row = event && event.target ? event.target.closest('tr') : null;
            if (row) row.remove();
        }

        function toggleDmz(el) {
            showToast(el.checked ? '🎯 Host DMZ ativado! Todas as portas não mapeadas serão encaminhadas.' : 'Host DMZ desativado.');
        }

        function saveDmzSettings() {
            const host = document.getElementById('dmz_host_sel').value;
            showToast(host !== 'none' ? `🎯 Host DMZ configurado para o IP ${host}!` : 'Host DMZ desativado com segurança.');
        }

        function saveIpv6Settings() {
            const mode = document.getElementById('m_ipv6_mode').value;
            showToast(`🌐 Configurações IPv6 salvas! Modo ativo: ${mode.toUpperCase()}. Prefixo ULA dinâmico sincronizado.`);
        }

        function openOnuPanel() {
            const ip = document.getElementById('m_onu_ip').value;
            showToast(`🔗 Abrindo interface web da ONU em http://${ip}...`);
            window.open(`http://${ip}`, '_blank');
        }

        function saveAutoWan(mode) {
            showToast(mode === 'dual_wan' 
                ? '🔄 Auto-WAN: Porta LAN 1 convertida na WAN 2 (Claro Fibra) com balanceamento mwan3!' 
                : 'Single-WAN: Porta LAN 1 liberada para computadores locais.');
        }

        function toggleGuestWifi(el) {
            showToast(el.checked ? '👥 Rede Wi-Fi de Convidados ATIVADA com isolamento de clientes!' : 'Rede Wi-Fi de Convidados desligada.');
        }

        function scanMeshSatellites() {
            showToast('🔍 Varredura EasyMesh iniciada: 2 nós satélites sincronizados com sinal excelente!');
        }

        function saveKernelOptimization() {
            const tcp = document.getElementById('tcp_congestion_sel').value;
            const zram = document.getElementById('zram_size_sel').value;
            showToast(`🚀 Kernel otimizado! TCP ${tcp.toUpperCase()} e ZRAM ${zram} MB LZ4 aplicados.`);
        }

        function dishyAction(action) {
            if (action === 'stow') {
                showToast('📐 Comando STOW enviado! Antena Starlink Dishy recolhendo para posição de transporte.');
            } else if (action === 'reboot') {
                showToast('🔄 Reiniciando terminal orbital Starlink Dishy... Reconexão LEO em 90s.');
            } else {
                showToast('📡 Antena Starlink Dishy despertada! Rastreamento de satélites retomado.');
            }
        }

        // Action Handlers for Modals
        function saveOpModeModal() {
            const mode = document.getElementById('m_op_mode').value;
            window.currentOperationMode = mode;
            const heroBtn = document.getElementById('btn_hero_opmode');
            const heroEyebrow = document.querySelector('.ex-hero-eyebrow');
            if (mode === 'ap') {
                if (heroBtn) heroBtn.textContent = '📡 Modo: AP Bridge';
                if (heroEyebrow) heroEyebrow.textContent = '📡 ROTEADOR SECUNDÁRIO • PONTO DE ACESSO & SWITCH';
                showToast('📡 Modo Ponto de Acesso (AP) aplicado com sucesso! NAT e DHCP desativados para evitar duplo NAT.');
            } else if (mode === 'mesh') {
                if (heroBtn) heroBtn.textContent = '📶 Modo: Mesh Node';
                if (heroEyebrow) heroEyebrow.textContent = '📶 NÓ DE REDE MESH 802.11s • SINCRONIZADO';
                showToast('📶 Modo Mesh Node 802.11s ativado! Roaming 802.11k/v/r ativo.');
            } else {
                if (heroBtn) heroBtn.textContent = '🌐 Modo AP/Gateway';
                if (heroEyebrow) heroEyebrow.textContent = 'COCKPIT NOC • ACER PREDATOR W6X (WI-FI 6E)';
                showToast('🌐 Modo Gateway Principal aplicado! Roteador, Firewall e DHCP 100% ativos.');
            }
            closeModal();
        }

        function onOpModeChange(val) {
            const el = document.getElementById('ap_extra_settings');
            if (el) el.style.display = val === 'ap' ? 'block' : 'none';
        }

        function saveGamerModeModal() {
            const active = document.getElementById('m_gamer_status').value === '1';
            window.isGamerActive = active;
            const hero = document.querySelector('.ex-hero');
            const heroBtn = document.getElementById('btn_hero_gamer');
            const heroEyebrow = document.querySelector('.ex-hero-eyebrow');

            if (active) {
                if (hero) hero.classList.add('ex-hero-gamer');
                if (heroBtn) {
                    heroBtn.innerHTML = '🎮 GAMER ATIVO';
                    heroBtn.style.background = 'linear-gradient(120deg, rgba(239, 68, 68, 0.35), rgba(168, 85, 247, 0.35))';
                    heroBtn.style.borderColor = '#f43f5e';
                    heroBtn.style.color = '#fff';
                }
                if (heroEyebrow) heroEyebrow.textContent = '🎮 MODO GAMER ULTRA • BAIXA LATÊNCIA & CAKE PRIORITÁRIO';
                showToast('🎮 Modo Gamer Ultra ATIVADO com sucesso! Fila DSCP Expedited Forwarding em vigor.');
            } else {
                if (hero) hero.classList.remove('ex-hero-gamer');
                if (heroBtn) {
                    heroBtn.innerHTML = '🎮 Gamer Ultra';
                    heroBtn.style.background = '';
                    heroBtn.style.borderColor = '';
                    heroBtn.style.color = '';
                }
                if (heroEyebrow) heroEyebrow.textContent = 'COCKPIT NOC • ACER PREDATOR W6X (WI-FI 6E)';
                showToast('Modo Gamer desativado. Sistema retornou ao perfil equilibrado.');
            }
            closeModal();
        }

        function saveLanguageModal() {
            const lang = document.getElementById('m_lang_sel').value;
            window.currentLang = lang;
            const heroBtn = document.getElementById('btn_hero_lang');
            if (lang === 'en') {
                if (heroBtn) heroBtn.textContent = '🇺🇸 Language: EN';
                showToast('🇺🇸 English language profile loaded successfully!');
            } else if (lang === 'es') {
                if (heroBtn) heroBtn.textContent = '🇪🇸 Idioma: ES';
                showToast('🇪🇸 ¡Idioma Español aplicado con éxito!');
            } else {
                if (heroBtn) heroBtn.textContent = '🇧🇷 Idioma: PT-BR';
                showToast('🇧🇷 Idioma Português do Brasil aplicado com sucesso!');
            }
            closeModal();
        }

        function saveClockModal() {
            const server = document.getElementById('m_ntp_server').value;
            showToast(`⏰ Relógio sincronizado com ${server}! Kernel NTP atualizado com sucesso.`);
            closeModal();
        }

        function saveStarlinkModal() {
            showToast('🛰️ Parâmetros térmicos e de Bypass enviados para a antena Starlink Dishy!');
            closeModal();
        }

        function saveNewDeviceModal() {
            const name = document.getElementById('m_new_dev_name').value || 'Novo-Dispositivo';
            const mac = document.getElementById('m_new_dev_mac').value || 'aa:bb:cc:dd:ee:ff';
            const ip = document.getElementById('m_new_dev_ip').value;
            const prio = document.getElementById('m_new_dev_prio').value;

            DEVICES.push({
                id: DEVICES.length + 1,
                name: name,
                ip: ip,
                mac: mac,
                band: '5',
                rssi: -55,
                speed: '866 Mbps',
                total: '0 MB',
                type: 'laptop',
                prio: prio
            });
            renderDevicesTable();
            showToast(`📱 Dispositivo "${name}" cadastrado com IP estático ${ip}!`);
            closeModal();
        }

        function saveVpnModal() {
            const iface = document.getElementById('m_vpn_iface').value;
            const endpoint = document.getElementById('m_vpn_endpoint').value;
            showToast(`🔒 Túnel WireGuard ${iface} conectado com sucesso ao endpoint ${endpoint}!`);
            closeModal();
        }

        // Hardware Modal Handler (Health Strip)
        function openHardwareModal(metric) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');
            if (metric === 'cpu') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>⚡ Telemetria de CPU & Processamento</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div style="font-size:0.9rem; color:#fff; font-weight:700; margin-bottom:10px;">
                            SoC: MediaTek Filogic 830 (MT7986A 4x ARM Cortex-A53 @ 2.0 GHz)
                        </div>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <div><div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:2px;"><span>Núcleo 0 (Sistemas & IRQs)</span><strong>4%</strong></div><div class="health-bar-bg"><div class="health-bar-fill" style="width:4%; background:#10b981;"></div></div></div>
                            <div><div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:2px;"><span>Núcleo 1 (Filas CAKE SQM)</span><strong>14%</strong></div><div class="health-bar-bg"><div class="health-bar-fill" style="width:14%; background:#10b981;"></div></div></div>
                            <div><div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:2px;"><span>Núcleo 2 (Wi-Fi 7 WED Driver)</span><strong>8%</strong></div><div class="health-bar-bg"><div class="health-bar-fill" style="width:8%; background:#10b981;"></div></div></div>
                            <div><div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:2px;"><span>Núcleo 3 (Túnel WireGuard)</span><strong>11%</strong></div><div class="health-bar-bg"><div class="health-bar-fill" style="width:11%; background:#10b981;"></div></div></div>
                        </div>
                        <div style="margin-top:14px; background:rgba(0,0,0,0.25); border-radius:8px; padding:10px; font-size:0.8rem; color:#94a3b8;">
                            • Aceleração PPE (Packet Processing Engine): <strong style="color:#10b981;">Ativa</strong> (0% carga de CPU em NAT)<br>
                            • Escalonamento CAKE Multi-Queue: <strong style="color:#38bdf8;">Ativo</strong>
                        </div>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button></div>
                `;
            } else if (metric === 'temp') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>🌡️ Sensores Térmicos do Hardware</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                <div style="font-size:0.75rem; color:#94a3b8;">SoC MediaTek MT7986A</div>
                                <div style="font-size:1.6rem; font-weight:800; color:#10b981; margin:4px 0;">46°C</div>
                                <div style="font-size:0.72rem; color:#10b981;">● Normal (Limite 105°C)</div>
                            </div>
                            <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                <div style="font-size:0.75rem; color:#94a3b8;">Rádio Wi-Fi 6 GHz (MT7976C)</div>
                                <div style="font-size:1.6rem; font-weight:800; color:#38bdf8; margin:4px 0;">48°C</div>
                                <div style="font-size:0.72rem; color:#38bdf8;">● Dissipador Ativo</div>
                            </div>
                            <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                <div style="font-size:0.75rem; color:#94a3b8;">Rádio Wi-Fi 5 GHz</div>
                                <div style="font-size:1.6rem; font-weight:800; color:#10b981; margin:4px 0;">44°C</div>
                                <div style="font-size:0.72rem; color:#10b981;">● Temperatura Estável</div>
                            </div>
                            <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                <div style="font-size:0.75rem; color:#94a3b8;">Rádio Wi-Fi 2.4 GHz</div>
                                <div style="font-size:1.6rem; font-weight:800; color:#10b981; margin:4px 0;">41°C</div>
                                <div style="font-size:0.72rem; color:#10b981;">● Temperatura Estável</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button></div>
                `;
            } else if (metric === 'ram') {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>▦ Diagnóstico de Memória RAM & ZRAM</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div style="font-size:1.4rem; font-weight:800; color:#3b82f6; margin-bottom:10px;">
                            188 MB Usados / 512 MB Total (36%)
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px; font-size:0.85rem;">
                            <div style="display:flex; justify-content:space-between;"><span>Memória Livre Real:</span><strong>324 MB</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Buffers do Kernel:</span><strong>34 MB</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Cache de Disco / Arquivos:</span><strong>112 MB</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Compactação ZRAM (Algoritmo LZ4):</span><strong style="color:#10b981;">Ativo (64 MB)</strong></div>
                        </div>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button></div>
                `;
            } else {
                cont.innerHTML = `
                    <div class="modal-header">
                    <h3>▣ Partições & Armazenamento Flash (NAND)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                    <div class="modal-body">
                        <div style="font-size:1.4rem; font-weight:800; color:#8b5cf6; margin-bottom:10px;">
                            84.8 MB Livres / 128 MB Total
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px; font-size:0.85rem;">
                            <div style="display:flex; justify-content:space-between;"><span>Imagem do Sistema (SquashFS - ReadOnly):</span><strong>43.2 MB</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Partição de Configurações (Overlayfs UBIFS):</span><strong>18.4 MB</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Espaço Livre para Pacotes e Daemons:</span><strong style="color:#10b981;">84.8 MB (66%)</strong></div>
                        </div>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button></div>
                `;
            }
        }

        function openWanModal(name) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');
            const isWan1 = name === 'wan1';

            // Generate profile options
            const profOpts = PPPOE_PROFILES.map(p => `<option value="${p.id}" ${p.id === 'vivo' && isWan1 ? 'selected' : ''}>${p.name} (${p.user}${p.mac ? ' • MAC ' + p.mac : ''}${p.modem ? ' • ONU ' + p.modem : ''})</option>`).join('');

            cont.innerHTML = `
                <div class="modal-header">
                    <h3>🌐 Configuração da Internet — ${isWan1 ? 'WAN 1 (Vivo Fibra GPON)' : 'WAN 2 (Claro Fibra / Backup)'}</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    <!-- Real-Time Hardware & Link Status Bar -->
                    <div style="background:rgba(56, 189, 248, 0.08); border:1px solid rgba(56, 189, 248, 0.25); border-radius:10px; padding:12px 14px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                            <div>
                                <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.04em; font-weight:700;">Porta Física & Interface Lógica</span>
                                <div style="font-weight:800; color:#38bdf8; font-size:0.95rem;">
                                    ${isWan1 ? 'Porta 1 (2.5 Gbps) • eth1 (pppoe-wan)' : 'Porta 2 (LAN1 virando WAN2) • eth2 (dhcp-wan)'}
                                </div>
                            </div>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <span class="pill-badge pill-online">${isWan1 ? '● Conectado (2500M Full Duplex)' : '● Conectado (1000M Full Duplex)'}</span>
                                <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="reconnectWan('${name}')" title="Reiniciar interface de rede">🔄 Reconectar</button>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; font-size:0.8rem; border-top:1px solid rgba(255,255,255,0.08); padding-top:8px;">
                            <div><span style="color:#94a3b8;">IP Público:</span> <strong style="color:#fff;">${isWan1 ? '187.54.21.90' : '192.168.0.24'}</strong></div>
                            <div><span style="color:#94a3b8;">Gateway:</span> <strong style="color:#fff;">${isWan1 ? '187.54.21.1' : '192.168.0.1'}</strong></div>
                            <div><span style="color:#94a3b8;">Uptime:</span> <strong style="color:#fff;">14d 08h 34m</strong></div>
                            <div><span style="color:#94a3b8;">Tráfego Total:</span> <strong style="color:#10b981;">↓ 452.8 GB / ↑ 189.4 GB</strong></div>
                        </div>
                    </div>

                    <!-- Protocol Selector -->
                    <div class="form-group">
                        <label class="form-label">Protocolo de Conexão com o Provedor</label>
                        <select class="form-select" id="m_wan_proto" onchange="toggleWanProtoFields(this.value)">
                            <option value="pppoe" ${isWan1 ? 'selected' : ''}>PPPoE (Fibra com Login — Vivo Fibra, Oi Fibra, Provedores FTTH)</option>
                            <option value="dhcp" ${!isWan1 ? 'selected' : ''}>DHCP Cliente Automático (Claro Fibra, Starlink, Modem em Bridge)</option>
                            <option value="static">IP Fixo / Estático Corporativo (Link Dedicado com IP Definido)</option>
                        </select>
                    </div>

                    <!-- PPPoE Profiles Manager Bar (V1 Mandatory Feature) -->
                    <div id="wan_pppoe_profile_bar" style="display:${isWan1 ? 'block' : 'none'}; background:rgba(30,41,59,0.7); border:1px solid rgba(59,130,246,0.25); border-radius:8px; padding:12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <label class="form-label" style="color:#60a5fa; margin:0;">Perfis PPPoE Salvos no Roteador</label>
                            <span id="pppoe_profile_status" style="font-size:0.75rem; color:#34d399; font-weight:600;">✓ Perfil Vivo Fibra aplicado</span>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <select class="form-select" id="m_wan_pppoe_profiles" style="flex:1;" onchange="loadPppoeProfile(this.value)">
                                <option value="">-- Escolher perfil PPPoE salvo (${PPPOE_PROFILES.length}) --</option>
                                ${profOpts}
                            </select>
                            <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.8rem; padding:6px 10px;" onclick="deleteSelectedPppoeProfile()" title="Excluir perfil selecionado">🗑️</button>
                            <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.8rem; padding:6px 12px; white-space:nowrap;" onclick="toggleSaveProfilePrompt()">💾 Salvar Atual</button>
                        </div>
                        <div id="pppoe_save_prompt_box" style="display:none; margin-top:8px; padding:10px; background:rgba(15,23,42,0.95); border:1px solid rgba(59,130,246,0.4); border-radius:6px;">
                            <small style="color:#94a3b8; display:block; margin-bottom:6px;">Dê um nome para salvar o usuário, senha, VLAN, MAC e IP da ONU atuais:</small>
                            <div style="display:flex; gap:6px;">
                                <input type="text" class="form-input" id="pppoe_new_prof_name" placeholder="Ex: Minha Fibra Vivo 1Gbps" style="flex:1;">
                                <button type="button" class="ark-btn ark-btn-primary" style="padding:6px 14px;" onclick="doSavePppoeProfile()">Salvar</button>
                                <button type="button" class="ark-btn ark-btn-secondary" style="padding:6px 10px;" onclick="toggleSaveProfilePrompt()">✕</button>
                            </div>
                        </div>
                    </div>

                    <!-- PPPoE Manual Fields -->
                    <div id="wan_pppoe_fields" style="display:${isWan1 ? 'block' : 'none'}; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px;">
                        <div class="form-group" style="margin-bottom:10px;">
                            <label class="form-label">Nome de Usuário PPPoE</label>
                            <input type="text" class="form-input" id="m_wan_user" value="${isWan1 ? 'cliente@vivofibra.com.br' : 'cliente@provedor.com'}" placeholder="login@provedor.com.br">
                        </div>
                        <div class="form-group" style="margin-bottom:10px;">
                            <label class="form-label">Senha de Autenticação PPPoE</label>
                            <div style="display:flex; gap:8px;">
                                <input type="password" class="form-input" id="m_wan_pass" value="vivo123" placeholder="senha da autenticação">
                                <button type="button" class="ark-btn ark-btn-secondary" onclick="togglePassVisibility('m_wan_pass', this)">👁️ Ver</button>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div class="form-group">
                                <label class="form-label">VLAN ID (802.1Q)</label>
                                <input type="number" class="form-input" id="m_wan_vlan" value="${isWan1 ? '10' : ''}" placeholder="Ex: 10, 100">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Service Name (Opcional)</label>
                                <input type="text" class="form-input" id="m_wan_service" placeholder="Vazio = automático">
                            </div>
                        </div>
                    </div>

                    <!-- DHCP Live Status & Hostname Block -->
                    <div id="wan_dhcp_fields" style="display:${!isWan1 ? 'block' : 'none'}; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px;">
                        <div style="font-size:0.85rem; color:#cbd5e1; margin-bottom:8px;">
                            <strong>Status do Cliente DHCP:</strong> Conectado ao modem da operadora. IP recebido: <code style="color:#38bdf8;">192.168.0.24/24</code>.
                        </div>
                        <div class="form-group">
                            <label class="form-label">Hostname do Roteador para Envio no DHCP</label>
                            <input type="text" class="form-input" id="m_wan_hostname" value="ARK-Router-Master" placeholder="ARK-Router">
                        </div>
                    </div>

                    <!-- Static IP Manual Fields -->
                    <div id="wan_static_fields" style="display:none; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px;">
                        <div class="form-group" style="margin-bottom:10px;">
                            <label class="form-label">Endereço IP Fixo Público</label>
                            <input type="text" class="form-input" id="m_wan_static_ip" value="187.54.21.90" placeholder="Ex: 200.180.10.5">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div class="form-group">
                                <label class="form-label">Máscara de Sub-rede</label>
                                <input type="text" class="form-input" id="m_wan_static_mask" value="255.255.255.0" placeholder="255.255.255.0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Gateway Padrão</label>
                                <input type="text" class="form-input" id="m_wan_static_gw" value="187.54.21.1" placeholder="Ex: 200.180.10.1">
                            </div>
                        </div>
                    </div>

                    <!-- MTU with Presets & Manual Value -->
                    <div class="form-group">
                        <label class="form-label">Tamanho Máximo de Pacote (MTU)</label>
                        <div style="display:flex; gap:8px;">
                            <select class="form-select" id="m_wan_mtu_sel" onchange="document.getElementById('m_wan_mtu').value = this.value" style="flex:2;">
                                <option value="1492" ${isWan1 ? 'selected' : ''}>1492 (Padrão Otimizado Fibra PPPoE)</option>
                                <option value="1500" ${!isWan1 ? 'selected' : ''}>1500 (Padrão Ethernet / DOCSIS / Starlink)</option>
                                <option value="1508">1508 (Baby Jumbo Frames — PPPoE com 1500 Puro)</option>
                                <option value="1480">1480 (Túneis Corporativos)</option>
                            </select>
                            <input type="number" class="form-input" id="m_wan_mtu" value="${isWan1 ? '1492' : '1500'}" placeholder="MTU" style="flex:1;">
                        </div>
                    </div>

                    <!-- Custom DNS -->
                    <div class="form-group">
                        <label class="form-label">Servidores DNS de Resolução</label>
                        <select class="form-select" id="m_wan_dns_preset" onchange="applyDnsPreset(this.value)" style="margin-bottom:6px;">
                            <option value="1.1.1.1 1.0.0.1" selected>Cloudflare DNS (1.1.1.1 + 1.0.0.1 - Latência 2ms)</option>
                            <option value="8.8.8.8 8.8.4.4">Google Public DNS (8.8.8.8 + 8.8.4.4)</option>
                            <option value="94.140.14.14 94.140.15.15">AdGuard DNS (Filtro Antispam)</option>
                            <option value="custom">Personalizado (Digitação Manual)</option>
                        </select>
                        <input type="text" class="form-input" id="m_wan_dns" value="1.1.1.1 1.0.0.1" placeholder="Servidores DNS separados por espaço (ex: 1.1.1.1 8.8.8.8)">
                    </div>

                    <!-- Cloned MAC Address Manual -->
                    <div class="form-group">
                        <label class="form-label">Clonagem de Endereço MAC (Bypass de Provedor)</label>
                        <div style="display:flex; gap:8px;">
                            <input type="text" class="form-input" id="m_wan_mac" value="${isWan1 ? '00:1A:2B:3C:4D:5E' : ''}" placeholder="vazio = MAC físico do hardware">
                            <button type="button" class="ark-btn ark-btn-secondary" onclick="document.getElementById('m_wan_mac').value = '00:1A:2B:3C:4D:5E'">Copiar MAC Físico</button>
                        </div>
                    </div>

                    <!-- Isolated ONU Bridge IP -->
                    <div class="form-group">
                        <label class="form-label">Acesso Isolado à Web GUI da ONU / Modem Bridge</label>
                        <div style="display:flex; gap:8px;">
                            <input type="text" class="form-input" id="m_wan_modem_ip" value="192.168.1.1" placeholder="ex: 192.168.1.1">
                            <button type="button" class="ark-btn ark-btn-secondary" onclick="window.open('http://' + document.getElementById('m_wan_modem_ip').value, '_blank')">🔗 Testar Acesso</button>
                        </div>
                    </div>

                    <!-- Multi-WAN Metric -->
                    <div class="form-group">
                        <label class="form-label">Métrica de Roteamento Multi-WAN (mwan3)</label>
                        <input type="number" class="form-input" id="m_wan_metric" value="${isWan1 ? '10' : '20'}" min="1" max="255">
                        <small style="color:#94a3b8; font-size:0.75rem;">Métrica menor tem maior prioridade. Métrica igual ativa balanceamento de carga.</small>
                    </div>

                    <!-- IPv6 Connectivity & Prefix Delegation (V1 Canonical) -->
                    <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <div>
                                <strong style="color:#fff; font-size:0.88rem;">Conectividade IPv6 Global nesta WAN</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Obtém endereço IPv6 público da operadora via DHCPv6 ou SLAAC</div>
                            </div>
                            <label class="ark-switch"><input type="checkbox" id="m_wan_ipv6" checked onchange="toggleIpv6Delegate(this.checked)"><span class="ark-slider"></span></label>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
                            <div>
                                <strong style="color:#fff; font-size:0.88rem;">Distribuição de Prefixo IPv6 (DHCPv6-PD)</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;" id="m_wan_pd_hint">Distribui bloco /56 ou /64 público desta operadora para os dispositivos locais</div>
                            </div>
                            <label class="ark-switch"><input type="checkbox" id="m_wan_delegate" ${isWan1 ? 'checked' : ''}><span class="ark-slider"></span></label>
                        </div>
                    </div>

                    <!-- Direct Action Buttons from V1 -->
                    <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                        <button type="button" class="ark-btn ark-btn-secondary" style="flex:1; min-height:42px;" onclick="openModal('pppoe_logs')">📜 Ver Logs PPPoE ao Vivo</button>
                        <button type="button" class="ark-btn ark-btn-secondary" style="flex:1; min-height:42px;" onclick="openModal('wan_optimizations')">⚙️ Otimizações Avançadas</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="saveWanModal('${name}')">💾 Salvar e Aplicar Conexão</button>
                </div>
            `;
        }

        function toggleWanProtoFields(proto) {
            const pppoeBox = document.getElementById('wan_pppoe_fields');
            const pppoeProfileBar = document.getElementById('wan_pppoe_profile_bar');
            const dhcpBox = document.getElementById('wan_dhcp_fields');
            const staticBox = document.getElementById('wan_static_fields');
            if (pppoeBox) pppoeBox.style.display = (proto === 'pppoe') ? 'block' : 'none';
            if (pppoeProfileBar) pppoeProfileBar.style.display = (proto === 'pppoe') ? 'block' : 'none';
            if (dhcpBox) dhcpBox.style.display = (proto === 'dhcp') ? 'block' : 'none';
            if (staticBox) staticBox.style.display = (proto === 'static') ? 'block' : 'none';
        }

        function togglePassVisibility(inputId, btn) {
            const input = document.getElementById(inputId);
            if (!input) return;
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            btn.textContent = isPass ? '🔒 Ocultar' : '👁️ Ver';
        }

        function applyDnsPreset(val) {
            const input = document.getElementById('m_wan_dns');
            if (input && val !== 'custom') {
                input.value = val;
            }
        }

        function openRadioModal(band) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');

            let channelOptions = band === '2.4' 
                ? '<option value="auto" selected>Auto (Canal 6)</option><option value="1">Canal 1</option><option value="6">Canal 6</option><option value="11">Canal 11</option>'
                : (band === '5'
                    ? '<option value="auto" selected>Auto (Canal 36)</option><option value="36">Canal 36</option><option value="40">Canal 40</option><option value="149">Canal 149</option>'
                    : '<option value="auto" selected>Auto (Canal 37 PSC)</option><option value="37">Canal 37 PSC</option><option value="53">Canal 53 PSC</option>');

            let widthOptions = band === '2.4'
                ? '<option value="20" selected>20 MHz (Padrão)</option><option value="40">20/40 MHz Misto</option>'
                : (band === '5'
                    ? '<option value="160" selected>160 MHz Ultra (Wi-Fi 6)</option><option value="80">80 MHz</option><option value="40">40 MHz</option>'
                    : '<option value="320" selected>320 MHz Extremo (Wi-Fi 7 BE)</option><option value="160">160 MHz</option>');

            cont.innerHTML = `
                <div class="modal-header">
                    <h3>📶 Configurar Rádio — ${band} GHz</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Canal de Operação</label>
                        <select class="form-select" id="m_radio_ch">${channelOptions}</select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Largura de Banda</label>
                        <select class="form-select" id="m_radio_width">${widthOptions}</select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Potência de Transmissão</label>
                        <select class="form-select" id="m_radio_tx">
                            <option value="20" selected>20 dBm (100 mW - Equilibrado)</option>
                            <option value="23">23 dBm (200 mW - Alto Alcance)</option>
                            <option value="26">26 dBm (400 mW - Máximo Anatel)</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="saveRadioModal('${band}')">💾 Salvar Rádio</button>
                </div>
            `;
        }

        function saveRadioModal(band) {
            const ch = document.getElementById('m_radio_ch').options[document.getElementById('m_radio_ch').selectedIndex].text;
            const width = document.getElementById('m_radio_width').options[document.getElementById('m_radio_width').selectedIndex].text.split(' ')[0];
            const tx = document.getElementById('m_radio_tx').value;

            if (band === '2.4') {
                document.getElementById('ch_radio_24').textContent = ch;
                document.getElementById('width_radio_24').textContent = width + ' MHz';
                document.getElementById('tx_radio_24').textContent = `${tx} dBm (100 mW)`;
            } else if (band === '5') {
                document.getElementById('ch_radio_5').textContent = ch;
                document.getElementById('width_radio_5').textContent = width + ' MHz Ultra';
                document.getElementById('tx_radio_5').textContent = `${tx} dBm (200 mW)`;
            } else {
                document.getElementById('ch_radio_6').textContent = ch;
                document.getElementById('width_radio_6').textContent = width + ' MHz (Extremo)';
                document.getElementById('tx_radio_6').textContent = `${tx} dBm (200 mW)`;
            }
            closeModal();
            showToast(`📶 Rádio ${band} GHz reconfigurado!`);
        }

        // =========================================================================
        // WI-FI NETWORKS (SSIDs / VAPs) ENGINE & AUTHENTIC QR CODES
        // =========================================================================

        function renderWifiNetworks() {
            const container = document.getElementById('wifi_networks_list');
            if (!container) return;

            const badgeTotal = document.getElementById('badge_total_wifi_clients');
            const badgeCount = document.getElementById('badge_ssid_count');

            let totalClients = 0;
            let activeCount = 0;

            let html = '';
            WIFI_NETWORKS.forEach(net => {
                if (net.active) {
                    totalClients += (net.clients || 0);
                    activeCount++;
                }

                const radiosHtml = net.radios.map(r => {
                    const color = r === '2.4' ? 'pill-amber' : (r === '5' ? 'pill-cyan' : 'pill-purple');
                    return `<span class="pill-badge ${color}" style="font-size:0.7rem; padding:2px 8px;">${r} GHz</span>`;
                }).join(' ');

                const limitText = (net.limitDown > 0 || net.limitUp > 0)
                    ? `⬇️ ${net.limitDown} Mbps / ⬆️ ${net.limitUp} Mbps`
                    : '⚡ Ilimitado (Velocidade Máxima)';

                const isolationBadge = net.isolate
                    ? '<span class="pill-badge pill-amber" style="font-size:0.7rem;">🛡️ Isolamento AP Ativo</span>'
                    : '<span class="pill-badge pill-online" style="font-size:0.7rem;">🌐 LAN Completa</span>';

                html += `
                    <div class="wifi-network-card ${net.active ? '' : 'disabled'}" id="card_${net.id}">
                        <div class="wifi-net-top">
                            <div class="wifi-net-title-group">
                                <span style="font-size:1.1rem; color:${net.active ? '#10b981' : '#64748b'};" title="${net.active ? 'Transmitindo beacon' : 'Desativada'}">●</span>
                                <div>
                                    <div class="wifi-net-ssid">${net.ssid}</div>
                                    <div class="wifi-net-alias">${net.alias}</div>
                                </div>
                                <span class="pill-badge ${net.badgeType}">${net.badgeText}</span>
                                ${isolationBadge}
                            </div>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <span style="font-size:0.8rem; font-weight:700; color:${net.active ? '#10b981' : '#94a3b8'};">
                                    ${net.active ? 'TRANSMITINDO' : 'DESATIVADA'}
                                </span>
                                <label class="ark-switch" title="Ligar ou desligar beacon desta rede">
                                    <input type="checkbox" ${net.active ? 'checked' : ''} onchange="toggleSsidActive('${net.id}', this.checked)">
                                    <span class="ark-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div class="wifi-net-grid">
                            <div class="wifi-net-item">
                                <span>BSSID (Endereço MAC)</span>
                                <strong><code>${net.bssid}</code></strong>
                            </div>
                            <div class="wifi-net-item">
                                <span>Senha da Rede Sem Fio</span>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <strong id="pwd_val_${net.id}">••••••••••••</strong>
                                    <button style="background:none; border:none; color:#38bdf8; cursor:pointer; font-size:0.8rem; font-weight:700;" onclick="toggleWifiNetPass('${net.id}')" title="Mostrar/Ocultar Senha">👁️</button>
                                    <button style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:0.8rem;" onclick="copyTextToClipboard('${net.pass}', 'Senha')" title="Copiar Senha">📋</button>
                                </div>
                            </div>
                            <div class="wifi-net-item">
                                <span>Rádios Físicos de Transmissão</span>
                                <div style="display:flex; gap:4px; margin-top:2px;">${radiosHtml}</div>
                            </div>
                            <div class="wifi-net-item">
                                <span>Criptografia & Segurança</span>
                                <strong>${net.cryptoLabel}</strong>
                            </div>
                            <div class="wifi-net-item">
                                <span>Aparelhos Conectados</span>
                                <strong style="color:#38bdf8;">👥 ${net.clients || 0} dispositivos</strong>
                            </div>
                            <div class="wifi-net-item">
                                <span>Limite de Tráfego / QoS</span>
                                <strong>${limitText}</strong>
                            </div>
                        </div>

                        <div class="wifi-net-actions">
                            <div style="font-size:0.75rem; color:#94a3b8;">
                                Modo: <strong style="color:#cbd5e1;">${net.modeLabel}</strong>
                                ${net.hidden ? ' | <span style="color:#f59e0b;">⚠️ SSID Oculto</span>' : ''}
                                ${net.roaming ? ' | <span style="color:#10b981;">✓ 802.11k/v Roaming</span>' : ''}
                            </div>
                            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                <button class="ark-btn ark-btn-secondary" onclick="openEditSsidModal('${net.id}')" title="Editar nome, senha, bandas e parâmetros">
                                    ⚙️ Editar SSID
                                </button>
                                <button class="ark-btn ark-btn-secondary" onclick="openModal('wifi_qr', '${net.id}')" title="Gerar QR Code de conexão rápida">
                                    📲 QR Code
                                </button>
                                <button class="ark-btn ark-btn-secondary" onclick="showSsidClients('${net.ssid}')" title="Visualizar aparelhos conectados nesta rede">
                                    👥 Ver Clientes (${net.clients})
                                </button>
                                ${net.id !== 'net_main' ? `
                                    <button class="ark-btn ark-btn-secondary" style="color:#f43f5e; border-color:rgba(244,63,94,0.3);" onclick="deleteSsid('${net.id}')" title="Excluir esta rede sem fio">
                                        🗑️
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;

            if (badgeTotal) badgeTotal.textContent = `${totalClients} Clientes Sem Fio`;
            if (badgeCount) badgeCount.textContent = `${activeCount} Redes Ativas`;
        }

        function toggleWifiNetPass(netId) {
            const net = WIFI_NETWORKS.find(n => n.id === netId);
            const el = document.getElementById('pwd_val_' + netId);
            if (!net || !el) return;
            if (el.textContent === '••••••••••••') {
                el.textContent = net.pass;
                el.style.color = '#38bdf8';
            } else {
                el.textContent = '••••••••••••';
                el.style.color = '#f1f5f9';
            }
        }

        function toggleSsidActive(netId, isChecked) {
            const net = WIFI_NETWORKS.find(n => n.id === netId);
            if (!net) return;
            net.active = isChecked;
            renderWifiNetworks();
            showToast(`📡 Rede "${net.ssid}" ${isChecked ? 'ativada e transmitindo beacon!' : 'desativada temporariamente!'}`);
        }

        function toggleRadioPhy(band, isChecked) {
            const cardId = band === '2.4' ? 'card_radio_24' : (band === '5' ? 'card_radio_5' : 'card_radio_6');
            const card = document.getElementById(cardId);
            if (card) {
                if (isChecked) {
                    card.classList.remove('disabled');
                } else {
                    card.classList.add('disabled');
                }
            }
            showToast(`📻 Hardware do Rádio ${band} GHz ${isChecked ? 'ligado e operacional!' : 'desligado via hardware transceiver!'}`);
        }

        function openEditSsidModal(netId) {
            const net = WIFI_NETWORKS.find(n => n.id === netId);
            if (!net) return;

            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');

            cont.innerHTML = `
                <div class="modal-header">
                    <h3>⚙️ Editar Rede Wi-Fi — ${net.ssid}</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Nome da Rede Wi-Fi (SSID)</label>
                        <input type="text" class="form-input" id="edit_ssid_name" value="${net.ssid}" maxlength="32">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Descrição / Apelido da Rede</label>
                        <input type="text" class="form-input" id="edit_ssid_alias" value="${net.alias}" maxlength="60">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Senha de Acesso (WPA Passphrase — Mínimo 8 dígitos)</label>
                        <div style="display:flex; gap:8px;">
                            <input type="text" class="form-input" id="edit_ssid_pass" value="${net.pass}" maxlength="63">
                            <button type="button" class="ark-btn ark-btn-secondary" onclick="generateRandomPass('edit_ssid_pass')">🎲 Gerar</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Criptografia & Algoritmo de Blindagem</label>
                        <select class="form-select" id="edit_ssid_crypto">
                            <option value="mixed" ${net.crypto === 'mixed' ? 'selected' : ''}>WPA3-SAE / WPA2-PSK Misto + PMF (Recomendado para Compatibilidade)</option>
                            <option value="sae" ${net.crypto === 'sae' ? 'selected' : ''}>WPA3-SAE Puro (Wi-Fi 6E & 7 — Máxima Segurança sem fallback)</option>
                            <option value="psk2" ${net.crypto === 'psk2' ? 'selected' : ''}>WPA2-PSK Legado (AES-CCMP para Dispositivos Antigos)</option>
                            <option value="open" ${net.crypto === 'open' ? 'selected' : ''}>Aberta (Sem Senha — Apenas com Captive Portal)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Rádios Físicos Vinculados (Transmissão de RF)</label>
                        <div style="display:flex; gap:16px; flex-wrap:wrap; padding:6px 0;">
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" id="edit_ssid_radio_24" ${net.radios.includes('2.4') ? 'checked' : ''}>
                                <span>Rádio 2.4 GHz</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" id="edit_ssid_radio_5" ${net.radios.includes('5') ? 'checked' : ''}>
                                <span>Rádio 5 GHz</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" id="edit_ssid_radio_6" ${net.radios.includes('6') ? 'checked' : ''}>
                                <span>Rádio 6 GHz (Wi-Fi 7)</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Modo de Rede & Destino do Tráfego</label>
                        <select class="form-select" id="edit_ssid_mode">
                            <option value="lan" ${net.mode === 'lan' ? 'selected' : ''}>Rede Principal (Acesso Completo à LAN e Roteador)</option>
                            <option value="guest" ${net.mode === 'guest' ? 'selected' : ''}>Rede de Visitantes (Acesso Exclusivo à Internet / Isolada da Intranet)</option>
                            <option value="iot" ${net.mode === 'iot' ? 'selected' : ''}>Rede IoT / Casa Inteligente (Segmentada na VLAN 30)</option>
                        </select>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div class="form-group">
                            <label class="form-label">Limite Download (Mbps)</label>
                            <input type="number" class="form-input" id="edit_ssid_down" value="${net.limitDown || 0}" min="0" placeholder="0 = Ilimitado">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Limite Upload (Mbps)</label>
                            <input type="number" class="form-input" id="edit_ssid_up" value="${net.limitUp || 0}" min="0" placeholder="0 = Ilimitado">
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#cbd5e1; cursor:pointer;">
                            <input type="checkbox" id="edit_ssid_hidden" ${net.hidden ? 'checked' : ''}>
                            <span>Ocultar SSID (Desativar anúncio público em beacons de varredura)</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#cbd5e1; cursor:pointer;">
                            <input type="checkbox" id="edit_ssid_isolate" ${net.isolate ? 'checked' : ''}>
                            <span>Isolamento de Clientes (AP Isolation — Impede comunicação lateral entre dispositivos)</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#cbd5e1; cursor:pointer;">
                            <input type="checkbox" id="edit_ssid_roaming" ${net.roaming ? 'checked' : ''}>
                            <span>Ativar Fast Roaming 802.11r/k/v (Transição suave sem queda de chamadas)</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="saveEditSsid('${net.id}')">💾 Salvar Alterações</button>
                </div>
            `;
        }

        function saveEditSsid(netId) {
            const net = WIFI_NETWORKS.find(n => n.id === netId);
            if (!net) return;

            const newName = document.getElementById('edit_ssid_name').value.trim();
            const newAlias = document.getElementById('edit_ssid_alias').value.trim();
            const newPass = document.getElementById('edit_ssid_pass').value.trim();
            const newCrypto = document.getElementById('edit_ssid_crypto').value;
            const newMode = document.getElementById('edit_ssid_mode').value;
            const newDown = parseInt(document.getElementById('edit_ssid_down').value) || 0;
            const newUp = parseInt(document.getElementById('edit_ssid_up').value) || 0;

            const r24 = document.getElementById('edit_ssid_radio_24').checked;
            const r5 = document.getElementById('edit_ssid_radio_5').checked;
            const r6 = document.getElementById('edit_ssid_radio_6').checked;

            const radios = [];
            if (r24) radios.push('2.4');
            if (r5) radios.push('5');
            if (r6) radios.push('6');

            if (radios.length === 0) {
                showToast('⚠️ Selecione ao menos um rádio físico para transmitir!');
                return;
            }

            net.ssid = newName || net.ssid;
            net.alias = newAlias || net.alias;
            net.pass = newPass || net.pass;
            net.crypto = newCrypto;
            net.cryptoLabel = newCrypto === 'mixed' ? 'WPA3-SAE / WPA2-PSK Misto + PMF'
                : (newCrypto === 'sae' ? 'WPA3-SAE Puro' : (newCrypto === 'psk2' ? 'WPA2-PSK Legado' : 'Aberta (Sem Senha)'));
            net.mode = newMode;
            net.modeLabel = newMode === 'guest' ? 'Isolada da Intranet (Apenas Internet)'
                : (newMode === 'iot' ? 'VLAN 30 (Segmentada)' : 'LAN Principal (Acesso total)');
            net.limitDown = newDown;
            net.limitUp = newUp;
            net.radios = radios;
            net.hidden = document.getElementById('edit_ssid_hidden').checked;
            net.isolate = document.getElementById('edit_ssid_isolate').checked;
            net.roaming = document.getElementById('edit_ssid_roaming').checked;

            // Sync with QR Data if exists
            const qrKey = netId === 'net_main' ? 'main' : (netId === 'net_guest' ? 'guest' : (netId === 'net_iot' ? 'iot' : null));
            if (qrKey && window._wifiQrData[qrKey]) {
                window._wifiQrData[qrKey].ssid = net.ssid;
                window._wifiQrData[qrKey].pass = net.pass;
                window._wifiQrData[qrKey].sec = net.cryptoLabel;
            }

            closeModal();
            renderWifiNetworks();
            showToast(`✅ Rede Wi-Fi "${net.ssid}" atualizada com sucesso!`);
        }

        function renderAddWifiNetworkModal(preselectedRadio) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');

            cont.innerHTML = `
                <div class="modal-header">
                    <h3>➕ Criar Nova Rede Sem Fio (Novo SSID / VAP)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Perfil da Nova Rede (Preenchimento Rápido)</label>
                        <select class="form-select" id="new_ssid_profile" onchange="applySsidProfile(this.value)">
                            <option value="guest" selected>🤝 Rede de Visitantes / Hóspedes (Isolada com Limite de 25 Mbps)</option>
                            <option value="iot">🏠 Rede de Automação IoT (2.4 GHz Exclusivo para Sonoff / Tuya / ESP32)</option>
                            <option value="gamer">🎮 Rede Gamer de Baixa Latência (Express QoS com prioridade)</option>
                            <option value="work">💼 Rede Escritório / Home Office (Segmentada)</option>
                            <option value="custom">⚙️ Personalizado (Configurar Manualmente)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Nome da Nova Rede Sem Fio (SSID)</label>
                        <input type="text" class="form-input" id="new_ssid_name" value="Wi-Fi-H&R-Visitantes-2" maxlength="32" placeholder="Ex: Meu-Wi-Fi-Novo">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Descrição / Finalidade</label>
                        <input type="text" class="form-input" id="new_ssid_alias" value="Segunda Rede de Visitantes" maxlength="60">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Senha de Acesso (WPA Passphrase — Mínimo 8 dígitos)</label>
                        <div style="display:flex; gap:8px;">
                            <input type="text" class="form-input" id="new_ssid_pass" value="Visitas@2026!" maxlength="63">
                            <button type="button" class="ark-btn ark-btn-secondary" onclick="generateRandomPass('new_ssid_pass')">🎲 Gerar</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Rádios Físicos de Transmissão</label>
                        <div style="display:flex; gap:16px; flex-wrap:wrap; padding:6px 0;">
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" id="new_ssid_radio_24" ${(!preselectedRadio || preselectedRadio === '2.4') ? 'checked' : ''}>
                                <span>Rádio 2.4 GHz</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" id="new_ssid_radio_5" ${(preselectedRadio === '5' || !preselectedRadio) ? 'checked' : ''}>
                                <span>Rádio 5 GHz</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" id="new_ssid_radio_6" ${preselectedRadio === '6' ? 'checked' : ''}>
                                <span>Rádio 6 GHz (Wi-Fi 7)</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Criptografia & Segurança</label>
                        <select class="form-select" id="new_ssid_crypto">
                            <option value="mixed" selected>WPA3-SAE / WPA2-PSK Misto + PMF (Recomendado)</option>
                            <option value="sae">WPA3-SAE Puro (Apenas Dispositivos Modernos)</option>
                            <option value="psk2">WPA2-PSK Legado</option>
                            <option value="open">Aberta (Sem Senha)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Modo de Rede & Isolamento</label>
                        <select class="form-select" id="new_ssid_mode">
                            <option value="guest" selected>Rede de Visitantes (Isolada da Intranet / Apenas Internet)</option>
                            <option value="lan">Rede Principal (Acesso Completo à LAN)</option>
                            <option value="iot">Rede IoT (Segmentada na VLAN 30)</option>
                        </select>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div class="form-group">
                            <label class="form-label">Limite Download (Mbps)</label>
                            <input type="number" class="form-input" id="new_ssid_down" value="25" min="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Limite Upload (Mbps)</label>
                            <input type="number" class="form-input" id="new_ssid_up" value="10" min="0">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="saveNewSsid()">➕ Criar e Transmitir Rede</button>
                </div>
            `;
        }

        function applySsidProfile(prof) {
            const name = document.getElementById('new_ssid_name');
            const alias = document.getElementById('new_ssid_alias');
            const pass = document.getElementById('new_ssid_pass');
            const mode = document.getElementById('new_ssid_mode');
            const r24 = document.getElementById('new_ssid_radio_24');
            const r5 = document.getElementById('new_ssid_radio_5');
            const r6 = document.getElementById('new_ssid_radio_6');
            const down = document.getElementById('new_ssid_down');
            const up = document.getElementById('new_ssid_up');

            if (prof === 'guest') {
                if (name) name.value = 'Wi-Fi-Visitantes-2';
                if (alias) alias.value = 'Rede de Visitantes & Hóspedes';
                if (pass) pass.value = 'Visitas@2026!';
                if (mode) mode.value = 'guest';
                if (r24) r24.checked = true;
                if (r5) r5.checked = true;
                if (r6) r6.checked = false;
                if (down) down.value = '25';
                if (up) up.value = '10';
            } else if (prof === 'iot') {
                if (name) name.value = 'Wi-Fi-IoT-Sensores';
                if (alias) alias.value = 'Rede Exclusiva 2.4G para Automação';
                if (pass) pass.value = 'SmartHomeSecure26';
                if (mode) mode.value = 'iot';
                if (r24) r24.checked = true;
                if (r5) r5.checked = false;
                if (r6) r6.checked = false;
                if (down) down.value = '10';
                if (up) up.value = '5';
            } else if (prof === 'gamer') {
                if (name) name.value = 'Wi-Fi-Gamer-Ultra';
                if (alias) alias.value = 'Rede Gamer com QoS CAKE Express';
                if (pass) pass.value = 'GamerUltraFast2026';
                if (mode) mode.value = 'lan';
                if (r24) r24.checked = false;
                if (r5) r5.checked = true;
                if (r6) r6.checked = true;
                if (down) down.value = '0';
                if (up) up.value = '0';
            } else if (prof === 'work') {
                if (name) name.value = 'Wi-Fi-HomeOffice';
                if (alias) alias.value = 'Rede Corporativa / Trabalho Remoto';
                if (pass) pass.value = 'WorkOffice@2026!';
                if (mode) mode.value = 'lan';
                if (r24) r24.checked = true;
                if (r5) r5.checked = true;
                if (r6) r6.checked = true;
                if (down) down.value = '0';
                if (up) up.value = '0';
            }
        }

        function saveNewSsid() {
            const name = document.getElementById('new_ssid_name').value.trim();
            const alias = document.getElementById('new_ssid_alias').value.trim();
            const pass = document.getElementById('new_ssid_pass').value.trim();
            const crypto = document.getElementById('new_ssid_crypto').value;
            const mode = document.getElementById('new_ssid_mode').value;
            const down = parseInt(document.getElementById('new_ssid_down').value) || 0;
            const up = parseInt(document.getElementById('new_ssid_up').value) || 0;

            const r24 = document.getElementById('new_ssid_radio_24').checked;
            const r5 = document.getElementById('new_ssid_radio_5').checked;
            const r6 = document.getElementById('new_ssid_radio_6').checked;

            if (!name) {
                showToast('⚠️ Informe o nome da rede (SSID)!');
                return;
            }

            const radios = [];
            if (r24) radios.push('2.4');
            if (r5) radios.push('5');
            if (r6) radios.push('6');

            if (radios.length === 0) {
                showToast('⚠️ Selecione ao menos um rádio físico!');
                return;
            }

            const newId = 'net_' + Date.now();
            const newNet = {
                id: newId,
                ssid: name,
                alias: alias || name,
                pass: pass || '12345678',
                active: true,
                radios: radios,
                bssid: '70:9e:29:ab:11:' + (WIFI_NETWORKS.length + 1).toString(16).padStart(2, '0'),
                crypto: crypto,
                cryptoLabel: crypto === 'mixed' ? 'WPA3-SAE / WPA2-PSK Misto' : (crypto === 'sae' ? 'WPA3-SAE Puro' : 'WPA2-PSK Legado'),
                mode: mode,
                modeLabel: mode === 'guest' ? 'Isolada da Intranet (Apenas Internet)' : (mode === 'iot' ? 'VLAN 30 (Segmentada)' : 'LAN Principal'),
                clients: 0,
                limitDown: down,
                limitUp: up,
                hidden: false,
                isolate: mode === 'guest',
                roaming: true,
                badgeType: radios.length > 1 ? 'pill-cyan' : 'pill-amber',
                badgeText: radios.length === 3 ? 'Tri-Band (2.4G/5G/6G)' : (radios.length === 2 ? 'Dual-Band' : `${radios[0]} GHz`)
            };

            WIFI_NETWORKS.push(newNet);

            // Register QR code data for the new network
            if (window._wifiQrData && window._wifiQrData['main']) {
                window._wifiQrData[newId] = {
                    id: newId,
                    name: newNet.ssid,
                    label: newNet.ssid,
                    ssid: newNet.ssid,
                    pass: newNet.pass,
                    sec: newNet.cryptoLabel,
                    band: newNet.badgeText,
                    clients: 0,
                    bssid: newNet.bssid,
                    payload: `WIFI:T:WPA;S:${newNet.ssid};P:${newNet.pass};;`,
                    svg: window._wifiQrData['main'].svg // Fallback standard scannable matrix template
                };
            }

            closeModal();
            renderWifiNetworks();
            showToast(`✅ Nova rede sem fio "${name}" criada e transmitindo com sucesso!`);
        }

        function deleteSsid(netId) {
            const idx = WIFI_NETWORKS.findIndex(n => n.id === netId);
            if (idx === -1) return;
            const name = WIFI_NETWORKS[idx].ssid;
            WIFI_NETWORKS.splice(idx, 1);
            renderWifiNetworks();
            showToast(`🗑️ Rede "${name}" removida com sucesso!`);
        }

        function generateRandomPass(targetInputId) {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
            let pass = '';
            for (let i = 0; i < 14; i++) {
                pass += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const inp = document.getElementById(targetInputId);
            if (inp) {
                inp.value = pass;
                showToast(`🎲 Senha segura gerada: ${pass}`);
            }
        }

        function showSsidClients(ssid) {
            switchView('devices');
            showToast(`👥 Exibindo clientes da rede "${ssid}"`);
        }

        // =========================================================================
        // WI-FI QR CODE MODAL WITH AUTHENTIC SCANNABLE MATRIX
        // =========================================================================

        function renderWifiQrModal(initialNetKey) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');

            // Normalize key if net ID was passed
            let mappedKey = initialNetKey || 'main';
            if (mappedKey === 'net_main') mappedKey = 'main';
            else if (mappedKey === 'net_guest') mappedKey = 'guest';
            else if (mappedKey === 'net_iot') mappedKey = 'iot';

            if (!window._wifiQrData || !window._wifiQrData[mappedKey]) {
                mappedKey = 'main';
            }

            currentQrNetwork = mappedKey;

            cont.innerHTML = `
                <div class="modal-header">
                    <h3>📲 Conexão Wi-Fi via QR Code Oficial</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body" style="text-align:center;">
                    <!-- Network Switcher Tabs -->
                    <div style="display:flex; justify-content:center; gap:6px; flex-wrap:wrap; margin-bottom:14px;">
                        <button type="button" class="wifi-qr-tab ${mappedKey === 'main' ? 'active' : ''}" id="qr_tab_main" onclick="switchQrNetwork('main')">
                            🌐 Principal (Wi-Fi-H&R)
                        </button>
                        <button type="button" class="wifi-qr-tab ${mappedKey === 'guest' ? 'active' : ''}" id="qr_tab_guest" onclick="switchQrNetwork('guest')">
                            🤝 Visitantes
                        </button>
                        <button type="button" class="wifi-qr-tab ${mappedKey === 'iot' ? 'active' : ''}" id="qr_tab_iot" onclick="switchQrNetwork('iot')">
                            🏠 IoT 2.4G
                        </button>
                        <button type="button" class="wifi-qr-tab ${mappedKey === '5g' ? 'active' : ''}" id="qr_tab_5g" onclick="switchQrNetwork('5g')">
                            ⚡ 5 GHz
                        </button>
                        <button type="button" class="wifi-qr-tab ${mappedKey === '6g' ? 'active' : ''}" id="qr_tab_6g" onclick="switchQrNetwork('6g')">
                            🚀 6 GHz Wi-Fi 7
                        </button>
                    </div>

                    <!-- Authentic Scannable QR Frame -->
                    <div class="wifi-qr-frame" id="qr_svg_frame">
                        ${window._wifiQrData[mappedKey].svg}
                    </div>

                    <div style="margin-top:10px;">
                        <h4 style="color:#fff; font-size:1.25rem; margin-bottom:4px;" id="qr_display_ssid">
                            ${window._wifiQrData[mappedKey].ssid}
                        </h4>
                        <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); padding:6px 14px; border-radius:20px; margin:6px 0;">
                            <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase;">Senha:</span>
                            <code style="color:#38bdf8; font-size:0.95rem; font-weight:700;" id="qr_display_pass">${window._wifiQrData[mappedKey].pass}</code>
                            <button type="button" style="background:none; border:none; color:#cbd5e1; cursor:pointer; font-size:0.85rem;" onclick="copyQrPassword()" title="Copiar Senha">📋 Copiar</button>
                        </div>
                        <div style="font-size:0.8rem; color:#94a3b8; margin-top:6px;" id="qr_display_details">
                            Blindagem: <strong style="color:#cbd5e1;">${window._wifiQrData[mappedKey].sec}</strong> | 
                            Banda: <strong style="color:#cbd5e1;">${window._wifiQrData[mappedKey].band}</strong>
                        </div>
                        <p style="font-size:0.8rem; color:#64748b; margin-top:8px;">
                            📷 Aponte a câmera do seu celular (iOS ou Android) para este código para conectar automaticamente sem digitar senha.
                        </p>
                    </div>
                </div>
                <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="ark-btn ark-btn-secondary" onclick="copyConnectionInfo()">📋 Copiar Dados de Conexão</button>
                        <button class="ark-btn ark-btn-secondary" onclick="printWifiCard()">🖨️ Imprimir Cartão Wi-Fi</button>
                    </div>
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                </div>
            `;
        }

        function switchQrNetwork(netKey) {
            if (!window._wifiQrData || !window._wifiQrData[netKey]) return;
            currentQrNetwork = netKey;

            // Update Tabs
            document.querySelectorAll('.wifi-qr-tab').forEach(t => t.classList.remove('active'));
            const tabBtn = document.getElementById('qr_tab_' + netKey);
            if (tabBtn) tabBtn.classList.add('active');

            // Inject Real Scannable SVG
            const frame = document.getElementById('qr_svg_frame');
            if (frame) frame.innerHTML = window._wifiQrData[netKey].svg;

            // Update texts
            const dSsid = document.getElementById('qr_display_ssid');
            const dPass = document.getElementById('qr_display_pass');
            const dDetails = document.getElementById('qr_display_details');

            if (dSsid) dSsid.textContent = window._wifiQrData[netKey].ssid;
            if (dPass) dPass.textContent = window._wifiQrData[netKey].pass;
            if (dDetails) {
                dDetails.innerHTML = `Blindagem: <strong style="color:#cbd5e1;">${window._wifiQrData[netKey].sec}</strong> | Banda: <strong style="color:#cbd5e1;">${window._wifiQrData[netKey].band}</strong>`;
            }

            showToast(`📲 Exibindo QR Code oficial de "${window._wifiQrData[netKey].ssid}"`);
        }

        function copyQrPassword() {
            if (!window._wifiQrData || !window._wifiQrData[currentQrNetwork]) return;
            const pass = window._wifiQrData[currentQrNetwork].pass;
            copyTextToClipboard(pass, 'Senha');
        }

        function copyConnectionInfo() {
            if (!window._wifiQrData || !window._wifiQrData[currentQrNetwork]) return;
            const item = window._wifiQrData[currentQrNetwork];
            const text = `Nome da Rede (SSID): ${item.ssid}\nSenha de Acesso: ${item.pass}\nSegurança: ${item.sec}\nFrequência: ${item.band}`;
            copyTextToClipboard(text, 'Dados de Conexão');
        }

        function copyTextToClipboard(text, label) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(`📋 ${label} copiada para a área de transferência!`);
            }).catch(() => {
                showToast(`📋 ${label}: ${text}`);
            });
        }

        function printWifiCard() {
            if (!window._wifiQrData || !window._wifiQrData[currentQrNetwork]) return;
            const item = window._wifiQrData[currentQrNetwork];

            const printWindow = window.open('', '_blank', 'width=600,height=700');
            if (!printWindow) {
                window.print();
                return;
            }

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Cartão Wi-Fi — ${item.ssid}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #1e293b; text-align: center; padding: 40px; margin: 0; }
                        .card { border: 2px dashed #0284c7; border-radius: 16px; padding: 30px; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                        .logo { font-size: 1.5rem; font-weight: 900; color: #0284c7; letter-spacing: -0.02em; margin-bottom: 8px; }
                        .subtitle { font-size: 0.9rem; color: #64748b; margin-bottom: 20px; }
                        .qr-box { margin: 15px auto; width: 200px; height: 200px; }
                        .ssid { font-size: 1.4rem; font-weight: 800; color: #0f172a; margin-top: 15px; }
                        .pass-badge { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 16px; font-family: monospace; font-size: 1.1rem; font-weight: 700; color: #0369a1; margin: 12px 0; }
                        .instructions { font-size: 0.85rem; color: #64748b; line-height: 1.4; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="logo">ARK ROUTER OS</div>
                        <div class="subtitle">Conexão Wi-Fi Rápida & Segura</div>
                        <div class="qr-box">${item.svg}</div>
                        <div class="ssid">${item.ssid}</div>
                        <div class="pass-badge">Senha: ${item.pass}</div>
                        <div class="instructions">
                            Aponte a câmera do seu smartphone (iOS ou Android) para o código acima para conectar automaticamente.
                        </div>
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(() => { window.print(); }, 400);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
            showToast('🖨️ Janela de impressão do Cartão Wi-Fi aberta!');
        }

        function openDeviceModal(mac) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');
            const dev = DEVICES.find(d => d.mac === mac) || { name: 'Aparelho', ip: '192.168.1.100', mac: mac, type: 'phone', prio: 'normal' };

            cont.innerHTML = `
                <div class="modal-header">
                    <h3>📱 Gerenciar Aparelho — ${dev.name}</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Nome do Aparelho</label>
                        <input type="text" class="form-input" id="m_dev_name" value="${dev.name}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo de Aparelho</label>
                        <select class="form-select" id="m_dev_type">
                            <option value="phone" ${dev.type === 'phone' ? 'selected' : ''}>📱 Smartphone / Celular</option>
                            <option value="laptop" ${dev.type === 'laptop' ? 'selected' : ''}>💻 Computador / Notebook</option>
                            <option value="tv" ${dev.type === 'tv' ? 'selected' : ''}>📺 Smart TV / Streaming</option>
                            <option value="console" ${dev.type === 'console' ? 'selected' : ''}>🎮 Console de Games</option>
                            <option value="server" ${dev.type === 'server' ? 'selected' : ''}>🖥️ Servidor Local / NAS</option>
                            <option value="iot" ${dev.type === 'iot' ? 'selected' : ''}>🏠 Automação IoT / Lâmpada</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Controle Parental & Acesso à Internet (Firewall MAC)</label>
                        <select class="form-select" id="m_dev_parental">
                            <option value="allow" selected>Liberado (Acesso 24 Horas sem Restrições)</option>
                            <option value="block">🚫 Bloquear Acesso à Internet Imediatamente</option>
                            <option value="night">🌙 Bloqueio Noturno Automático (22h00 às 06h00)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Prioridade de Conexão (QoS CAKE)</label>
                        <select class="form-select" id="m_dev_prio">
                            <option value="normal" ${dev.prio === 'normal' ? 'selected' : ''}>Normal (Equilíbrio CAKE)</option>
                            <option value="gamer" ${dev.prio === 'gamer' ? 'selected' : ''}>⚡ Alta Prioridade Gamer (Express)</option>
                            <option value="high" ${dev.prio === 'high' ? 'selected' : ''}>Prioridade Elevada</option>
                            <option value="low" ${dev.prio === 'low' ? 'selected' : ''}>Segundo Plano (Baixa)</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="saveDeviceModal('${mac}')">💾 Salvar Alterações</button>
                </div>
            `;
        }

        function saveDeviceModal(mac) {
            const dev = DEVICES.find(d => d.mac === mac);
            if (dev) {
                dev.name = document.getElementById('m_dev_name').value;
                dev.type = document.getElementById('m_dev_type').value;
                dev.prio = document.getElementById('m_dev_prio').value;
            }
            closeModal();
            renderDevicesTable();
            showToast('✅ Aparelho atualizado com sucesso!');
        }

        // Modal Maximize & Fullscreen State
        function toggleModalMaximize() {
            const box = document.querySelector('.modal-box');
            const btns = document.querySelectorAll('.modal-maximize-btn');
            if (!box) return;
            const isFull = box.classList.toggle('modal-fullscreen');
            btns.forEach(b => {
                b.textContent = isFull ? '🗗' : '⛶';
                b.title = isFull ? 'Restaurar tamanho padrão' : 'Expandir para tela cheia';
            });
            showToast(isFull ? '⛶ Janela expandida para tela cheia!' : '🗗 Tamanho padrão restaurado.');
        }

        // PPPoE Saved Profiles Database
        let PPPOE_PROFILES = [
            { id: 'vivo', name: 'Vivo Fibra GPON', user: 'cliente@vivofibra.com.br', pass: 'vivo123', vlan: '10', mtu: '1492', mac: '00:1A:2B:3C:4D:5E', modem: '192.168.1.1' },
            { id: 'claro', name: 'Claro Fibra FTTH', user: 'cliente@clarofibra.com.br', pass: 'claro2026', vlan: '100', mtu: '1500', mac: '', modem: '192.168.0.1' },
            { id: 'oi', name: 'Oi Fibra Telecom', user: 'cliente@oifibra.com.br', pass: 'oi12345', vlan: '10', mtu: '1492', mac: '', modem: '192.168.1.254' }
        ];

        function loadPppoeProfile(profId) {
            if (!profId) return;
            const p = PPPOE_PROFILES.find(x => x.id === profId);
            if (!p) return;
            const u = document.getElementById('m_wan_user');
            const pw = document.getElementById('m_wan_pass');
            const v = document.getElementById('m_wan_vlan');
            const m = document.getElementById('m_wan_mtu');
            const mc = document.getElementById('m_wan_mac');
            const md = document.getElementById('m_wan_modem_ip');
            if (u) u.value = p.user;
            if (pw) pw.value = p.pass;
            if (v) v.value = p.vlan || '';
            if (m) m.value = p.mtu || '1492';
            if (mc) mc.value = p.mac || '';
            if (md) md.value = p.modem || '';
            const status = document.getElementById('pppoe_profile_status');
            if (status) {
                status.textContent = `✓ Perfil "${p.name}" aplicado!`;
                status.style.display = 'inline-block';
            }
            showToast(`✅ Perfil PPPoE "${p.name}" carregado nos campos!`);
        }

        function toggleSaveProfilePrompt() {
            const box = document.getElementById('pppoe_save_prompt_box');
            if (box) box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
        }

        function doSavePppoeProfile() {
            const nameInput = document.getElementById('pppoe_new_prof_name');
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) {
                alert('Informe um nome para o perfil (ex: Fibra Vivo, Provedor X).');
                return;
            }
            const user = document.getElementById('m_wan_user') ? document.getElementById('m_wan_user').value.trim() : '';
            const pass = document.getElementById('m_wan_pass') ? document.getElementById('m_wan_pass').value : '';
            const vlan = document.getElementById('m_wan_vlan') ? document.getElementById('m_wan_vlan').value.trim() : '';
            const mtu = document.getElementById('m_wan_mtu') ? document.getElementById('m_wan_mtu').value.trim() : '1492';
            const mac = document.getElementById('m_wan_mac') ? document.getElementById('m_wan_mac').value.trim() : '';
            const modem = document.getElementById('m_wan_modem_ip') ? document.getElementById('m_wan_modem_ip').value.trim() : '';

            const id = 'prof_' + Date.now();
            PPPOE_PROFILES.push({ id, name, user, pass, vlan, mtu, mac, modem });

            // Refresh select
            const sel = document.getElementById('m_wan_pppoe_profiles');
            if (sel) {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = `${name} (${user || 'sem usuário'})`;
                opt.selected = true;
                sel.appendChild(opt);
            }
            const box = document.getElementById('pppoe_save_prompt_box');
            if (box) box.style.display = 'none';
            if (nameInput) nameInput.value = '';
            showToast(`💾 Perfil PPPoE "${name}" salvo com sucesso!`);
        }

        function deleteSelectedPppoeProfile() {
            const sel = document.getElementById('m_wan_pppoe_profiles');
            if (!sel || !sel.value) {
                alert('Selecione um perfil salvo na lista para excluir.');
                return;
            }
            const profId = sel.value;
            const idx = PPPOE_PROFILES.findIndex(x => x.id === profId);
            if (idx >= 0) {
                const deletedName = PPPOE_PROFILES[idx].name;
                PPPOE_PROFILES.splice(idx, 1);
                sel.remove(sel.selectedIndex);
                sel.value = '';
                const status = document.getElementById('pppoe_profile_status');
                if (status) status.style.display = 'none';
                showToast(`🗑️ Perfil "${deletedName}" excluído.`);
            }
        }

        function reconnectWan(name) {
            showToast(`🔄 Reiniciando conexão ${name.toUpperCase()}…`);
            setTimeout(() => {
                showToast(`✅ ${name.toUpperCase()} reconectada com sucesso! IP renovado.`);
            }, 1200);
        }

        function toggleIpv6Delegate(isChecked) {
            const delSwitch = document.getElementById('m_wan_delegate');
            const hint = document.getElementById('m_wan_pd_hint');
            if (delSwitch) {
                delSwitch.disabled = !isChecked;
                if (!isChecked) delSwitch.checked = false;
            }
            if (hint) {
                hint.textContent = isChecked ? 
                    'Distribui bloco /56 ou /64 público desta operadora para os clientes da LAN' : 
                    'Requer conectividade IPv6 ativa nesta WAN.';
            }
        }

        function closeModal() {
            document.body.classList.remove('modal-overlay-active');
            const box = document.querySelector('.modal-box');
            if (box) box.classList.remove('modal-fullscreen');
            document.querySelectorAll('.modal-maximize-btn').forEach(b => {
                b.textContent = '⛶';
                b.title = 'Expandir para tela cheia';
            });
        }

        
        function setSqmValues(down, up) {
            const d = document.getElementById('m_sqm_down');
            const u = document.getElementById('m_sqm_up');
            if (d) d.value = down;
            if (u) u.value = up;
            showToast(`⚡ Presets aplicados: ${down} Mbps Download / ${up} Mbps Upload.`);
        }

        function toggleWifiSplitFields(isSplit) {
            const uni = document.getElementById('wifi_unified_fields');
            const spl = document.getElementById('wifi_split_fields');
            if (uni) uni.style.display = isSplit ? 'none' : 'block';
            if (spl) spl.style.display = isSplit ? 'flex' : 'none';
        }

        function generateWgKeypair() {
            const priv = document.getElementById('m_vpn_privkey');
            if (priv) {
                priv.value = 'y' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + '=';
                priv.type = 'text';
                showToast('🔑 Novo par de chaves WireGuard Curve25519 gerado com segurança!');
            }
        }

        function importWireguardFile(input) {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                const text = e.target.result;
                const privMatch = text.match(/PrivateKey\s*=\s*([^\r\n]+)/i);
                const addrMatch = text.match(/Address\s*=\s*([^\r\n]+)/i);
                const pubMatch = text.match(/PublicKey\s*=\s*([^\r\n]+)/i);
                const endMatch = text.match(/Endpoint\s*=\s*([^\r\n]+)/i);
                const allowedMatch = text.match(/AllowedIPs\s*=\s*([^\r\n]+)/i);

                if (privMatch && document.getElementById('m_vpn_privkey')) document.getElementById('m_vpn_privkey').value = privMatch[1].trim();
                if (addrMatch && document.getElementById('m_vpn_client_ip')) document.getElementById('m_vpn_client_ip').value = addrMatch[1].trim();
                if (pubMatch && document.getElementById('m_vpn_pubkey')) document.getElementById('m_vpn_pubkey').value = pubMatch[1].trim();
                if (endMatch && document.getElementById('m_vpn_endpoint')) document.getElementById('m_vpn_endpoint').value = endMatch[1].trim();
                if (allowedMatch && document.getElementById('m_vpn_allowed_ips')) document.getElementById('m_vpn_allowed_ips').value = allowedMatch[1].trim();

                showToast(`✅ Arquivo ${file.name} importado com sucesso! Campos preenchidos.`);
            };
            reader.readAsText(file);
        }

        function syncWithComputerTime() {
            const now = new Date();
            showToast(`⏰ Relógio sincronizado com o computador: ${now.toLocaleTimeString('pt-BR')} (Data: ${now.toLocaleDateString('pt-BR')})!`);
            closeModal();
        }

        function applyThemePreset(val) {
            const prim = document.getElementById('m_theme_color_primary');
            const sec = document.getElementById('m_theme_color_secondary');
            if (val === 'cyan') {
                if (prim) prim.value = '#0284c7';
                if (sec) sec.value = '#38bdf8';
            } else if (val === 'rog') {
                if (prim) prim.value = '#f43f5e';
                if (sec) sec.value = '#fb7185';
            } else if (val === 'emerald') {
                if (prim) prim.value = '#10b981';
                if (sec) sec.value = '#34d399';
            } else if (val === 'purple') {
                if (prim) prim.value = '#a855f7';
                if (sec) sec.value = '#c084fc';
            }
        }

        function saveThemeCustomization() {
            const brand = document.getElementById('m_theme_brand_name').value;
            const prim = document.getElementById('m_theme_color_primary').value;
            const topBrand = document.querySelector('.sidebar-title h1');
            if (topBrand) topBrand.textContent = brand;
            document.documentElement.style.setProperty('--ark-primary', prim);
            closeModal();
            showToast(`🎨 Tema "${brand}" aplicado com sucesso!`);
        }

        // =========================================================================
        // EZ-SETUP 8 SECTIONS (100% V1 FIDELITY) & PLUGINS ECOSYSTEM
        // =========================================================================

        let ezDraft = {
            hostname: 'ARK-Router',
            country: 'BR',
            wan1_proto: 'pppoe',
            wan1_user: 'cliente@fibra.com.br',
            wan1_pass: 'Fibra@2026',
            wan1_modem_ip: '192.168.1.1',
            wan1_mac: '',
            wan2_enabled: false,
            wan_mode: 'failover',
            wan2_port: 'lan1',
            wan2_proto: 'dhcp',
            wifi_mode: 'unified',
            wifi_ssid: 'Wi-Fi-H&R',
            wifi_pass: 'MinhaSenhaForte2026',
            guest_enabled: false,
            guest_ssid: 'Wi-Fi-Visitantes',
            guest_pass: 'Visita@2026',
            guest_down: '25',
            guest_up: '10',
            admin_enabled: false,
            admin_pass: '',
            dns_mode: 'recommended',
            ipv6: 'enable',
            disable_wps: true,
            sqm_enabled: true,
            sqm_down: '650',
            sqm_up: '320'
        };

        function renderEzSetupModal(cont) {
            cont.innerHTML = `
                <div class="modal-header">
                    <h3>⚡ Assistente de Setup Rápido ARK (8 Etapas Completas)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body" style="display:flex; flex-direction:column; gap:16px;">
                    <div style="background:rgba(56, 189, 248, 0.08); border:1px solid rgba(56, 189, 248, 0.25); border-radius:8px; padding:12px 14px; font-size:0.83rem; color:#bae6fd; line-height:1.45;">
                        💡 <strong>Configuração Integrada ARK OS:</strong> Configure todos os parâmetros essenciais de rede, segurança, Wi-Fi e otimização gamer com validação em tempo real.
                    </div>

                    <!-- SEÇÃO 1: IDENTIFICAÇÃO & REGIÃO -->
                    <div class="ez-section-box">
                        <div class="ez-section-title"><span>1️⃣</span> Identificação do Roteador & Região</div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
                            <div class="form-group">
                                <label class="form-label">Idioma da Interface</label>
                                <select class="form-select" id="ez_lang">
                                    <option value="pt-br" selected>Português (Brasil)</option>
                                    <option value="en">English (US)</option>
                                    <option value="es">Español</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Nome do Roteador (Hostname)</label>
                                <input type="text" class="form-input" id="ez_hostname" value="${ezDraft.hostname}" maxlength="40">
                            </div>
                            <div class="form-group">
                                <label class="form-label">País Regulatório Wi-Fi</label>
                                <select class="form-select" id="ez_country">
                                    <option value="BR" ${ezDraft.country === 'BR' ? 'selected' : ''}>Brasil (BR)</option>
                                    <option value="00" ${ezDraft.country === '00' ? 'selected' : ''}>Mundo / Driver Padrão - Max Power (00)</option>
                                    <option value="US" ${ezDraft.country === 'US' ? 'selected' : ''}>Estados Unidos (US)</option>
                                    <option value="PT" ${ezDraft.country === 'PT' ? 'selected' : ''}>Portugal (PT)</option>
                                    <option value="ES" ${ezDraft.country === 'ES' ? 'selected' : ''}>Espanha (ES)</option>
                                    <option value="AR" ${ezDraft.country === 'AR' ? 'selected' : ''}>Argentina (AR)</option>
                                    <option value="PA" ${ezDraft.country === 'PA' ? 'selected' : ''}>Panamá - Max Power (PA)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- SEÇÃO 2: PROVEDOR DE INTERNET & DUAL-WAN -->
                    <div class="ez-section-box">
                        <div class="ez-section-title"><span>2️⃣</span> Provedor de Internet & Modo Dual-WAN</div>
                        <div class="form-group">
                            <label class="form-label">Tipo de Conexão WAN 1 (Porta Principal da Fibra)</label>
                            <select class="form-select" id="ez_wan1_proto" onchange="toggleEzWan1Proto(this.value)">
                                <option value="pppoe" ${ezDraft.wan1_proto === 'pppoe' ? 'selected' : ''}>Fibra Ótica com Login (PPPoE - Usuário e Senha)</option>
                                <option value="dhcp" ${ezDraft.wan1_proto === 'dhcp' ? 'selected' : ''}>Modem Operadora / Starlink / Cabo (DHCP Automático - Plug & Play)</option>
                                <option value="static" ${ezDraft.wan1_proto === 'static' ? 'selected' : ''}>IP Fixo Corporativo / Manual (Estático)</option>
                            </select>
                        </div>

                        <!-- PPPoE WAN 1 Box -->
                        <div id="ez_wan1_pppoe_box" style="display:${ezDraft.wan1_proto === 'pppoe' ? 'grid' : 'none'}; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
                            <div class="form-group">
                                <label class="form-label">Usuário PPPoE</label>
                                <input type="text" class="form-input" id="ez_wan1_user" value="${ezDraft.wan1_user}" placeholder="ex: cliente@provedor">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Senha PPPoE</label>
                                <div style="display:flex; gap:6px;">
                                    <input type="password" class="form-input" id="ez_wan1_pass" value="${ezDraft.wan1_pass}">
                                    <button type="button" class="ark-btn ark-btn-secondary" onclick="togglePassVisibility('ez_wan1_pass', this)">👁️</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">IP de Acesso ao Modem / ONU (Opcional)</label>
                                <input type="text" class="form-input" id="ez_wan1_modem_ip" value="${ezDraft.wan1_modem_ip}" placeholder="ex: 192.168.1.1 ou 192.168.18.1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Clonar MAC da WAN (Opcional)</label>
                                <input type="text" class="form-input" id="ez_wan1_mac" value="${ezDraft.wan1_mac}" placeholder="ex: AA:BB:CC:DD:EE:FF">
                            </div>
                        </div>

                        <!-- Static WAN 1 Box -->
                        <div id="ez_wan1_static_box" style="display:${ezDraft.wan1_proto === 'static' ? 'grid' : 'none'}; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                            <div class="form-group">
                                <label class="form-label">Endereço IPv4 Fixo</label>
                                <input type="text" class="form-input" id="ez_wan1_ip" value="192.168.1.50">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Máscara de Rede</label>
                                <input type="text" class="form-input" id="ez_wan1_mask" value="255.255.255.0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Gateway Padrão</label>
                                <input type="text" class="form-input" id="ez_wan1_gw" value="192.168.1.1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Servidores DNS</label>
                                <input type="text" class="form-input" id="ez_wan1_dns" value="1.1.1.1 8.8.8.8">
                            </div>
                        </div>

                        <!-- WAN 2 (Dual-WAN) Sub-section -->
                        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px; margin-top:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong style="color:#fff; font-size:0.88rem;">Habilitar Segunda Internet (WAN 2 / Failover)</strong>
                                    <div style="font-size:0.75rem; color:#94a3b8;">Permite usar um segundo link (Starlink, 4G/5G ou segunda fibra) em porta LAN convertida</div>
                                </div>
                                <label class="ark-switch">
                                    <input type="checkbox" id="ez_wan2_toggle" ${ezDraft.wan2_enabled ? 'checked' : ''} onchange="toggleEzWan2Box(this.checked)">
                                    <span class="ark-slider"></span>
                                </label>
                            </div>

                            <div id="ez_wan2_subbox" style="display:${ezDraft.wan2_enabled ? 'flex' : 'none'}; flex-direction:column; gap:10px; margin-top:12px;">
                                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                                    <div class="form-group">
                                        <label class="form-label">Modo de Operação</label>
                                        <select class="form-select" id="ez_wan_mode">
                                            <option value="failover" selected>Failover (WAN1 principal, WAN2 reserva se cair)</option>
                                            <option value="balanced">Balanceamento (dividir conexões entre as duas)</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Porta Física para WAN 2</label>
                                        <select class="form-select" id="ez_wan2_port">
                                            <option value="lan1" selected>Porta LAN 1 (Recomendado)</option>
                                            <option value="lan2">Porta LAN 2</option>
                                            <option value="lan3">Porta LAN 3</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Tipo de Conexão (WAN 2)</label>
                                        <select class="form-select" id="ez_wan2_proto">
                                            <option value="dhcp" selected>DHCP Automático (Starlink / Modem Bridge)</option>
                                            <option value="pppoe">Fibra PPPoE</option>
                                            <option value="static">IP Estático</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- SEÇÃO 3: REDE WI-FI PRINCIPAL -->
                    <div class="ez-section-box">
                        <div class="ez-section-title"><span>3️⃣</span> Rede Wi-Fi Principal (2.4 GHz, 5 GHz & Wi-Fi 7 6 GHz)</div>
                        <div class="form-group">
                            <label class="form-label">Modo de Operação Wi-Fi</label>
                            <select class="form-select" id="ez_wifi_mode" onchange="toggleEzWifiMode(this.value)">
                                <option value="unified" ${ezDraft.wifi_mode === 'unified' ? 'selected' : ''}>Unificar 2,4 GHz, 5 GHz e 6 GHz (Recomendado - Smart Connect MLO)</option>
                                <option value="split" ${ezDraft.wifi_mode === 'split' ? 'selected' : ''}>Separar redes em 2,4 GHz, 5 GHz e 6 GHz independentes</option>
                            </select>
                        </div>

                        <!-- Unified Wi-Fi Box -->
                        <div id="ez_wifi_unified_box" style="display:${ezDraft.wifi_mode === 'unified' ? 'grid' : 'none'}; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
                            <div class="form-group">
                                <label class="form-label">Nome da Rede Wi-Fi (SSID Único)</label>
                                <input type="text" class="form-input" id="ez_wifi_ssid" value="${ezDraft.wifi_ssid}" maxlength="32">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Senha do Wi-Fi</label>
                                <div style="display:flex; gap:6px;">
                                    <input type="password" class="form-input" id="ez_wifi_pass" value="${ezDraft.wifi_pass}">
                                    <button type="button" class="ark-btn ark-btn-secondary" onclick="togglePassVisibility('ez_wifi_pass', this)">👁️</button>
                                </div>
                            </div>
                        </div>

                        <!-- Split Wi-Fi Box -->
                        <div id="ez_wifi_split_box" style="display:${ezDraft.wifi_mode === 'split' ? 'flex' : 'none'}; flex-direction:column; gap:10px;">
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; background:rgba(0,0,0,0.15); padding:10px; border-radius:6px;">
                                <div class="form-group">
                                    <label class="form-label" style="color:#38bdf8;">Nome Wi-Fi 2.4 GHz</label>
                                    <input type="text" class="form-input" id="ez_wifi_ssid_2g" value="${ezDraft.wifi_ssid}-2.4G">
                                </div>
                                <div class="form-group">
                                    <label class="form-label" style="color:#38bdf8;">Senha 2.4 GHz</label>
                                    <input type="password" class="form-input" id="ez_wifi_pass_2g" value="${ezDraft.wifi_pass}">
                                </div>
                            </div>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; background:rgba(0,0,0,0.15); padding:10px; border-radius:6px;">
                                <div class="form-group">
                                    <label class="form-label" style="color:#a855f7;">Nome Wi-Fi 5 GHz</label>
                                    <input type="text" class="form-input" id="ez_wifi_ssid_5g" value="${ezDraft.wifi_ssid}-5G">
                                </div>
                                <div class="form-group">
                                    <label class="form-label" style="color:#a855f7;">Senha 5 GHz</label>
                                    <input type="password" class="form-input" id="ez_wifi_pass_5g" value="${ezDraft.wifi_pass}">
                                </div>
                            </div>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; background:rgba(0,0,0,0.15); padding:10px; border-radius:6px;">
                                <div class="form-group">
                                    <label class="form-label" style="color:#10b981;">Nome Wi-Fi 6 GHz (Wi-Fi 7)</label>
                                    <input type="text" class="form-input" id="ez_wifi_ssid_6g" value="${ezDraft.wifi_ssid}-6G">
                                </div>
                                <div class="form-group">
                                    <label class="form-label" style="color:#10b981;">Senha 6 GHz (WPA3-SAE)</label>
                                    <input type="password" class="form-input" id="ez_wifi_pass_6g" value="${ezDraft.wifi_pass}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- SEÇÃO 4: WI-FI PARA VISITANTES -->
                    <div class="ez-section-box">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="ez-section-title" style="margin:0;"><span>4️⃣</span> Rede Wi-Fi para Visitantes (Isolada)</div>
                            <label class="ark-switch">
                                <input type="checkbox" id="ez_guest_toggle" ${ezDraft.guest_enabled ? 'checked' : ''} onchange="toggleEzGuestBox(this.checked)">
                                <span class="ark-slider"></span>
                            </label>
                        </div>
                        <div style="font-size:0.75rem; color:#94a3b8;">Rede com isolamento de clientes (Client Isolation) protegendo seus computadores e TVs de acessos externos.</div>

                        <div id="ez_guest_box" style="display:${ezDraft.guest_enabled ? 'grid' : 'none'}; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-top:10px;">
                            <div class="form-group">
                                <label class="form-label">Nome da Rede Visitante</label>
                                <input type="text" class="form-input" id="ez_guest_ssid" value="${ezDraft.guest_ssid}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Senha da Rede Visitante</label>
                                <input type="password" class="form-input" id="ez_guest_pass" value="${ezDraft.guest_pass}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Download Máximo (Mbps)</label>
                                <input type="number" class="form-input" id="ez_guest_down" value="${ezDraft.guest_down}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Upload Máximo (Mbps)</label>
                                <input type="number" class="form-input" id="ez_guest_up" value="${ezDraft.guest_up}">
                            </div>
                        </div>
                    </div>

                    <!-- SEÇÃO 5: SENHA DE ADMINISTRAÇÃO (ROOT) -->
                    <div class="ez-section-box">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="ez-section-title" style="margin:0;"><span>5️⃣</span> Senha de Administração do Roteador (root)</div>
                            <label class="ark-switch">
                                <input type="checkbox" id="ez_admin_toggle" ${ezDraft.admin_enabled ? 'checked' : ''} onchange="toggleEzAdminBox(this.checked)">
                                <span class="ark-slider"></span>
                            </label>
                        </div>
                        <div style="font-size:0.75rem; color:#94a3b8;">Proteja o acesso administrativo ao painel LuCI e terminal SSH do roteador.</div>

                        <div id="ez_admin_box" style="display:${ezDraft.admin_enabled ? 'grid' : 'none'}; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; margin-top:10px;">
                            <div class="form-group">
                                <label class="form-label">Nova Senha do Administrador</label>
                                <div style="display:flex; gap:6px;">
                                    <input type="password" class="form-input" id="ez_admin_pass" placeholder="Mínimo 6 caracteres" oninput="checkEzAdminMatch()">
                                    <button type="button" class="ark-btn ark-btn-secondary" onclick="togglePassVisibility('ez_admin_pass', this)">👁️</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Confirmar Nova Senha</label>
                                <div style="display:flex; gap:6px;">
                                    <input type="password" class="form-input" id="ez_admin_pass2" placeholder="Repita a senha" oninput="checkEzAdminMatch()">
                                    <button type="button" class="ark-btn ark-btn-secondary" onclick="togglePassVisibility('ez_admin_pass2', this)">👁️</button>
                                </div>
                                <small id="ez_admin_match_alert" style="color:#ef4444; font-weight:600; display:none; margin-top:4px;">As senhas não coincidem.</small>
                            </div>
                        </div>
                    </div>

                    <!-- SEÇÃO 6: DNS SEGURO & PROTEÇÃO -->
                    <div class="ez-section-box">
                        <div class="ez-section-title"><span>6️⃣</span> DNS Seguro & Proteção da Família</div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
                            <div class="form-group">
                                <label class="form-label">Provedor de Resolução DNS</label>
                                <select class="form-select" id="ez_dns_mode" onchange="toggleEzDnsMode(this.value)">
                                    <option value="recommended" ${ezDraft.dns_mode === 'recommended' ? 'selected' : ''}>DNS Recomendado (Cloudflare 1.1.1.1 + Google 8.8.8.8)</option>
                                    <option value="operator" ${ezDraft.dns_mode === 'operator' ? 'selected' : ''}>DNS da Operadora (Automático via ISP)</option>
                                    <option value="custom" ${ezDraft.dns_mode === 'custom' ? 'selected' : ''}>DNS Personalizado Manual</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Conectividade Global IPv6</label>
                                <select class="form-select" id="ez_ipv6">
                                    <option value="enable" ${ezDraft.ipv6 === 'enable' ? 'selected' : ''}>🟢 Pilha Dupla Global (IPv6 Ativo - Recomendado)</option>
                                    <option value="disable" ${ezDraft.ipv6 === 'disable' ? 'selected' : ''}>🟡 Desativar IPv6 (Operar Apenas em IPv4)</option>
                                </select>
                            </div>
                        </div>

                        <div id="ez_dns_custom_box" style="display:${ezDraft.dns_mode === 'custom' ? 'grid' : 'none'}; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:10px;">
                            <div class="form-group">
                                <label class="form-label">DNS Primário</label>
                                <input type="text" class="form-input" id="ez_dns1" value="1.1.1.1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">DNS Secundário</label>
                                <input type="text" class="form-input" id="ez_dns2" value="1.0.0.1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">DNS Terciário</label>
                                <input type="text" class="form-input" id="ez_dns3" value="8.8.8.8">
                            </div>
                        </div>

                        <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                            <input type="checkbox" id="ez_disable_wps" ${ezDraft.disable_wps ? 'checked' : ''} style="accent-color:#38bdf8;">
                            <label for="ez_disable_wps" style="font-size:0.8rem; color:#cbd5e1; cursor:pointer;">
                                🛡️ <strong>Desativar WPS PBC por Segurança:</strong> Previne ataques de força bruta no PIN WPS contra as redes sem fio.
                            </label>
                        </div>
                    </div>

                    <!-- SEÇÃO 7: ANTI-LAG GAMER & SQM CAKE -->
                    <div class="ez-section-box">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="ez-section-title" style="margin:0;"><span>7️⃣</span> Otimização Gamer & Anti-Lag (SQM CAKE)</div>
                            <label class="ark-switch">
                                <input type="checkbox" id="ez_sqm_toggle" ${ezDraft.sqm_enabled ? 'checked' : ''} onchange="toggleEzSqmBox(this.checked)">
                                <span class="ark-slider"></span>
                            </label>
                        </div>
                        <div style="font-size:0.75rem; color:#94a3b8;">Elimina picos de latência (Bufferbloat A+) organizando as filas de transmissão com o algoritmo CAKE.</div>

                        <div id="ez_sqm_box" style="display:${ezDraft.sqm_enabled ? 'flex' : 'none'}; flex-direction:column; gap:10px; margin-top:10px;">
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                                <div class="form-group">
                                    <label class="form-label">Download WAN 1 (Mbps)</label>
                                    <input type="number" class="form-input" id="ez_sqm_down" value="${ezDraft.sqm_down}">
                                    <small style="color:#64748b; font-size:0.72rem;">Defina ~90-95% do plano contratado</small>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Upload WAN 1 (Mbps)</label>
                                    <input type="number" class="form-input" id="ez_sqm_up" value="${ezDraft.sqm_up}">
                                    <small style="color:#64748b; font-size:0.72rem;">Defina ~90-95% do upload da operadora</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- SEÇÃO 8: PLUGINS E MÓDULOS OPCIONAIS DO SISTEMA -->
                    <div class="ez-section-box">
                        <div class="ez-section-title"><span>8️⃣</span> Plugins e Módulos Opcionais do Sistema</div>
                        <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:8px;">Serviços integrados do OpenWrt com gerenciamento via ARK Router:</div>

                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:8px;">
                            <div class="ez-plugin-card installed">
                                <div>
                                    <strong style="font-size:0.83rem; color:#fff;">⚡ SQM / CAKE</strong>
                                    <div style="font-size:0.72rem; color:#94a3b8;">Anti-Bufferbloat e filas de jogo</div>
                                </div>
                                <span class="badge" style="background:rgba(16,185,129,0.2); color:#10b981; font-size:0.7rem;">✓ Instalado na ROM</span>
                            </div>

                            <div class="ez-plugin-card installed">
                                <div>
                                    <strong style="font-size:0.83rem; color:#fff;">⚖️ Multi-WAN (mwan3)</strong>
                                    <div style="font-size:0.72rem; color:#94a3b8;">Failover e balanceamento</div>
                                </div>
                                <span class="badge" style="background:rgba(16,185,129,0.2); color:#10b981; font-size:0.7rem;">✓ Instalado na ROM</span>
                            </div>

                            <div class="ez-plugin-card installed">
                                <div>
                                    <strong style="font-size:0.83rem; color:#fff;">🎮 UPnP IGD & NAT-PMP</strong>
                                    <div style="font-size:0.72rem; color:#94a3b8;">Portas para consoles & PC Gamer</div>
                                </div>
                                <span class="badge" style="background:rgba(16,185,129,0.2); color:#10b981; font-size:0.7rem;">✓ Instalado na ROM</span>
                            </div>

                            <div class="ez-plugin-card installed">
                                <div>
                                    <strong style="font-size:0.83rem; color:#fff;">📊 nlbwmon (Consumo)</strong>
                                    <div style="font-size:0.72rem; color:#94a3b8;">Monitor de tráfego por aparelho</div>
                                </div>
                                <span class="badge" style="background:rgba(16,185,129,0.2); color:#10b981; font-size:0.7rem;">✓ Instalado na ROM</span>
                            </div>

                            <div class="ez-plugin-card installed">
                                <div>
                                    <strong style="font-size:0.83rem; color:#fff;">📡 usteer (Band Steering)</strong>
                                    <div style="font-size:0.72rem; color:#94a3b8;">Roaming suave 802.11k/v/r</div>
                                </div>
                                <span class="badge" style="background:rgba(16,185,129,0.2); color:#10b981; font-size:0.7rem;">✓ Instalado na ROM</span>
                            </div>

                            <div class="ez-plugin-card installed">
                                <div>
                                    <strong style="font-size:0.83rem; color:#fff;">🛡️ AdBlock Fast</strong>
                                    <div style="font-size:0.72rem; color:#94a3b8;">Bloqueador de anúncios no DNS</div>
                                </div>
                                <span class="badge" style="background:rgba(16,185,129,0.2); color:#10b981; font-size:0.7rem;">✓ Instalado na ROM</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer modal-footer-multi">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">✕ Fechar</button>
                    <button class="ark-btn ark-btn-secondary" onclick="resetEzSetupDraft()">🗑️ Apagar Rascunho</button>
                    <button class="ark-btn ark-btn-secondary" onclick="saveEzSetupDraft()">💾 Salvar Rascunho</button>
                    <button class="ark-btn ark-btn-primary" id="btn_ez_apply" onclick="applyEzSetupWithCountdown()">🚀 Confirmar e Aplicar (2s)</button>
                </div>
            `;
        }

        function toggleEzWan1Proto(proto) {
            ezDraft.wan1_proto = proto;
            const pBox = document.getElementById('ez_wan1_pppoe_box');
            const sBox = document.getElementById('ez_wan1_static_box');
            if (pBox) pBox.style.display = (proto === 'pppoe') ? 'grid' : 'none';
            if (sBox) sBox.style.display = (proto === 'static') ? 'grid' : 'none';
        }

        function toggleEzWan2Box(enabled) {
            ezDraft.wan2_enabled = enabled;
            const box = document.getElementById('ez_wan2_subbox');
            if (box) box.style.display = enabled ? 'flex' : 'none';
        }

        function toggleEzWifiMode(mode) {
            ezDraft.wifi_mode = mode;
            const uBox = document.getElementById('ez_wifi_unified_box');
            const sBox = document.getElementById('ez_wifi_split_box');
            if (uBox) uBox.style.display = (mode === 'unified') ? 'grid' : 'none';
            if (sBox) sBox.style.display = (mode === 'split') ? 'flex' : 'none';
        }

        function toggleEzGuestBox(enabled) {
            ezDraft.guest_enabled = enabled;
            const box = document.getElementById('ez_guest_box');
            if (box) box.style.display = enabled ? 'grid' : 'none';
        }

        function toggleEzAdminBox(enabled) {
            ezDraft.admin_enabled = enabled;
            const box = document.getElementById('ez_admin_box');
            if (box) box.style.display = enabled ? 'grid' : 'none';
            checkEzAdminMatch();
        }

        function checkEzAdminMatch() {
            const toggle = document.getElementById('ez_admin_toggle');
            const alertMsg = document.getElementById('ez_admin_match_alert');
            if (!toggle || !toggle.checked) {
                if (alertMsg) alertMsg.style.display = 'none';
                return true;
            }
            const p1 = document.getElementById('ez_admin_pass') ? document.getElementById('ez_admin_pass').value : '';
            const p2 = document.getElementById('ez_admin_pass2') ? document.getElementById('ez_admin_pass2').value : '';
            if (p1 && p2 && p1 !== p2) {
                if (alertMsg) alertMsg.style.display = 'block';
                return false;
            }
            if (alertMsg) alertMsg.style.display = 'none';
            return true;
        }

        function toggleEzDnsMode(mode) {
            ezDraft.dns_mode = mode;
            const box = document.getElementById('ez_dns_custom_box');
            if (box) box.style.display = (mode === 'custom') ? 'grid' : 'none';
        }

        function toggleEzSqmBox(enabled) {
            ezDraft.sqm_enabled = enabled;
            const box = document.getElementById('ez_sqm_box');
            if (box) box.style.display = enabled ? 'flex' : 'none';
        }

        function saveEzSetupDraft() {
            const host = document.getElementById('ez_hostname');
            const ssid = document.getElementById('ez_wifi_ssid');
            if (host) ezDraft.hostname = host.value;
            if (ssid) ezDraft.wifi_ssid = ssid.value;
            showToast('💾 Rascunho do Assistente de Setup salvo na memória local!');
        }

        function resetEzSetupDraft() {
            ezDraft = {
                hostname: 'ARK-Router',
                country: 'BR',
                wan1_proto: 'pppoe',
                wan1_user: 'cliente@fibra.com.br',
                wan1_pass: 'Fibra@2026',
                wan1_modem_ip: '192.168.1.1',
                wan1_mac: '',
                wan2_enabled: false,
                wan_mode: 'failover',
                wan2_port: 'lan1',
                wan2_proto: 'dhcp',
                wifi_mode: 'unified',
                wifi_ssid: 'Wi-Fi-H&R',
                wifi_pass: 'MinhaSenhaForte2026',
                guest_enabled: false,
                guest_ssid: 'Wi-Fi-Visitantes',
                guest_pass: 'Visita@2026',
                guest_down: '25',
                guest_up: '10',
                admin_enabled: false,
                admin_pass: '',
                dns_mode: 'recommended',
                ipv6: 'enable',
                disable_wps: true,
                sqm_enabled: true,
                sqm_down: '650',
                sqm_up: '320'
            };
            const cont = document.getElementById('modal_content_holder');
            if (cont) renderEzSetupModal(cont);
            showToast('🗑️ Rascunho limpo! Parâmetros redefinidos para os valores de fábrica.');
        }

        function applyEzSetupWithCountdown() {
            const btn = document.getElementById('btn_ez_apply');
            if (!checkEzAdminMatch()) {
                showToast('⚠️ As senhas de administrador não coincidem!');
                return;
            }
            if (btn) {
                btn.disabled = true;
                btn.textContent = '⏳ Gravando UCI...';
                setTimeout(() => {
                    btn.textContent = '🔄 Reiniciando subsistemas (1s)...';
                }, 1000);
                setTimeout(() => {
                    const ssidInp = document.getElementById('ez_wifi_ssid');
                    const hostInp = document.getElementById('ez_hostname');
                    if (ssidInp) {
                        const lbl = document.getElementById('label_main_ssid');
                        if (lbl) lbl.textContent = ssidInp.value;
                    }
                    if (hostInp) {
                        const hostLbl = document.getElementById('top_host_label');
                        if (hostLbl) hostLbl.innerHTML = `🏠 ${hostInp.value} <span style="color:#64748b;">(192.168.73.1)</span>`;
                    }
                    closeModal();
                    showToast('🚀 ARK OS: Setup Rápido aplicado e validado com sucesso em 2 segundos!');
                }, 2000);
            }
        }

        // =========================================================================
        // CENTRAL DE PLUGINS, PACOTES & MÓDULOS (OPKG & DAEMONS)
        // =========================================================================

        let currentPluginCategory = 'all';

        function renderPluginsCentralModal(cont) {
            cont.innerHTML = `
                <div class="modal-header">
                    <h3>📦 Central de Plugins, Pacotes & Módulos do Sistema</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
                    <!-- Flash Storage Meter -->
                    <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px 14px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <span style="font-size:0.83rem; font-weight:700; color:#fff;">
                                💾 Armazenamento /overlay (Memória Flash Útil): <strong style="color:#38bdf8;">16.1 MB livres</strong> de 28.5 MB
                            </span>
                            <span style="font-size:0.75rem; color:#94a3b8; font-weight:600;">43% ocupado</span>
                        </div>
                        <div style="background:rgba(255,255,255,0.06); height:8px; border-radius:4px; overflow:hidden;">
                            <div style="width:43%; height:100%; background:linear-gradient(90deg, #0284c7, #38bdf8); border-radius:4px;"></div>
                        </div>
                    </div>

                    <!-- Search and Actions Bar -->
                    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:space-between;">
                        <div style="flex:1 1 240px; min-width:200px;">
                            <input type="text" class="form-input" id="plugins_search_input" oninput="filterPluginsList()" placeholder="🔍 Buscar plugin por nome, serviço ou pacote (opkg)...">
                        </div>
                        <button class="ark-btn ark-btn-secondary" onclick="runOpkgUpdate()" title="Sincronizar índices de repositórios oficiais OpenWrt">
                            🔄 Atualizar Listas (opkg update)
                        </button>
                    </div>

                    <!-- Category Pills Filter -->
                    <div class="plugins-tabs">
                        <button class="plugin-tab-btn active" onclick="filterPluginsCategory('all', this)">Todos (12)</button>
                        <button class="plugin-tab-btn" onclick="filterPluginsCategory('net', this)">Rede & WAN (4)</button>
                        <button class="plugin-tab-btn" onclick="filterPluginsCategory('sec', this)">Segurança & VPN (3)</button>
                        <button class="plugin-tab-btn" onclick="filterPluginsCategory('wifi', this)">Wi-Fi & Roaming (1)</button>
                        <button class="plugin-tab-btn" onclick="filterPluginsCategory('sys', this)">Sistema & Hardware (4)</button>
                    </div>

                    <!-- Plugins Grid -->
                    <div class="plugins-grid" id="plugins_grid_container">
                        <!-- Populated by renderPluginsCards() -->
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                </div>
            `;
            renderPluginsCards();
        }

        function renderPluginsCards() {
            const container = document.getElementById('plugins_grid_container');
            if (!container) return;

            const q = document.getElementById('plugins_search_input') ? document.getElementById('plugins_search_input').value.toLowerCase().trim() : '';
            
            const filtered = SYSTEM_PLUGINS.filter(p => {
                const matchCat = (currentPluginCategory === 'all' || p.category === currentPluginCategory);
                const matchText = (!q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.pkg.toLowerCase().includes(q));
                return matchCat && matchText;
            });

            if (filtered.length === 0) {
                container.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:30px; color:#94a3b8; font-size:0.88rem;">
                        🔍 Nenhum plugin encontrado para o filtro informado.
                    </div>
                `;
                return;
            }

            container.innerHTML = filtered.map(p => {
                const isInstalled = p.installed;
                return `
                    <div class="plugin-detail-card" style="border-color:${isInstalled ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)'};">
                        <div class="plugin-card-top">
                            <div class="plugin-card-info">
                                <h4>${p.name}</h4>
                                <p>${p.desc}</p>
                            </div>
                            <span class="badge" style="font-size:0.72rem; ${isInstalled ? 'background:rgba(16,185,129,0.18); color:#10b981; border:1px solid rgba(16,185,129,0.3);' : 'background:rgba(255,255,255,0.06); color:#94a3b8;'}">
                                ${isInstalled ? '🟢 Instalado' : '⚪ Disponível'}
                            </span>
                        </div>
                        <div class="plugin-card-meta">
                            <span>📦 ${p.pkg}</span>
                            <span>v${p.version}</span>
                            <span>💾 ${p.size}</span>
                        </div>
                        <div class="plugin-card-actions">
                            ${isInstalled ? `
                                <button class="ark-btn ark-btn-primary" style="flex:1; font-size:0.8rem; padding:8px 12px;" onclick="${p.actionType === 'modal' ? `openModal('${p.actionTarget}')` : `switchView('${p.actionTarget}'); closeModal();`}">
                                    ⚙️ Abrir Interface
                                </button>
                                <button class="ark-btn ark-btn-secondary" style="font-size:0.8rem; padding:8px 10px;" onclick="openModal('pkg_install', '${p.id}')" title="Reinstalar pacote">
                                    🔄
                                </button>
                            ` : `
                                <button class="ark-btn ark-btn-primary" style="flex:1; font-size:0.8rem; padding:8px 12px; background:linear-gradient(135deg, #10b981, #059669);" onclick="openModal('pkg_install', '${p.id}')">
                                    📥 Instalar Pacote (${p.size})
                                </button>
                            `}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function filterPluginsCategory(cat, btn) {
            currentPluginCategory = cat;
            document.querySelectorAll('.plugin-tab-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            renderPluginsCards();
        }

        function filterPluginsList() {
            renderPluginsCards();
        }

        function runOpkgUpdate() {
            showToast('🔄 Executando "opkg update"... Sincronizando listas oficiais do OpenWrt 24.10.');
            setTimeout(() => {
                showToast('✅ Listas de pacotes atualizadas com sucesso: 14.280 pacotes indexados!');
            }, 1200);
        }

        // =========================================================================
        // SIMULADOR DE INSTALAÇÃO DE PACOTES OPENWRT (OPKG TERMINAL)
        // =========================================================================

        function renderPackageInstallModal(cont, pkgId) {
            const plugin = SYSTEM_PLUGINS.find(p => p.id === pkgId) || SYSTEM_PLUGINS[0];

            cont.innerHTML = `
                <div class="modal-header">
                    <h3>📦 Instalador de Pacotes OpenWrt (opkg)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <strong style="color:#fff; font-size:0.95rem;">${plugin.name}</strong>
                            <div style="font-size:0.75rem; color:#94a3b8; font-family:monospace; margin-top:2px;">
                                Pacote: ${plugin.pkg} | Versão: ${plugin.version} | Tamanho: ${plugin.size}
                            </div>
                        </div>
                        <span class="badge" style="background:rgba(56,189,248,0.15); color:#38bdf8; font-size:0.75rem;">
                            Repositório Oficial OpenWrt
                        </span>
                    </div>

                    <!-- Progress Bar -->
                    <div style="background:rgba(255,255,255,0.06); height:8px; border-radius:4px; overflow:hidden;">
                        <div id="pkg_install_progress" style="width:10%; height:100%; background:linear-gradient(90deg, #0284c7, #38bdf8); border-radius:4px; transition:width 0.4s ease;"></div>
                    </div>
                    <div id="pkg_install_status_txt" style="font-size:0.78rem; color:#38bdf8; font-family:monospace;">
                        Iniciando transação opkg no OpenWrt...
                    </div>

                    <!-- Simulated Terminal Window -->
                    <div class="terminal-sim-box" id="pkg_terminal_box">root@ARK-Router:~# opkg update
Downloading https://downloads.openwrt.org/releases/24.10.0/packages/aarch64_cortex-a53/base/Packages.gz
Updated list of available packages in /var/opkg-lists/base.
</div>
                </div>

                <div class="modal-footer" id="pkg_install_footer">
                    <button class="ark-btn ark-btn-secondary" onclick="openModal('plugins')">Voltar aos Plugins</button>
                </div>
            `;

            startPluginInstallProcess(plugin);
        }

        function startPluginInstallProcess(plugin) {
            const term = document.getElementById('pkg_terminal_box');
            const prog = document.getElementById('pkg_install_progress');
            const st = document.getElementById('pkg_install_status_txt');
            const footer = document.getElementById('pkg_install_footer');

            setTimeout(() => {
                if (term) term.textContent += `root@ARK-Router:~# opkg install ${plugin.pkg}
Installing ${plugin.pkg} (${plugin.version}) to root...
Downloading https://downloads.openwrt.org/releases/24.10.0/packages/aarch64_cortex-a53/packages/${plugin.pkg}_${plugin.version}_aarch64_cortex-a53.ipk
`;
                if (prog) prog.style.width = '45%';
                if (st) st.textContent = `Baixando artefato ${plugin.pkg} (${plugin.size})...`;
            }, 600);

            setTimeout(() => {
                if (term) term.textContent += `Configuring ${plugin.pkg}.
Enabling service /etc/init.d/${plugin.id} enable
Starting service /etc/init.d/${plugin.id} start
[OK] Daemon iniciado com sucesso! PID ${Math.floor(1000 + Math.random() * 8000)}
`;
                if (prog) prog.style.width = '85%';
                if (st) st.textContent = `Registrando serviço e inicializando daemons...`;
            }, 1300);

            setTimeout(() => {
                plugin.installed = true;
                if (term) term.textContent += `
✓ Instalação de ${plugin.pkg} concluída com sucesso!
`;
                if (prog) {
                    prog.style.width = '100%';
                    prog.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
                }
                if (st) {
                    st.style.color = '#10b981';
                    st.textContent = `✅ Módulo ${plugin.name} instalado e em execução!`;
                }
                if (footer) {
                    footer.innerHTML = `
                        <button class="ark-btn ark-btn-secondary" onclick="openModal('plugins')">Voltar aos Plugins</button>
                        <button class="ark-btn ark-btn-primary" onclick="${plugin.actionType === 'modal' ? `openModal('${plugin.actionTarget}')` : `switchView('${plugin.actionTarget}'); closeModal();`}">
                            ⚙️ Abrir Configuração do Plugin
                        </button>
                    `;
                }
                showToast(`🎉 Plugin "${plugin.name}" instalado e ativado!`);
            }, 2000);
        }

        // =========================================================================
        // INTERFACE REAL DO PLUGIN: UPNP IGD & NAT-PMP (miniupnpd)
        // =========================================================================

        function renderUpnpModal(cont) {
            cont.innerHTML = `
                <div class="modal-header">
                    <h3>🎮 UPnP IGD & NAT-PMP (Abertura Automática de Portas)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
                    <div style="background:rgba(56, 189, 248, 0.08); border:1px solid rgba(56, 189, 248, 0.25); border-radius:8px; padding:12px; font-size:0.83rem; color:#bae6fd; line-height:1.45;">
                        🎮 <strong>miniupnpd Daemon:</strong> Permite que consoles (PS5, Xbox), PCs Gamer (Steam, Epic) e clientes BitTorrent abram dinamicamente as portas necessárias no firewall nftables para obter <strong>NAT Tipo 1 (Aberto)</strong>.
                    </div>

                    <!-- Configurações Globais -->
                    <div style="background:rgba(0,0,0,0.22); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <strong style="color:#fff; font-size:0.9rem;">Habilitar Serviço UPnP / NAT-PMP</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Ativa a resposta a requisições SSDP na rede local</div>
                            </div>
                            <label class="ark-switch">
                                <input type="checkbox" id="upnp_active_toggle" checked>
                                <span class="ark-slider"></span>
                            </label>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
                            <div>
                                <strong style="color:#fff; font-size:0.9rem;">Modo Seguro (Secure Mode)</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Clientes só podem redirecionar portas para o seu próprio IP local (portas > 1024)</div>
                            </div>
                            <label class="ark-switch">
                                <input type="checkbox" id="upnp_secure_toggle" checked>
                                <span class="ark-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- Tabela de Portas Abertas Dinamicamente -->
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <strong style="color:#fff; font-size:0.9rem;">Portas Abertas Dinamicamente (5 Ativas)</strong>
                            <button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 10px;" onclick="clearUpnpMappings()">
                                🧹 Limpar Todos os Mapeamentos
                            </button>
                        </div>

                        <div style="overflow-x:auto;">
                            <table class="ark-table" id="upnp_table" style="width:100%; font-size:0.8rem;">
                                <thead>
                                    <tr>
                                        <th>Dispositivo</th>
                                        <th>Protocolo</th>
                                        <th>Porta Ext.</th>
                                        <th>Porta Int.</th>
                                        <th>Aplicação</th>
                                        <th>Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>192.168.1.103</strong> <span style="color:#64748b;">(PS5-LivingRoom)</span></td>
                                        <td><span class="badge" style="background:#0284c7; color:#fff;">UDP</span></td>
                                        <td><strong>9308</strong></td>
                                        <td>9308</td>
                                        <td>PlayStation Party & Voice</td>
                                        <td><button class="ark-btn ark-btn-secondary" style="padding:2px 8px; font-size:0.72rem;" onclick="deleteUpnpRule(this)">✕</button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>192.168.1.100</strong> <span style="color:#64748b;">(PC-Gamer-i9)</span></td>
                                        <td><span class="badge" style="background:#0284c7; color:#fff;">UDP</span></td>
                                        <td><strong>3074</strong></td>
                                        <td>3074</td>
                                        <td>Call of Duty: Warzone</td>
                                        <td><button class="ark-btn ark-btn-secondary" style="padding:2px 8px; font-size:0.72rem;" onclick="deleteUpnpRule(this)">✕</button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>192.168.1.100</strong> <span style="color:#64748b;">(PC-Gamer-i9)</span></td>
                                        <td><span class="badge" style="background:#0284c7; color:#fff;">UDP</span></td>
                                        <td><strong>27015</strong></td>
                                        <td>27015</td>
                                        <td>Steam Multiplayer</td>
                                        <td><button class="ark-btn ark-btn-secondary" style="padding:2px 8px; font-size:0.72rem;" onclick="deleteUpnpRule(this)">✕</button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>192.168.1.112</strong> <span style="color:#64748b;">(Xbox-Series-X)</span></td>
                                        <td><span class="badge" style="background:#0284c7; color:#fff;">UDP</span></td>
                                        <td><strong>3074</strong></td>
                                        <td>3074</td>
                                        <td>Xbox Live Multiplayer</td>
                                        <td><button class="ark-btn ark-btn-secondary" style="padding:2px 8px; font-size:0.72rem;" onclick="deleteUpnpRule(this)">✕</button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>192.168.1.200</strong> <span style="color:#64748b;">(NAS-Storage)</span></td>
                                        <td><span class="badge" style="background:#10b981; color:#fff;">TCP</span></td>
                                        <td><strong>6881</strong></td>
                                        <td>6881</td>
                                        <td>qBittorrent P2P</td>
                                        <td><button class="ark-btn ark-btn-secondary" style="padding:2px 8px; font-size:0.72rem;" onclick="deleteUpnpRule(this)">✕</button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    <button class="ark-btn ark-btn-primary" onclick="saveUpnpModal()">💾 Salvar Configurações</button>
                </div>
            `;
        }

        function deleteUpnpRule(btn) {
            const tr = btn.closest('tr');
            if (tr) {
                tr.remove();
                showToast('🗑️ Mapeamento UPnP removido da tabela do firewall.');
            }
        }

        function clearUpnpMappings() {
            const tbody = document.querySelector('#upnp_table tbody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:16px;">Nenhum redirecionamento dinâmico ativo.</td></tr>`;
                showToast('🧹 Todos os redirecionamentos UPnP foram purgados com sucesso!');
            }
        }

        function saveUpnpModal() {
            closeModal();
            showToast('💾 Configurações do miniupnpd atualizadas e aplicadas!');
        }

        // =========================================================================
        // INTERFACE REAL DO PLUGIN: MULTI-WAN & FAILOVER (mwan3)
        // =========================================================================

        function renderMwan3Modal(cont) {
            cont.innerHTML = `
                <div class="modal-header">
                    <h3>⚖️ Multi-WAN & Failover Inteligente (mwan3)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
                    <!-- Status das Interfaces -->
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px;">
                        <div style="background:rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.3); border-radius:8px; padding:12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <strong style="color:#fff;">WAN 1 (Vivo Fibra - eth0)</strong>
                                <span class="badge" style="background:#10b981; color:#fff; font-size:0.7rem;">ONLINE</span>
                            </div>
                            <div style="font-size:0.75rem; color:#94a3b8; margin-top:6px; font-family:monospace;">
                                Ping: 4.2 ms | Perda: 0% | Peso: 3 (75% tráfego)
                            </div>
                        </div>

                        <div style="background:rgba(56, 189, 248, 0.08); border:1px solid rgba(56, 189, 248, 0.3); border-radius:8px; padding:12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <strong style="color:#fff;">WAN 2 (Starlink - eth1)</strong>
                                <span class="badge" style="background:#38bdf8; color:#0f172a; font-size:0.7rem;">ONLINE</span>
                            </div>
                            <div style="font-size:0.75rem; color:#94a3b8; margin-top:6px; font-family:monospace;">
                                Ping: 32.8 ms | Perda: 0% | Peso: 1 (25% tráfego)
                            </div>
                        </div>
                    </div>

                    <!-- Configuração mwan3 -->
                    <div class="ez-section-box">
                        <div class="ez-section-title">Parâmetros do Rastreamento de Conexão</div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
                            <div class="form-group">
                                <label class="form-label">Modo Multi-WAN</label>
                                <select class="form-select" id="mwan3_mode">
                                    <option value="balanced" selected>Balanceamento de Carga Proporcional (3:1)</option>
                                    <option value="failover">Failover Estrito (WAN1 primária, WAN2 reserva)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">IPs de Rastreamento (Tracking)</label>
                                <input type="text" class="form-input" id="mwan3_tracking" value="1.1.1.1 8.8.8.8">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Intervalo de Ping</label>
                                <input type="number" class="form-input" id="mwan3_interval" value="3" min="1" max="60">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Falhas para Disparar Failover</label>
                                <input type="number" class="form-input" id="mwan3_failures" value="3" min="1" max="10">
                            </div>
                        </div>
                    </div>

                    <!-- Regras de Roteamento -->
                    <div class="ez-section-box">
                        <div class="ez-section-title">Políticas de Roteamento por Aplicação</div>
                        <div style="display:flex; flex-direction:column; gap:8px; font-size:0.8rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:6px;">
                                <span>🎮 <strong>Jogos Online & VoIP (UDP 3074, 9308, 27015):</strong></span>
                                <span class="badge" style="background:#0284c7; color:#fff;">Forçar WAN 1 (Fibra de baixa latência)</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:6px;">
                                <span>📺 <strong>Streaming (Netflix, YouTube, Twitch):</strong></span>
                                <span class="badge" style="background:#10b981; color:#fff;">Balanceamento 50/50</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:6px;">
                                <span>📥 <strong>Downloads & Torrents:</strong></span>
                                <span class="badge" style="background:#a855f7; color:#fff;">WAN 2 Starlink prioritário</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    <button class="ark-btn ark-btn-primary" onclick="saveMwan3Modal()">💾 Salvar e Aplicar Regras</button>
                </div>
            `;
        }

        function saveMwan3Modal() {
            closeModal();
            showToast('⚖️ Parâmetros do mwan3 e políticas de roteamento gravadas no UCI!');
        }

        // =========================================================================
        // INTERFACE REAL DO PLUGIN: ZEROTIER SD-WAN (zerotier)
        // =========================================================================

        function renderZeroTierModal(cont) {
            cont.innerHTML = `
                <div class="modal-header">
                    <h3>🌐 ZeroTier SD-WAN (Rede Privada Mesh P2P)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
                    <div style="background:rgba(245, 158, 11, 0.08); border:1px solid rgba(245, 158, 11, 0.3); border-radius:8px; padding:12px; font-size:0.83rem; color:#fde68a; line-height:1.45;">
                        🌐 <strong>ZeroTier One:</strong> Conecta seu roteador ARK e aparelhos locais a uma rede privada virtual peer-to-peer criptografada em qualquer lugar do mundo, sem precisar de IP público ou portas abertas.
                    </div>

                    <div class="ez-section-box">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="ez-section-title" style="margin:0;">Ativar Cliente ZeroTier</div>
                            <label class="ark-switch">
                                <input type="checkbox" id="zt_enable" checked>
                                <span class="ark-slider"></span>
                            </label>
                        </div>

                        <div class="form-group" style="margin-top:10px;">
                            <label class="form-label">Network ID (Identificador da Rede de 16 Dígitos Hex)</label>
                            <input type="text" class="form-input" id="zt_network_id" value="8056c2e21c000001" maxlength="16" style="font-family:monospace; font-weight:700; letter-spacing:1px;">
                        </div>

                        <div style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:12px; display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; font-size:0.8rem;">
                            <div>
                                <span style="color:#94a3b8;">Status da Conexão:</span>
                                <div style="color:#10b981; font-weight:700; margin-top:2px;">🟢 ONLINE (Planet Root)</div>
                            </div>
                            <div>
                                <span style="color:#94a3b8;">IP Virtual Atribuído:</span>
                                <div style="color:#38bdf8; font-weight:700; margin-top:2px;">10.147.20.45/24</div>
                            </div>
                            <div>
                                <span style="color:#94a3b8;">Dispositivos no Mesh:</span>
                                <div style="color:#fff; font-weight:700; margin-top:2px;">4 nós conectados</div>
                            </div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" checked style="accent-color:#38bdf8;">
                                Permitir que clientes remotos do ZeroTier acessem dispositivos da rede LAN local
                            </label>
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" style="accent-color:#38bdf8;">
                                Usar o ZeroTier como Rota Padrão (Default Gateway para toda a internet)
                            </label>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    <button class="ark-btn ark-btn-primary" onclick="executeZeroTierConnect()">🌐 Conectar / Salvar Rede</button>
                </div>
            `;
        }

        function executeZeroTierConnect() {
            closeModal();
            showToast('🌐 ZeroTier: Conexão P2P estabelecida! IP virtual 10.147.20.45 ativo.');
        }

        // =========================================================================
        // INTERFACE REAL DO PLUGIN: SPEEDIFY BONDING (speedify-router)
        // =========================================================================

        function renderSpeedifyModal(cont) {
            cont.innerHTML = `
                <div class="modal-header">
                    <h3>🚀 Speedify Bonding (Agregação de Links Fibra + Starlink)</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
                    <div style="background:rgba(168, 85, 247, 0.08); border:1px solid rgba(168, 85, 247, 0.3); border-radius:8px; padding:12px; font-size:0.83rem; color:#e9d5ff; line-height:1.45;">
                        🚀 <strong>Channel Bonding em Nível de Pacotes:</strong> O Speedify soma conexões diferentes (Fibra + Starlink + 5G) em um único super-túnel criptografado, garantindo 0% de queda em reuniões e transmissões ao vivo.
                    </div>

                    <div class="ez-section-box">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="ez-section-title" style="margin:0;">Ativar Serviço Speedify</div>
                            <label class="ark-switch">
                                <input type="checkbox" id="speedify_enable" checked>
                                <span class="ark-slider"></span>
                            </label>
                        </div>

                        <div class="form-group" style="margin-top:10px;">
                            <label class="form-label">Modo de Agregação de Links (Bonding Mode)</label>
                            <select class="form-select" id="speedify_mode">
                                <option value="speed" selected>Velocidade Máxima (Soma o download e upload dos links)</option>
                                <option value="redundant">Redundante (Transmite pacotes duplicados para zero perda em chamadas)</option>
                                <option value="streaming">Streaming Prioritário (Otimizado para lives Twitch/YouTube/OBS)</option>
                            </select>
                        </div>

                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:10px;">
                                <strong style="color:#fff; font-size:0.83rem;">WAN 1 (eth0 - Fibra)</strong>
                                <div style="font-size:0.75rem; color:#10b981; margin-top:2px;">Primária (Uso Ilimitado)</div>
                            </div>
                            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:10px;">
                                <strong style="color:#fff; font-size:0.83rem;">WAN 2 (eth1 - Starlink)</strong>
                                <div style="font-size:0.75rem; color:#38bdf8; margin-top:2px;">Secundária (Uso Inteligente)</div>
                            </div>
                        </div>

                        <div class="form-group" style="margin-top:10px;">
                            <label class="form-label">Criptografia de Canal</label>
                            <select class="form-select">
                                <option value="chacha20" selected>ChaCha20-Poly1305 (Aceleração Hardware ARM Filogic)</option>
                                <option value="aes">AES-128-GCM</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    <button class="ark-btn ark-btn-primary" onclick="executeSpeedifyConnect()">🚀 Conectar Speedify</button>
                </div>
            `;
        }

        function executeSpeedifyConnect() {
            closeModal();
            showToast('🚀 Speedify conectado! Links agregados com sucesso.');
        }

        function saveSetupModal() {
            applyEzSetupWithCountdown();
        }

        function saveWifiModal() {
            const ssid = document.getElementById('m_wifi_ssid').value;
            document.getElementById('label_main_ssid').textContent = ssid;
            closeModal();
            showToast(`📶 Rede ${ssid} atualizada!`);
        }

        function saveSqmModal() {
            closeModal();
            showToast('⚡ Parâmetros SQM CAKE aplicados no kernel!');
        }

        function applySqmPreset(val) {
            document.getElementById('sqm_label_down').textContent = val + ' Mbps';
            document.getElementById('sqm_label_up').textContent = Math.round(parseInt(val)/2) + ' Mbps';
        }

        function toggleWifiPass() {
            const p = document.getElementById('pwd_main_wifi');
            p.textContent = (p.textContent === '••••••••••••') ? 'MinhaSenhaForte2026' : '••••••••••••';
        }

        function toggleMwan(el) {
            showToast(el.checked ? '⚖️ Balanceamento de Carga Multi-WAN ativado!' : '⚠️ Modo Failover puro ativo.');
        }

        function toggleNightLeds(el) {
            showToast(el.checked ? '🌙 Modo Noturno: LEDs físicos desligados.' : '☀️ Modo Normal: LEDs de atividade ligados.');
        }

        function testWanPing(wan) {
            showToast(`📶 Ping 1.1.1.1 via ${wan.toUpperCase()}: 4.2 ms (0% perda)`);
        }

        function executeReboot() {
            closeModal();
            showToast('🔄 Reiniciando roteador com segurança... Reconexão em 45s.');
        }

        // Stepper for Smart Wi-Fi Enhancer
        let enhancerRunning = false;
        function startEnhancerProcess() {
            if (enhancerRunning) return;
            enhancerRunning = true;
            const btn = document.getElementById('btn_run_enhancer');
            const bar = document.getElementById('enhancer_progress_bar');
            const log = document.getElementById('enhancer_log_box');
            btn.disabled = true;
            btn.textContent = '⏳ Executando...';

            const steps = [
                "[1/7] Checando lock opkg e pacotes wpad...",
                "[2/7] Backup gerado em /etc/config/wireless.bak...",
                "[3/7] Removendo wpad-basic sem desligar rádios...",
                "[4/7] Instalando wpad-mbedtls (WPA3-SAE, 802.11r/k/v)...",
                "[5/7] Configurando sae_pwe=2 e bss_transition=1...",
                "[6/7] Ajustando usteer para transição suave...",
                "[7/7] Verificação 100% OK! Rádios otimizados."
            ];

            let curr = 0;
            const timer = setInterval(() => {
                if (curr < steps.length) {
                    bar.style.width = `${((curr + 1) / 7) * 100}%`;
                    log.innerHTML += `<br>${steps[curr]}`;
                    log.scrollTop = log.scrollHeight;
                    curr++;
                } else {
                    clearInterval(timer);
                    enhancerRunning = false;
                    btn.disabled = false;
                    btn.textContent = '✅ Otimização Concluída';
                    showToast('🚀 Smart Wi-Fi Enhancer finalizado com sucesso!');
                }
            }, 700);
        }

        // Ark Doctor Diagnosis
        function runDoctorCheck() {
            const grid = document.getElementById('doctor_checks_grid');
            if (!grid) return;
            const checks = [
                { name: "Motor de Firewall (fw4 nftables)", status: "Perfeito (Regras ativas)", icon: "🛡️" },
                { name: "Suporte Criptográfico WPA3", status: "wpad-mbedtls instalado", icon: "🔐" },
                { name: "Transição Suave 802.11v/k", status: "Ativa nos 3 rádios", icon: "📶" },
                { name: "Multi-WAN Failover (mwan3)", status: "Rastreamento ping OK", icon: "🌐" },
                { name: "Controle de Latência CAKE", status: "Overhead 44B GPON OK", icon: "⚡" },
                { name: "Resolução DNS e Cache", status: "dnsmasq ativo (0ms RAM)", icon: "🧠" },
                { name: "Aceleração de Fluxo (Fastpath)", status: "Hardware offload ativo", icon: "🚀" },
                { name: "Servidor de Hora NTP", status: "Sincronizado pool.ntp.br", icon: "⏰" },
                { name: "Temperatura do SoC Filogic", status: "46°C (Estável)", icon: "℃" },
                { name: "Armazenamento Flash / Overlay", status: "14% usado (110MB livres)", icon: "▣" },
                { name: "Túneis WireGuard", status: "Handshake ativo wg0", icon: "🔒" },
                { name: "Preservação de Fake RTC", status: "Daemon ark-clock ativo", icon: "⏳" }
            ];

            grid.innerHTML = checks.map(c => `
                <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:8px; padding:12px; display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.3rem;">${c.icon}</span>
                    <div>
                        <strong style="font-size:0.84rem; color:#fff;">${c.name}</strong>
                        <div style="font-size:0.75rem; color:#34d399;">● ${c.status}</div>
                    </div>
                </div>
            `).join('');
        }

        // Speedtest Simulation
        function runSpeedtestProcess() {
            const btn = document.getElementById('btn_run_speedtest');
            btn.disabled = true;
            btn.textContent = '⏳ Medindo Banda...';
            const dEl = document.getElementById('sp_down_val');
            const uEl = document.getElementById('sp_up_val');
            const pEl = document.getElementById('sp_ping_val');

            dEl.innerHTML = '<span style="color:#fbbf24;">Medindo...</span>';
            uEl.innerHTML = '<span style="color:#94a3b8;">Aguardando...</span>';
            pEl.innerHTML = '<span style="color:#38bdf8;">1.8 ms</span>';

            setTimeout(() => {
                dEl.innerHTML = '924.8 <span style="font-size:0.9rem;">Mbps</span>';
                uEl.innerHTML = '<span style="color:#fbbf24;">Medindo upload...</span>';
            }, 1200);

            setTimeout(() => {
                uEl.innerHTML = '482.1 <span style="font-size:0.9rem;">Mbps</span>';
                pEl.innerHTML = '2.4 <span style="font-size:0.9rem;">ms</span>';
                btn.disabled = false;
                btn.textContent = '🚀 Iniciar Novo Teste';
                showToast('🚀 Speedtest concluído: 924.8 Mbps Down / 482.1 Mbps Up!');
            }, 2400);
        }

        // Hyper-Realistic OpenWrt Telemetry Engine (NOC Grade Live Vazão & Kernel Counters)
        let activeTrafficIface = 'br-lan';
        let sessionRxBytes = 1482910402000; // ~1.48 TB
        let sessionTxBytes = 342610200000;  // ~342.6 GB
        let downHistory = new Array(40).fill(180);
        let upHistory = new Array(40).fill(45);
        let maxObservedBps = 942.1;

        function setTrafficInterface(iface, btn) {
            activeTrafficIface = iface;
            document.querySelectorAll('.traffic-pill-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            
            const scaleEl = document.getElementById('traffic_scale_label');
            if (iface === 'wan1') {
                if (scaleEl) scaleEl.textContent = 'Interface: eth1 (WAN 1 2.5 Gbps FDX) • Escala: 0 — 1 Gbps';
            } else if (iface === 'wan2') {
                if (scaleEl) scaleEl.textContent = 'Interface: eth2 (Starlink Mini Bypass) • Escala: 0 — 250 Mbps';
            } else if (iface === 'wifi7') {
                if (scaleEl) scaleEl.textContent = 'Interface: wlan2 (Filogic 880 6GHz 320MHz MLO) • Escala: 0 — 2 Gbps';
            } else {
                if (scaleEl) scaleEl.textContent = 'Interface: br-lan (Bridge Geral Dual-WAN + Wi-Fi) • Escala: 0 — 500 Mbps';
            }
            showToast(`📊 Monitorando telemetria em tempo real de [${iface}]`);
        }

        function initTrafficCanvas() {
            const cvs = document.getElementById('live_traffic_canvas');
            if (!cvs || !cvs.parentElement) return;
            const ctx = cvs.getContext('2d');
            
            function resizeCanvas() {
                const rect = cvs.parentElement.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                cvs.width = (rect.width) * dpr;
                cvs.height = 150 * dpr;
                ctx.scale(dpr, dpr);
            }
            resizeCanvas();

            function draw() {
                const w = cvs.parentElement.clientWidth;
                const h = 150;
                ctx.clearRect(0, 0, w, h);

                // Multipliers based on active interface
                let baseDown = 220, baseUp = 52, variance = 35;
                if (activeTrafficIface === 'wan1') { baseDown = 420; baseUp = 110; variance = 65; }
                else if (activeTrafficIface === 'wan2') { baseDown = 115; baseUp = 24; variance = 20; }
                else if (activeTrafficIface === 'wifi7') { baseDown = 640; baseUp = 180; variance = 95; }

                // Organic Perlin-like oscillation with burst spikes
                const isBurst = Math.random() > 0.88;
                const burstVal = isBurst ? (Math.random() * 260 + 120) : 0;
                const nextDown = Math.max(25, Math.min(950, (downHistory[downHistory.length - 1] * 0.7) + (baseDown * 0.3) + (Math.random() * variance - (variance/2)) + burstVal));
                const nextUp = Math.max(8, Math.min(480, (upHistory[upHistory.length - 1] * 0.7) + (baseUp * 0.3) + (Math.random() * (variance*0.4) - (variance*0.2)) + (burstVal * 0.25)));

                downHistory.shift();
                downHistory.push(nextDown);
                upHistory.shift();
                upHistory.push(nextUp);

                // Dynamic max scale calculation
                const peakInHistory = Math.max(...downHistory, ...upHistory, 250);
                const maxRange = peakInHistory > 600 ? 1000 : (peakInHistory > 350 ? 600 : 350);

                // Grid background lines
                ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
                ctx.lineWidth = 1;
                const gridSteps = 4;
                for (let i = 1; i <= gridSteps; i++) {
                    const y = (h / gridSteps) * i;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(w, y);
                    ctx.stroke();

                    // Grid text
                    ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
                    ctx.font = "9px ui-monospace, monospace";
                    const labelVal = Math.round(maxRange * (1 - i / gridSteps));
                    if (labelVal > 0) ctx.fillText(`${labelVal}M`, 6, y - 3);
                }

                const step = w / (downHistory.length - 1);

                // Render Download Wave with Neon Glow & Gradient Area
                const downGrad = ctx.createLinearGradient(0, 0, 0, h);
                downGrad.addColorStop(0, "rgba(56, 189, 248, 0.35)");
                downGrad.addColorStop(1, "rgba(56, 189, 248, 0.0)");

                ctx.beginPath();
                ctx.moveTo(0, h);
                for (let i = 0; i < downHistory.length; i++) {
                    const x = i * step;
                    const y = h - (downHistory[i] / maxRange) * (h - 15);
                    if (i === 0) ctx.lineTo(x, y);
                    else {
                        const prevX = (i - 1) * step;
                        const prevY = h - (downHistory[i - 1] / maxRange) * (h - 15);
                        const cX = (prevX + x) / 2;
                        ctx.bezierCurveTo(cX, prevY, cX, y, x, y);
                    }
                }
                ctx.lineTo(w, h);
                ctx.closePath();
                ctx.fillStyle = downGrad;
                ctx.fill();

                // Download Stroke Line
                ctx.beginPath();
                for (let i = 0; i < downHistory.length; i++) {
                    const x = i * step;
                    const y = h - (downHistory[i] / maxRange) * (h - 15);
                    if (i === 0) ctx.moveTo(x, y);
                    else {
                        const prevX = (i - 1) * step;
                        const prevY = h - (downHistory[i - 1] / maxRange) * (h - 15);
                        const cX = (prevX + x) / 2;
                        ctx.bezierCurveTo(cX, prevY, cX, y, x, y);
                    }
                }
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 2.2;
                ctx.stroke();

                // Render Upload Wave with Purple Glow
                const upGrad = ctx.createLinearGradient(0, 0, 0, h);
                upGrad.addColorStop(0, "rgba(168, 85, 247, 0.25)");
                upGrad.addColorStop(1, "rgba(168, 85, 247, 0.0)");

                ctx.beginPath();
                ctx.moveTo(0, h);
                for (let i = 0; i < upHistory.length; i++) {
                    const x = i * step;
                    const y = h - (upHistory[i] / maxRange) * (h - 15);
                    if (i === 0) ctx.lineTo(x, y);
                    else {
                        const prevX = (i - 1) * step;
                        const prevY = h - (upHistory[i - 1] / maxRange) * (h - 15);
                        const cX = (prevX + x) / 2;
                        ctx.bezierCurveTo(cX, prevY, cX, y, x, y);
                    }
                }
                ctx.lineTo(w, h);
                ctx.closePath();
                ctx.fillStyle = upGrad;
                ctx.fill();

                // Upload Stroke Line
                ctx.beginPath();
                for (let i = 0; i < upHistory.length; i++) {
                    const x = i * step;
                    const y = h - (upHistory[i] / maxRange) * (h - 15);
                    if (i === 0) ctx.moveTo(x, y);
                    else {
                        const prevX = (i - 1) * step;
                        const prevY = h - (upHistory[i - 1] / maxRange) * (h - 15);
                        const cX = (prevX + x) / 2;
                        ctx.bezierCurveTo(cX, prevY, cX, y, x, y);
                    }
                }
                ctx.strokeStyle = "#a855f7";
                ctx.lineWidth = 1.8;
                ctx.stroke();

                // Pulsating Endpoint Indicator on current value
                const lastIdx = downHistory.length - 1;
                const lastX = w;
                const lastYDown = h - (downHistory[lastIdx] / maxRange) * (h - 15);
                ctx.fillStyle = "#38bdf8";
                ctx.beginPath();
                ctx.arc(lastX - 2, lastYDown, 4, 0, Math.PI * 2);
                ctx.fill();

                // Telemetry Counters Accumulation & DOM Update
                const curDownVal = downHistory[lastIdx];
                const curUpVal = upHistory[lastIdx];
                sessionRxBytes += Math.round((curDownVal * 1000000) / 8);
                sessionTxBytes += Math.round((curUpVal * 1000000) / 8);

                const sDown = document.getElementById('stat_down');
                const sUp = document.getElementById('stat_up');
                const sDownPps = document.getElementById('stat_down_pps');
                const sUpPps = document.getElementById('stat_up_pps');
                const sDownBytes = document.getElementById('stat_down_bytes');
                const sUpBytes = document.getElementById('stat_up_bytes');

                if (sDown) sDown.innerHTML = `${curDownVal.toFixed(1)} <span style="font-size:1rem;">Mbps</span>`;
                if (sUp) sUp.innerHTML = `${curUpVal.toFixed(1)} <span style="font-size:1rem;">Mbps</span>`;
                if (sDownPps) sDownPps.textContent = `${Math.round(curDownVal * 115).toLocaleString('pt-BR')} pps`;
                if (sUpPps) sUpPps.textContent = `${Math.round(curUpVal * 125).toLocaleString('pt-BR')} pps`;

                const tbRx = (sessionRxBytes / 1099511627776).toFixed(2);
                const gbTx = (sessionTxBytes / 1073741824).toFixed(1);
                if (sDownBytes) sDownBytes.textContent = `${tbRx} TB transferidos`;
                if (sUpBytes) sUpBytes.textContent = `${gbTx} GB transferidos`;

                // Update latency and jitter with subtle micro-jitter
                const pingEl = document.getElementById('live_ping');
                const jitEl = document.getElementById('live_jitter');
                if (pingEl) pingEl.textContent = `${(2.4 + Math.random() * 0.8).toFixed(1)} ms`;
                if (jitEl) jitEl.textContent = `${(0.15 + Math.random() * 0.15).toFixed(1)} ms`;
            }

            if (window._trafficTimer) clearInterval(window._trafficTimer);
            window._trafficTimer = setInterval(draw, 1000);
            draw();
        }

        function showToast(msg) {
            const t = document.getElementById('toast_notify');
            if (!t) return;
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3500);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
                closeLuciSimulator();
                const drawer = document.getElementById('luci_drawer');
                if (drawer && drawer.classList.contains('open')) toggleLuciDrawer();
            }
        });

        window.addEventListener('resize', () => {
            initTrafficCanvas();
            if (window.innerWidth > 854) {
                const sb = document.getElementById('sidebar');
                const bd = document.getElementById('sidebar_backdrop');
                if (sb && sb.classList.contains('open')) sb.classList.remove('open');
                if (bd) bd.style.display = 'none';
            }
        });

        window.addEventListener('DOMContentLoaded', () => {
            renderDevicesTable();
            renderWifiNetworks();
            initTrafficCanvas();
            runDoctorCheck();
        });
    </script>
</body>
</html>'''

final_html = HTML_TEMPLATE.replace('__WIFI_QR_DATA_JSON__', QR_DATA_JSON)
with open(TARGET_FILE, "w", encoding="utf-8") as f:
    f.write(final_html)

print("Modular SPA V2 Dashboard generated successfully!")

