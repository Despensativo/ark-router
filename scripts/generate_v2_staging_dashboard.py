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

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
WORKSPACE_ROOT = os.path.abspath(os.path.join(REPO_DIR, "..", ".."))
TARGET_FILE = os.path.join(WORKSPACE_ROOT, "docs", "qa_screenshots", "v2_staging", "index.html")

print(f"Generating Modular SPA V2 Dashboard at: {TARGET_FILE}")
os.makedirs(os.path.dirname(TARGET_FILE), exist_ok=True)

with open(TARGET_FILE, "w", encoding="utf-8") as f:
    f.write(r'''<!DOCTYPE html>
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
            margin-bottom: 10px;
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
            padding: 16px;
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

        /* Modals & Backdrop */
        #modal_overlay {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100dvh;
            background: rgba(0, 0, 0, 0.78);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 2000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease, visibility 0.2s ease;
        }

        body.modal-overlay-active #modal_overlay {
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
        }

        .modal-box {
            background: #0f192d;
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: var(--ark-radius-lg);
            width: 100%;
            max-width: 580px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
            overflow: hidden;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
        }

        .modal-header {
            padding: 18px 22px;
            border-bottom: 1px solid var(--ark-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .modal-header h3 {
            font-size: 1.15rem;
            font-weight: 800;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .modal-close-btn {
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 1.3rem;
            cursor: pointer;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
        }

        .modal-close-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.1);
        }

        .modal-body {
            padding: 22px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .form-label {
            font-size: 0.8rem;
            font-weight: 700;
            color: #cbd5e1;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .form-select, .form-input {
            background: #162238;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 0.9rem;
            outline: none;
            width: 100%;
            transition: border-color 0.15s ease;
        }

        .form-select:focus, .form-input:focus {
            border-color: #38bdf8;
            box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
        }

        .form-select option {
            background: #0f192d;
            color: #fff;
            padding: 8px;
        }

        .modal-footer {
            padding: 16px 22px;
            border-top: 1px solid var(--ark-border);
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            background: rgba(0, 0, 0, 0.15);
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
            .modal-box {
                max-width: 95vw !important;
                margin: 8px !important;
            }
            .modal-footer {
                flex-direction: column-reverse !important;
                gap: 8px !important;
            }
            .modal-footer .ark-btn {
                width: 100% !important;
                min-height: 44px !important;
                font-size: 0.92rem !important;
            }
            .form-select, .form-input {
                min-height: 44px !important;
                font-size: 16px !important;
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

            <div class="nav-section-title">OpenWrt Nativo</div>
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
                                <button class="btn-hero-action btn-hero-primary" onclick="openModal('setup')">⚡ Setup</button>
                                <button class="btn-hero-action" onclick="openModal('op_mode')" id="btn_hero_opmode">🌐 Modo AP/Gateway</button>
                                <button class="btn-hero-action" onclick="openModal('gamer_mode')" id="btn_hero_gamer">🎮 Gamer Ultra</button>
                                <button class="btn-hero-action" onclick="openModal('language')" id="btn_hero_lang">🇧🇷 Idioma: PT-BR</button>
                                <a class="btn-hero-action" href="/cgi-bin/luci/admin/status/overview" onclick="openClassicLuci(event)" style="text-decoration:none; color:#cbd5e1;">💻 Interface Clássica ↗</a>
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

                    <!-- Live Real-Time Traffic Canvas -->
                    <div class="traffic-grid">
                        <div class="traffic-canvas-card">
                            <div class="traffic-canvas-header">
                                <div>
                                    <h3 style="font-size:0.95rem; font-weight:800; color:#fff;">Fluxo de Rede em Tempo Real</h3>
                                    <span style="font-size:0.75rem; color:#94a3b8;">Monitoramento dual-stream por amostragem contínua</span>
                                </div>
                                <div style="display:flex; gap:12px; font-size:0.78rem;">
                                    <span style="color:#38bdf8; font-weight:700;">● Download</span>
                                    <span style="color:#a855f7; font-weight:700;">● Upload</span>
                                </div>
                            </div>
                            <canvas id="live_traffic_canvas" width="700" height="140" style="width:100%; height:140px;"></canvas>
                        </div>

                        <div class="traffic-stats-column">
                            <div class="traffic-stat-card">
                                <div>
                                    <span style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#94a3b8;">↓ Download Agora</span>
                                    <div class="stat-rate down" id="stat_down">74.2 <span style="font-size:1rem;">Mbps</span></div>
                                    <div class="stat-peak">Pico hoje: 842.1 Mbps • 42.8 GB</div>
                                </div>
                                <span style="font-size:2rem; color:#38bdf8; opacity:0.3;">↓</span>
                            </div>
                            <div class="traffic-stat-card">
                                <div>
                                    <span style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#94a3b8;">↑ Upload Agora</span>
                                    <div class="stat-rate up" id="stat_up">18.6 <span style="font-size:1rem;">Mbps</span></div>
                                    <div class="stat-peak">Pico hoje: 412.5 Mbps • 14.2 GB</div>
                                </div>
                                <span style="font-size:2rem; color:#a855f7; opacity:0.3;">↑</span>
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
                    </div>
                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 3: WI-FI 6E & WI-FI 7 DEDICADO                     -->
                <!-- ========================================================= -->
                <section class="view-panel" id="view_wifi">
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>📶 Redes Sem Fio Wi-Fi 6E & Wi-Fi 7 (Tri-Band)</h2>
                                <span class="badge pill-purple">31 Clientes Sem Fio</span>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button class="ark-btn ark-btn-secondary" onclick="openModal('wifi_qr')">📲 QR Code</button>
                                <button class="ark-btn ark-btn-secondary" onclick="openModal('wps')">🤝 WPS Parear</button>
                                <button class="ark-btn ark-btn-purple" onclick="openModal('wifi')">⚙️ Configurar Wi-Fi</button>
                            </div>
                        </div>

                        <!-- Main SSID Header -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                            <div>
                                <span style="font-size:0.75rem; text-transform:uppercase; color:#94a3b8; font-weight:700;">Nome da Rede Wi-Fi Unificada (SSID)</span>
                                <div style="font-size:1.25rem; font-weight:800; color:#fff;" id="label_main_ssid">Wi-Fi-H&R</div>
                                <div style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">
                                    Senha: <span id="pwd_main_wifi">••••••••••••</span> 
                                    <button style="background:none; border:none; color:#38bdf8; cursor:pointer; font-weight:700; margin-left:6px;" onclick="toggleWifiPass()">👁️ Revelar</button>
                                </div>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <span class="pill-badge pill-online">WPA3-SAE MISTO + PMF</span>
                                <span class="pill-badge pill-purple">MLO 320 MHz ATIVO</span>
                            </div>
                        </div>

                        <!-- 3 Radios Grid -->
                        <div class="wifi-grid">
                            <div class="wifi-radio-card" id="card_radio_24">
                                <div class="wifi-radio-header">
                                    <span class="wifi-radio-title"><span style="color:#f59e0b;">●</span> Rádio 2.4 GHz</span>
                                    <span class="pill-badge pill-amber">12 Aparelhos</span>
                                </div>
                                <div class="wan-info-grid">
                                    <div class="wan-info-item"><span>Canal</span><strong id="ch_radio_24">Canal 6 (2437 MHz)</strong></div>
                                    <div class="wan-info-item"><span>Largura de Banda</span><strong id="width_radio_24">20 MHz</strong></div>
                                    <div class="wan-info-item"><span>Potência TX</span><strong id="tx_radio_24">20 dBm (100 mW)</strong></div>
                                    <div class="wan-info-item"><span>BSS Coloring</span><strong>Ativo (Cor 12)</strong></div>
                                </div>
                                <button class="ark-btn ark-btn-secondary" style="width:100%;" onclick="openRadioModal('2.4')">⚙️ Editar Rádio 2.4 GHz</button>
                            </div>

                            <div class="wifi-radio-card" id="card_radio_5">
                                <div class="wifi-radio-header">
                                    <span class="wifi-radio-title"><span style="color:#06b6d4;">●</span> Rádio 5 GHz</span>
                                    <span class="pill-badge pill-cyan">15 Aparelhos</span>
                                </div>
                                <div class="wan-info-grid">
                                    <div class="wan-info-item"><span>Canal</span><strong id="ch_radio_5">Canal 36 (5180 MHz)</strong></div>
                                    <div class="wan-info-item"><span>Largura de Banda</span><strong id="width_radio_5">160 MHz Ultra</strong></div>
                                    <div class="wan-info-item"><span>Potência TX</span><strong id="tx_radio_5">23 dBm (200 mW)</strong></div>
                                    <div class="wan-info-item"><span>Fast Roaming</span><strong>802.11r / 802.11v</strong></div>
                                </div>
                                <button class="ark-btn ark-btn-secondary" style="width:100%;" onclick="openRadioModal('5')">⚙️ Editar Rádio 5 GHz</button>
                            </div>

                            <div class="wifi-radio-card" id="card_radio_6">
                                <div class="wifi-radio-header">
                                    <span class="wifi-radio-title"><span style="color:#a855f7;">●</span> Rádio 6 GHz (Wi-Fi 6E/7)</span>
                                    <span class="pill-badge pill-purple">4 Aparelhos</span>
                                </div>
                                <div class="wan-info-grid">
                                    <div class="wan-info-item"><span>Canal</span><strong id="ch_radio_6">Canal 37 PSC (6135 MHz)</strong></div>
                                    <div class="wan-info-item"><span>Largura de Banda</span><strong id="width_radio_6">320 MHz (Extremo)</strong></div>
                                    <div class="wan-info-item"><span>Potência TX</span><strong id="tx_radio_6">23 dBm (200 mW)</strong></div>
                                    <div class="wan-info-item"><span>Modo MLO</span><strong>STR Multi-Link Ativo</strong></div>
                                </div>
                                <button class="ark-btn ark-btn-secondary" style="width:100%;" onclick="openRadioModal('6')">⚙️ Editar Rádio 6 GHz</button>
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
                            <button class="ark-btn ark-btn-secondary" onclick="openModal('add_device')">➕ Adicionar Reserva IP Fixo</button>
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
                            <button class="ark-btn ark-btn-secondary" onclick="openModal('starlink_config')">⚙️ Configurações Dishy</button>
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
                                    <button class="ark-btn ark-btn-primary" onclick="triggerSysupgradeCheck()" style="width:100%;">
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

        <div class="luci-sim-classic-nav">
            <a class="luci-nav-tab active" onclick="switchLuciTab('status')">Status</a>
            <a class="luci-nav-tab" onclick="switchLuciTab('system')">Sistema</a>
            <a class="luci-nav-tab" onclick="switchLuciTab('network')">Rede</a>
            <a class="luci-nav-tab" onclick="switchLuciTab('services')">Serviços</a>
            <a class="luci-nav-tab" style="background:#0284c7; color:#fff;" onclick="closeLuciSimulator()">⚡ ARK Router</a>
        </div>

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
                    <h3>🔀 Nova Regra de Redirecionamento (Port Forwarding)</h3>
                    <button class="modal-close-btn" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Modelo Pré-Configurado (Preset Rápido)</label>
                        <select class="form-select" id="pf_preset" onchange="applyPortPreset(this.value)">
                            <option value="custom">Personalizado (Manual)</option>
                            <option value="plex">Plex Media Server (Porta 32400 TCP)</option>
                            <option value="ssh">SSH Remoto Seguro (Porta 2222 -> 22 TCP)</option>
                            <option value="web">Servidor Web HTTPS (Porta 443 TCP)</option>
                            <option value="minecraft">Minecraft Server (Porta 25565 TCP+UDP)</option>
                            <option value="torrent">Cliente BitTorrent (Porta 51413 TCP+UDP)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome da Regra</label>
                        <select class="form-select" id="pf_name">
                            <option value="Servidor Local">Servidor Local</option>
                            <option value="Jogo Online">Jogo Online</option>
                            <option value="Câmeras CFTV">Câmeras CFTV</option>
                            <option value="Acesso Remoto">Acesso Remoto</option>
                        </select>
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
                        <label class="form-label">Porta WAN Externa</label>
                        <select class="form-select" id="pf_ext_port">
                            <option value="8443" selected>Porta 8443 (HTTPS Alternativa)</option>
                            <option value="32400">Porta 32400 (Plex)</option>
                            <option value="25565">Porta 25565 (Minecraft)</option>
                            <option value="51413">Porta 51413 (Torrent)</option>
                            <option value="2222">Porta 2222 (SSH Seguro)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Dispositivo Destino na Rede Interna (IP)</label>
                        <select class="form-select" id="pf_int_ip">
                            <option value="192.168.1.105" selected>192.168.1.105 (Servidor-NAS-Synology)</option>
                            <option value="192.168.1.146">192.168.1.146 (MacMini-M2-Backup)</option>
                            <option value="192.168.1.150">192.168.1.150 (Camera-Seguranca-Frente)</option>
                            <option value="192.168.1.189">192.168.1.189 (PlayStation-5-Pro)</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="savePortForward()">💾 Adicionar Regra</button>
                </div>
            `;
        }

        function applyPortPreset(val) {
            if (val === 'plex') {
                document.getElementById('pf_proto').value = 'TCP';
                document.getElementById('pf_ext_port').value = '32400';
            } else if (val === 'minecraft') {
                document.getElementById('pf_proto').value = 'TCP+UDP';
                document.getElementById('pf_ext_port').value = '25565';
            } else if (val === 'torrent') {
                document.getElementById('pf_proto').value = 'TCP+UDP';
                document.getElementById('pf_ext_port').value = '51413';
            } else if (val === 'ssh') {
                document.getElementById('pf_proto').value = 'TCP';
                document.getElementById('pf_ext_port').value = '2222';
            }
        }

        function savePortForward() {
            const name = document.getElementById('pf_name').value;
            const proto = document.getElementById('pf_proto').value;
            const ext = document.getElementById('pf_ext_port').value;
            const ip = document.getElementById('pf_int_ip').value;
            const tbody = document.getElementById('port_forward_tbody');
            if (tbody) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${name}</strong></td>
                    <td><span class="pill-badge pill-cyan">${proto}</span></td>
                    <td><code>${ext}</code></td>
                    <td>${ip}</td>
                    <td><code>${ext}</code></td>
                    <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                    <td style="text-align:right;"><button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deletePortRule(this)">🗑️</button></td>
                `;
                tbody.appendChild(tr);
            }
            closeModal();
            showToast(`✅ Regra de redirecionamento para porta ${ext} criada com sucesso!`);
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

        function openLuciSimulator(route) {
            const container = document.getElementById('luci_native_view_container');
            const routeLabel = document.getElementById('luci_sim_current_route');
            const body = document.getElementById('luci_sim_content_body');
            
            routeLabel.textContent = `Rota Original: /cgi-bin/luci/admin/${route}`;
            container.classList.add('active');

            if (route === 'overview' || route === 'status') {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:6px; padding:20px; color:#fff; margin-bottom:20px;">
                        <h2 style="font-size:1.15rem; font-weight:700; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">Status do Sistema (Visão Geral Original LuCI)</h2>
                        <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:8px 0; color:#9ca3af; width:220px;">Nome do Host</td><td><strong>OpenWrt</strong></td></tr>
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:8px 0; color:#9ca3af;">Modelo do Roteador</td><td>Acer Predator Connect W6x (Wi-Fi 6E)</td></tr>
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:8px 0; color:#9ca3af;">Arquitetura do Chip</td><td>MediaTek Filogic 830 (ARMv8 Cortex-A53)</td></tr>
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:8px 0; color:#9ca3af;">Versão do Firmware</td><td>OpenWrt 24.10.0 r27208 / LuCI openwrt-24.10 branch</td></tr>
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:8px 0; color:#9ca3af;">Versão do Kernel</td><td>6.6.54</td></tr>
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:8px 0; color:#9ca3af;">Hora Local</td><td>${new Date().toLocaleString('pt-BR')}</td></tr>
                            <tr style="border-bottom:1px solid #374151;"><td style="padding:8px 0; color:#9ca3af;">Tempo Ativo (Uptime)</td><td>14 dias, 8 horas, 12 minutos</td></tr>
                            <tr><td style="padding:8px 0; color:#9ca3af;">Carga Média</td><td>0.15, 0.12, 0.08</td></tr>
                        </table>
                    </div>
                `;
            } else {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:6px; padding:20px; color:#fff; margin-bottom:20px;">
                        <h2 style="font-size:1.15rem; font-weight:700; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">Página LuCI: ${route}</h2>
                        <p style="font-size:0.9rem; color:#cbd5e1; line-height:1.5;">
                            Esta rota nativa do OpenWrt LuCI (<code>/cgi-bin/luci/admin/${route}</code>) está perfeitamente linkada. Em um dispositivo físico ou VM conectada via ubus/rpcd, o formulário UCI completo é renderizado aqui.
                        </p>
                    </div>
                `;
            }
        }

        function closeLuciSimulator() {
            document.getElementById('luci_native_view_container').classList.remove('active');
        }

        function switchLuciTab(tab) {
            openLuciSimulator(tab);
        }

        // Modals with 100% Selects
        function openModal(type) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');

            if (type === 'setup') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>⚡ Assistente de Setup Rápido ARK</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Tipo de Conexão com o Provedor (WAN 1)</label>
                            <select class="form-select" id="setup_proto">
                                <option value="pppoe" selected>Fibra Óptica PPPoE (Vivo, Oi, Desktop, Vero)</option>
                                <option value="dhcp">DHCP Automático (Claro Fibra/Coaxial, Starlink, Modem Bridge)</option>
                                <option value="static">IP Estático Fixo Corporativo</option>
                                <option value="ap">Modo Ponto de Acesso / Ponte (Desativa Roteador)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Nome da Rede Wi-Fi Unificada (SSID)</label>
                            <input type="text" class="form-input" id="setup_ssid" value="Wi-Fi-H&R">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Senha da Rede Sem Fio</label>
                            <input type="password" class="form-input" id="setup_pass" value="MinhaSenhaForte2026">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveSetupModal()">💾 Salvar e Aplicar</button>
                    </div>
                `;
            } else if (type === 'wifi') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📶 Configurar Redes Wi-Fi (Tri-Band)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Nome da Rede Wi-Fi (SSID)</label>
                            <input type="text" class="form-input" id="m_wifi_ssid" value="Wi-Fi-H&R">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Senha de Acesso (Mínimo 8 dígitos)</label>
                            <input type="password" class="form-input" id="m_wifi_pass" value="MinhaSenhaForte2026">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Modo de Criptografia & Segurança</label>
                            <select class="form-select">
                                <option selected>WPA3-SAE / WPA2-PSK Misto + PMF (Recomendado)</option>
                                <option>WPA3-SAE Puro (Máxima Blindagem Wi-Fi 6E/7)</option>
                                <option>WPA2-PSK Legado</option>
                            </select>
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
                        <h3>⚡ Calibrar SQM CAKE & Bufferbloat</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Plano de Velocidade Contratada</label>
                            <select class="form-select" id="m_sqm_preset" onchange="applySqmPreset(this.value)">
                                <option value="1000">1 Gbps Download / 500 Mbps Upload</option>
                                <option value="850" selected>850 Mbps Download / 450 Mbps Upload (Calibrado)</option>
                                <option value="600">600 Mbps Download / 300 Mbps Upload</option>
                                <option value="500">500 Mbps Download / 250 Mbps Upload</option>
                                <option value="300">300 Mbps Download / 150 Mbps Upload</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Compensação de Framing (Overhead)</label>
                            <select class="form-select">
                                <option selected>Fibra Óptica FTTH / GPON (44 bytes de overhead)</option>
                                <option>Ethernet Pura (18 bytes de overhead)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveSqmModal()">💾 Salvar SQM</button>
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
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📲 Conexão Wi-Fi via QR Code</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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
                                <circle cx="50" cy="50" r="10" fill="#0284c7" />
                            </svg>
                        </div>
                        <h4 style="color:#fff;">Wi-Fi-H&R</h4>
                        <p style="font-size:0.8rem; color:#94a3b8;">Aponte a câmera do seu celular para conectar automaticamente.</p>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button></div>
                `;
            } else if (type === 'wps') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🤝 Conectar Dispositivo por WPS (Push Button)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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
                        <h3>🎨 Selecionar Tema Visual do ARK Router</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Paleta de Cores e Estilo Visual</label>
                            <select class="form-select">
                                <option selected>ARK Flagship Cyan & Deep Blue (Padrão)</option>
                                <option>Predator Gamer Red & Carbon</option>
                                <option>Cyber Emerald Green</option>
                                <option>Quantum Purple & Violet</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-primary" onclick="closeModal(); showToast('🎨 Tema aplicado!')">Fechar</button></div>
                `;
            } else if (type === 'op_mode') {
                const currentOp = window.currentOperationMode || 'gateway';
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🌐 Modo de Operação do Roteador</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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
                            <label class="form-label">Endereço IP Reservado Desejado</label>
                            <select class="form-select" id="m_new_dev_ip">
                                <option value="192.168.1.50">192.168.1.50 (Faixa de Servidores)</option>
                                <option value="192.168.1.55">192.168.1.55</option>
                                <option value="192.168.1.60">192.168.1.60 (Faixa Gamer / Consoles)</option>
                                <option value="192.168.1.99">192.168.1.99</option>
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
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Nome da Interface Virtual</label>
                            <select class="form-select" id="m_vpn_iface">
                                <option value="wg1" selected>wg1 (Túnel Pessoal / Provedor Comercial)</option>
                                <option value="wg_office">wg_escritorio (Acesso Corporativo)</option>
                                <option value="wg_home">wg_casa (Ponto a Ponto Remoto)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Servidor Endpoint Remoto & Porta</label>
                            <select class="form-select" id="m_vpn_endpoint">
                                <option value="vpn.sp.arkrouter.net:51820" selected>vpn.sp.arkrouter.net:51820 (São Paulo - Latência 4 ms)</option>
                                <option value="vpn.mia.arkrouter.net:51820">vpn.mia.arkrouter.net:51820 (Miami - Latência 115 ms)</option>
                                <option value="vpn.fra.arkrouter.net:51820">vpn.fra.arkrouter.net:51820 (Frankfurt - Latência 180 ms)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Endereço IP da Interface Local (/24)</label>
                            <input type="text" class="form-input" id="m_vpn_local_ip" value="10.14.0.3/24">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Chave Pública do Servidor (PublicKey)</label>
                            <input type="text" class="form-input" id="m_vpn_pubkey" value="tZ9q+bX81mN2kLm9...f9aL3=">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Redes Permitidas (AllowedIPs)</label>
                            <select class="form-select" id="m_vpn_allowed">
                                <option value="0.0.0.0/0" selected>0.0.0.0/0, ::/0 (Roteamento Integral de Toda a Conexão)</option>
                                <option value="10.0.0.0/8">10.0.0.0/8 (Apenas Subredes Privadas da Empresa)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-purple" onclick="saveVpnModal()">💾 Salvar e Conectar Túnel</button>
                    </div>
                `;
            } else if (type === 'pppoe_logs') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📜 Registro da Sessão PPPoE (Daemon pppd)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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
            } else {
                closeModal();
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
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
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

            cont.innerHTML = `
                <div class="modal-header">
                    <h3>🌐 Configurar ${isWan1 ? 'WAN 1 (Vivo Fibra GPON)' : 'WAN 2 (Claro Fibra)'}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Protocolo de Conexão com o Provedor</label>
                        <select class="form-select" id="m_wan_proto">
                            <option value="pppoe" ${isWan1 ? 'selected' : ''}>PPPoE (Vivo Fibra, Oi, Provedores Regionais FTTH)</option>
                            <option value="dhcp" ${!isWan1 ? 'selected' : ''}>DHCP Cliente Automático (Claro Fibra, Starlink, Modem Bridge)</option>
                            <option value="static">IP Estático Fixo Corporativo</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tamanho Máximo de Pacote (MTU)</label>
                        <select class="form-select" id="m_wan_mtu">
                            <option value="1492" ${isWan1 ? 'selected' : ''}>1492 (Padrão Otimizado Fibra PPPoE - Elimina Fragmentação)</option>
                            <option value="1500" ${!isWan1 ? 'selected' : ''}>1500 (Padrão Ethernet / Cabo / Starlink / DOCSIS)</option>
                            <option value="1480">1480 (Túneis Corporativos)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Servidores DNS de Resolução</label>
                        <select class="form-select" id="m_wan_dns">
                            <option value="1.1.1.1" selected>Cloudflare DNS (1.1.1.1 + 1.0.0.1 - Latência 2ms)</option>
                            <option value="8.8.8.8">Google DNS (8.8.8.8 + 8.8.4.4 - Alta Redundância)</option>
                            <option value="adguard">AdGuard DNS (94.140.14.14 - Bloqueio de Anúncios)</option>
                            <option value="isp">Automático do Provedor de Internet (ISP)</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="saveWanModal('${name}')">💾 Salvar e Aplicar</button>
                </div>
            `;
        }

        function saveWanModal(name) {
            const proto = document.getElementById('m_wan_proto').value;
            const mtu = document.getElementById('m_wan_mtu').value;
            const dns = document.getElementById('m_wan_dns').options[document.getElementById('m_wan_dns').selectedIndex].text.split(' ')[0];

            if (name === 'wan1') {
                document.getElementById('proto_wan1').textContent = `${proto.toUpperCase()} (MTU ${mtu})`;
                document.getElementById('dns_wan1').textContent = dns;
            } else {
                document.getElementById('proto_wan2').textContent = `${proto.toUpperCase()} (MTU ${mtu})`;
                document.getElementById('dns_wan2').textContent = dns;
            }
            closeModal();
            showToast(`✅ Parâmetros de internet da ${name.toUpperCase()} aplicados com sucesso!`);
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
                    <button class="modal-close-btn" onclick="closeModal()">✕</button>
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

        function openDeviceModal(mac) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');
            const dev = DEVICES.find(d => d.mac === mac) || { name: 'Aparelho', ip: '192.168.1.100', mac: mac, type: 'phone', prio: 'normal' };

            cont.innerHTML = `
                <div class="modal-header">
                    <h3>📱 Gerenciar Aparelho — ${dev.name}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">✕</button>
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

        function closeModal() { document.body.classList.remove('modal-overlay-active'); }

        function saveSetupModal() {
            const ssid = document.getElementById('setup_ssid').value;
            document.getElementById('label_main_ssid').textContent = ssid;
            closeModal();
            showToast(`⚡ Setup concluído! Rede ${ssid} configurada.`);
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

        // Live Traffic Canvas 2D Animator
        function initTrafficCanvas() {
            const cvs = document.getElementById('live_traffic_canvas');
            if (!cvs || !cvs.parentElement) return;
            const ctx = cvs.getContext('2d');
            const w = cvs.width = cvs.parentElement.clientWidth - 32;
            const h = cvs.height = 140;

            let downPoints = new Array(30).fill(50);
            let upPoints = new Array(30).fill(20);

            function draw() {
                ctx.clearRect(0, 0, w, h);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
                ctx.lineWidth = 1;
                for (let y = 20; y < h; y += 30) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(w, y);
                    ctx.stroke();
                }

                downPoints.shift();
                downPoints.push(Math.min(120, Math.max(30, downPoints[downPoints.length - 1] + (Math.random() * 24 - 12))));
                upPoints.shift();
                upPoints.push(Math.min(80, Math.max(10, upPoints[upPoints.length - 1] + (Math.random() * 14 - 7))));

                const curDown = (downPoints[downPoints.length - 1] * 0.95).toFixed(1);
                const curUp = (upPoints[upPoints.length - 1] * 0.85).toFixed(1);
                const sDown = document.getElementById('stat_down');
                const sUp = document.getElementById('stat_up');
                if (sDown) sDown.innerHTML = `${curDown} <span style="font-size:1rem;">Mbps</span>`;
                if (sUp) sUp.innerHTML = `${curUp} <span style="font-size:1rem;">Mbps</span>`;

                // Down Line
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                const step = w / (downPoints.length - 1);
                for (let i = 0; i < downPoints.length; i++) {
                    const x = i * step;
                    const y = h - downPoints[i];
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();

                // Up Line
                ctx.strokeStyle = "#a855f7";
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let i = 0; i < upPoints.length; i++) {
                    const x = i * step;
                    const y = h - upPoints[i];
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
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
            initTrafficCanvas();
            runDoctorCheck();
        });
    </script>
</body>
</html>''')

print("Modular SPA V2 Dashboard generated successfully!")
