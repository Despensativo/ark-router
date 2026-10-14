#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Senior UI/UX Redesign & Complete V2 Flagship Dashboard Generator.
Builds the comprehensive, interactive, production-grade V2 dashboard for local emulation.
- Structure closely aligned with V1 (Hero Banner with live clock/date, Health Strip,
  Live Traffic Canvas, Internet cards, Wi-Fi multi-band, 34 Devices, and all ARK modules).
- 100% of inputs that have discrete options converted to clean, user-friendly <select> dropdowns.
- Fully clickable Native LuCI integration with an authentic simulated LuCI interface preview
  and switcher, guaranteeing that every link is clickable and functional.
- Fully wired modals with real-time DOM updates and zero console errors.
"""

import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
WORKSPACE_ROOT = os.path.abspath(os.path.join(REPO_DIR, "..", ".."))
TARGET_FILE = os.path.join(WORKSPACE_ROOT, "docs", "qa_screenshots", "v2_staging", "index.html")

print(f"Generating Comprehensive V2 Flagship Dashboard at: {TARGET_FILE}")
os.makedirs(os.path.dirname(TARGET_FILE), exist_ok=True)

# Generate HTML code
with open(TARGET_FILE, "w", encoding="utf-8") as f:
    # Write the entire HTML in chunks
    f.write(r'''<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>ARK Router OS — Central de Operações V2 Pro</title>
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

        body {
            background-color: var(--ark-bg);
            color: var(--ark-text-main);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
            min-height: 100vh;
        }

        /* App Shell */
        .app-shell {
            display: flex;
            min-height: 100vh;
            width: 100%;
        }

        /* Sidebar Styling (V1 Inspired + Modern Navigation) */
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
            padding: 9px 12px;
            border-radius: var(--ark-radius-sm);
            color: var(--ark-text-muted);
            text-decoration: none;
            font-size: 0.86rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.18s ease;
            margin-bottom: 2px;
        }

        .nav-item:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.05);
        }

        .nav-item.active {
            color: #fff;
            background: linear-gradient(90deg, rgba(2, 132, 199, 0.28) 0%, rgba(2, 132, 199, 0.08) 100%);
            border-left: 3px solid #38bdf8;
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

        /* Top Header */
        .top-header {
            position: sticky;
            top: 0;
            z-index: 40;
            background: rgba(11, 19, 36, 0.88);
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
            gap: 12px;
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

        /* Hero Banner (Faithful to V1, elevated for V2) */
        .ex-hero {
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(22, 34, 56, 0.95) 100%);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-lg);
            padding: 24px;
            margin-bottom: 22px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 18px;
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
        }

        .ex-hero-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .ex-hero-eyebrow {
            font-size: 0.74rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #38bdf8;
            font-weight: 800;
        }

        .ex-hero-title {
            font-size: 1.7rem;
            font-weight: 800;
            color: #fff;
            letter-spacing: -0.02em;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .ex-hero-desc {
            font-size: 0.86rem;
            color: #94a3b8;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
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

        /* Health Strip (V1 Style) */
        .health-strip {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 14px;
            margin-bottom: 22px;
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

        /* Main Content Grid */
        .content-area {
            flex-grow: 1;
            padding: 24px;
            max-width: 1500px;
            margin: 0 auto;
            width: 100%;
        }

        /* Section Cards */
        .section-card {
            background: var(--ark-surface-1);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-lg);
            padding: 22px;
            margin-bottom: 22px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
            scroll-margin-top: 80px;
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
            font-size: 1.2rem;
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

        /* Live Traffic Grid */
        .traffic-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 18px;
            margin-bottom: 22px;
        }

        @media (max-width: 1024px) {
            .traffic-grid {
                grid-template-columns: 1fr;
            }
        }

        .traffic-canvas-card {
            background: var(--ark-surface-2);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 16px;
            position: relative;
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

        .stat-rate.down {
            color: #38bdf8;
        }

        .stat-rate.up {
            color: #a855f7;
        }

        .stat-peak {
            font-size: 0.75rem;
            color: var(--ark-text-muted);
            margin-top: 4px;
        }

        /* Internet (Multi-WAN) Cards */
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
            transition: border-color 0.2s ease;
        }

        .wan-card:hover {
            border-color: rgba(56, 189, 248, 0.4);
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

        .device-tab:hover {
            color: #fff;
        }

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

        .device-search-input:focus {
            border-color: var(--ark-primary);
        }

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

        .device-table tr:hover {
            background: rgba(255, 255, 255, 0.02);
        }

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

        .ark-btn-primary:hover {
            background: var(--ark-primary-hover);
        }

        .ark-btn-purple {
            background: #7c3aed;
            border-color: rgba(168, 85, 247, 0.4);
        }

        .ark-btn-purple:hover {
            background: #6d28d9;
        }

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

        /* MODAL OVERLAY (With strict LuCI compatibility) */
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
            animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            max-height: 90vh;
            display: flex;
            flex-direction: column;
        }

        @keyframes modalPop {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
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

        .form-hint {
            font-size: 0.75rem;
            color: #94a3b8;
            line-height: 1.35;
        }

        .modal-footer {
            padding: 16px 22px;
            border-top: 1px solid var(--ark-border);
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            background: rgba(0, 0, 0, 0.15);
        }

        /* NATIVE LUCI SLIDE-OVER DRAWER */
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

        #luci_drawer.open {
            right: 0;
        }

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

        /* NATIVE LUCI SIMULATOR VIEW (For full preview in staging) */
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

        #luci_native_view_container.active {
            display: flex;
        }

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

        @media (max-width: 854px) {
            .sidebar {
                position: fixed;
                left: -260px;
            }
            .sidebar.open {
                transform: translateX(260px);
            }
            .btn-hamburger {
                display: block;
            }
            .top-header {
                padding: 0 14px;
            }
            .content-area {
                padding: 14px;
            }
            .ex-hero {
                padding: 16px;
            }
            .ex-hero-right {
                align-items: flex-start;
                width: 100%;
            }
        }
    </style>
</head>
<body>

    <!-- App Shell -->
    <div class="app-shell">

        <!-- Sidebar Navigation -->
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-brand">
                <div class="sidebar-logo">⚡</div>
                <div class="sidebar-title">
                    <h1>ARK Router</h1>
                    <span class="version-badge">v1.5.17 Pro (V2)</span>
                </div>
            </div>

            <div class="nav-section-title">Central Operacional</div>
            <a class="nav-item active" onclick="scrollToSection('sec-overview')">
                <span class="icon">📊</span> Visão Geral
            </a>
            <a class="nav-item" onclick="scrollToSection('sec-wan')">
                <span class="icon">🌐</span> Multi-WAN & Failover
            </a>
            <a class="nav-item" onclick="scrollToSection('sec-wifi')">
                <span class="icon">📶</span> Wi-Fi 6E / Wi-Fi 7
            </a>
            <a class="nav-item" onclick="scrollToSection('sec-enhancer')">
                <span class="icon">🚀</span> Wi-Fi Enhancer
            </a>
            <a class="nav-item" onclick="scrollToSection('sec-devices')">
                <span class="icon">📱</span> Dispositivos (<span id="side_dev_count">34</span>)
            </a>

            <div class="nav-section-title">Engenharia & Performance</div>
            <a class="nav-item" onclick="scrollToSection('sec-doctor')">
                <span class="icon">🩺</span> Ark Doctor (Diagnóstico)
            </a>
            <a class="nav-item" onclick="scrollToSection('sec-sqm')">
                <span class="icon">⚡</span> SQM CAKE Bufferbloat
            </a>
            <a class="nav-item" onclick="scrollToSection('sec-starlink')">
                <span class="icon">🛰️</span> Starlink Dishy LEO
            </a>
            <a class="nav-item" onclick="scrollToSection('sec-vpn')">
                <span class="icon">🔒</span> VPN WireGuard & PBR
            </a>
            <a class="nav-item" onclick="scrollToSection('sec-speedtest')">
                <span class="icon">🚀</span> Teste de Velocidade
            </a>
            <a class="nav-item" onclick="scrollToSection('sec-hardware')">
                <span class="icon">💡</span> Hardware & LEDs
            </a>

            <div class="nav-section-title">OpenWrt LuCI</div>
            <a class="nav-item" style="color:#38bdf8;" onclick="toggleLuciDrawer()">
                <span class="icon">🛠️</span> LuCI Nativo ▾
            </a>
            <a class="nav-item" style="color:#c084fc;" onclick="openLuciSimulator('overview')">
                <span class="icon">💻</span> Ver Interface Clássica
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
                    <span style="font-size:0.92rem; font-weight:700; color:#fff;">
                        🏠 Acer Predator W6x <span style="color:#64748b;">(192.168.73.1)</span>
                    </span>
                </div>
                <div class="header-right">
                    <button class="btn-hero-action" onclick="toggleLuciDrawer()" style="background:rgba(56,189,248,0.15); border-color:rgba(56,189,248,0.35); color:#38bdf8;">
                        🛠️ LuCI Nativo ▾
                    </button>
                    <button class="btn-hero-action" onclick="openModal('setup')">
                        ⚡ Setup Rápido
                    </button>
                    <button class="btn-hero-action" onclick="openModal('theme_picker')">
                        🎨 Tema
                    </button>
                </div>
            </header>

            <!-- Main Content Area -->
            <main class="content-area">

                <!-- HERO BANNER (V1 Structural Identity, Elevated for V2) -->
                <section class="ex-hero" id="sec-overview">
                    <div class="ex-hero-info">
                        <span class="ex-hero-eyebrow">PAINEL DE CONTROLE • ACER PREDATOR W6X (WI-FI 6E)</span>
                        <h2 class="ex-hero-title">
                            ARK Router <span class="pill-badge pill-online">ATIVO</span>
                        </h2>
                        <p class="ex-hero-desc">
                            <span>OpenWrt 24.10.0</span> • 
                            <span>Kernel 6.6.54</span> • 
                            <span>MediaTek Filogic 830 (MT7986A 4x 2.0GHz)</span> • 
                            <strong style="color:#38bdf8;">ARK OS v1.5.17</strong>
                        </p>
                        <div class="ex-hero-actions" style="margin-top:10px;">
                            <button class="btn-hero-action btn-hero-primary" onclick="openModal('setup')">⚡ Ark - Setup</button>
                            <button class="btn-hero-action" onclick="openModal('op_mode')">🌐 Modo: Roteador Gateway</button>
                            <button class="btn-hero-action" onclick="openModal('gamer_mode')">🎮 Perfil Gamer Ultra</button>
                            <button class="btn-hero-action" onclick="openModal('language')">🇧🇷 Idioma: PT-BR</button>
                            <button class="btn-hero-action" onclick="toggleLuciDrawer()">🛠️ Menus LuCI Nativo</button>
                        </div>
                    </div>
                    <div class="ex-hero-right">
                        <div class="ex-hero-status-row">
                            <span class="pill-badge pill-online" style="padding:6px 12px; font-size:0.8rem;">● TUDO OPERACIONAL</span>
                            <div class="ex-clock-box" onclick="openModal('clock')" title="Ajustar relógio e servidor NTP">
                                <span class="ex-date-val" id="live_date">14/10/2026</span>
                                <span class="ex-time-val" id="live_clock">03:15:00</span>
                            </div>
                        </div>
                        <span style="font-size:0.75rem; color:#64748b;">sessão segura de 12 horas • atualização contínua a cada 3s</span>
                    </div>
                </section>

                <!-- HEALTH STRIP (5 Hardware Vitals) -->
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

                <!-- LIVE TRAFFIC CANVAS & PEAKS -->
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
                        <canvas id="live_traffic_canvas" width="700" height="150" style="width:100%; height:150px;"></canvas>
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

                <!-- SECTION: MULTI-WAN & FAILOVER -->
                <section class="section-card" id="sec-wan">
                    <div class="section-header">
                        <div class="section-title">
                            <h2>🌐 Conexões de Internet & Multi-WAN (mwan3)</h2>
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
                                <div class="wan-info-item">
                                    <span>Endereço IP Público</span>
                                    <strong id="ip_wan1">187.54.21.90</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Protocolo</span>
                                    <strong id="proto_wan1">PPPoE (MTU 1492)</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Servidores DNS</span>
                                    <strong id="dns_wan1">1.1.1.1 (Cloudflare)</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Tempo Online</span>
                                    <strong id="uptime_wan1">14 dias, 8 horas</strong>
                                </div>
                            </div>
                            <div class="wan-actions">
                                <button class="ark-btn ark-btn-primary" style="flex:1;" onclick="openWanModal('wan1')">
                                    ⚙️ Editar Internet
                                </button>
                                <button class="ark-btn ark-btn-secondary" onclick="openModal('pppoe_logs')">
                                    📜 Logs PPPoE
                                </button>
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
                                <div class="wan-info-item">
                                    <span>Endereço IP Público</span>
                                    <strong id="ip_wan2">201.86.110.45</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Protocolo</span>
                                    <strong id="proto_wan2">DHCP Cliente (MTU 1500)</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Servidores DNS</span>
                                    <strong id="dns_wan2">8.8.8.8 (Google)</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Tempo Online</span>
                                    <strong id="uptime_wan2">6 dias, 2 horas</strong>
                                </div>
                            </div>
                            <div class="wan-actions">
                                <button class="ark-btn ark-btn-primary" style="flex:1;" onclick="openWanModal('wan2')">
                                    ⚙️ Editar Internet
                                </button>
                                <button class="ark-btn ark-btn-secondary" onclick="testWanPing('wan2')">
                                    📶 Testar Ping
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- SECTION: WI-FI 6E / 7 MULTI-BAND -->
                <section class="section-card" id="sec-wifi">
                    <div class="section-header">
                        <div class="section-title">
                            <h2>📶 Redes Sem Fio Wi-Fi 6E & Wi-Fi 7</h2>
                            <span class="badge pill-purple">Tri-Band Ativo (31 Clientes)</span>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="ark-btn ark-btn-secondary" onclick="openModal('wifi_qr')">📲 QR Code</button>
                            <button class="ark-btn ark-btn-secondary" onclick="openModal('wps')">🤝 WPS Parear</button>
                            <button class="ark-btn ark-btn-purple" onclick="openModal('wifi')">⚙️ Configurar Wi-Fi</button>
                        </div>
                    </div>

                    <!-- Main Wi-Fi Card -->
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

                    <div class="wifi-grid">
                        <!-- Radio 2.4 GHz -->
                        <div class="wifi-radio-card" id="card_radio_24">
                            <div class="wifi-radio-header">
                                <span class="wifi-radio-title">
                                    <span style="color:#f59e0b;">●</span> Rádio 2.4 GHz
                                </span>
                                <span class="pill-badge pill-amber">12 Aparelhos</span>
                            </div>
                            <div class="wan-info-grid">
                                <div class="wan-info-item">
                                    <span>Canal</span>
                                    <strong id="ch_radio_24">Canal 6 (2437 MHz)</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Largura de Banda</span>
                                    <strong id="width_radio_24">20 MHz</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Potência TX</span>
                                    <strong id="tx_radio_24">20 dBm (100 mW)</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>BSS Coloring</span>
                                    <strong>Ativo (Cor 12)</strong>
                                </div>
                            </div>
                            <button class="ark-btn ark-btn-secondary" style="width:100%;" onclick="openRadioModal('2.4')">
                                ⚙️ Editar Rádio 2.4 GHz
                            </button>
                        </div>

                        <!-- Radio 5 GHz -->
                        <div class="wifi-radio-card" id="card_radio_5">
                            <div class="wifi-radio-header">
                                <span class="wifi-radio-title">
                                    <span style="color:#06b6d4;">●</span> Rádio 5 GHz
                                </span>
                                <span class="pill-badge pill-cyan">15 Aparelhos</span>
                            </div>
                            <div class="wan-info-grid">
                                <div class="wan-info-item">
                                    <span>Canal</span>
                                    <strong id="ch_radio_5">Canal 36 (5180 MHz)</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Largura de Banda</span>
                                    <strong id="width_radio_5">160 MHz Ultra</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Potência TX</span>
                                    <strong id="tx_radio_5">23 dBm (200 mW)</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Fast Roaming</span>
                                    <strong>802.11r / 802.11v</strong>
                                </div>
                            </div>
                            <button class="ark-btn ark-btn-secondary" style="width:100%;" onclick="openRadioModal('5')">
                                ⚙️ Editar Rádio 5 GHz
                            </button>
                        </div>

                        <!-- Radio 6 GHz -->
                        <div class="wifi-radio-card" id="card_radio_6">
                            <div class="wifi-radio-header">
                                <span class="wifi-radio-title">
                                    <span style="color:#a855f7;">●</span> Rádio 6 GHz (Wi-Fi 6E/7)
                                </span>
                                <span class="pill-badge pill-purple">4 Aparelhos</span>
                            </div>
                            <div class="wan-info-grid">
                                <div class="wan-info-item">
                                    <span>Canal</span>
                                    <strong id="ch_radio_6">Canal 37 PSC (6135 MHz)</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Largura de Banda</span>
                                    <strong id="width_radio_6">320 MHz (Extremo)</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Potência TX</span>
                                    <strong id="tx_radio_6">23 dBm (200 mW)</strong>
                                </div>
                                <div class="wan-info-item">
                                    <span>Modo MLO</span>
                                    <strong>STR Multi-Link Ativo</strong>
                                </div>
                            </div>
                            <button class="ark-btn ark-btn-secondary" style="width:100%;" onclick="openRadioModal('6')">
                                ⚙️ Editar Rádio 6 GHz
                            </button>
                        </div>
                    </div>
                </section>

                <!-- SECTION: SMART WI-FI ENHANCER (STEPPER) -->
                <section class="section-card" id="sec-enhancer">
                    <div class="section-header">
                        <div class="section-title">
                            <h2>🚀 Smart Wi-Fi Package Enhancer</h2>
                            <span class="badge pill-online">Instalador Atômico</span>
                        </div>
                        <button class="ark-btn ark-btn-primary" id="btn_run_enhancer" onclick="startEnhancerProcess()">
                            ⚡ Iniciar Otimização Wi-Fi
                        </button>
                    </div>

                    <p style="font-size:0.86rem; color:#cbd5e1; margin-bottom:18px; line-height:1.5;">
                        Migra seu subsistema de rádio sem fio com segurança atômica: remove conflitos de pacotes mínimos (`wpad-basic`),
                        instala o stack completo `wpad-mbedtls`, calibra chaves criptográficas WPA3-SAE e ativa transição suave 802.11v/k sem reiniciar o roteador.
                    </p>

                    <!-- Stepper Visualizer -->
                    <div id="enhancer_stepper_box" style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:20px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:14px;">
                            <span style="font-weight:700; color:#fff;" id="enhancer_status_title">Status: Pronto para otimizar rádios Wi-Fi</span>
                            <span style="font-weight:800; color:#38bdf8;" id="enhancer_step_counter">Etapa 0 de 7</span>
                        </div>
                        <div class="health-bar-bg" style="height:8px; margin-bottom:18px;">
                            <div class="health-bar-fill" id="enhancer_progress_bar" style="width:0%; background:linear-gradient(90deg, #0284c7, #10b981);"></div>
                        </div>
                        <div id="enhancer_log_box" style="background:#090e1a; border:1px solid var(--ark-border); border-radius:8px; padding:12px; font-family:monospace; font-size:0.78rem; color:#94a3b8; max-height:120px; overflow-y:auto;">
                            [SISTEMA] Aguardando clique para iniciar validação dos módulos Wi-Fi...
                        </div>
                    </div>
                </section>

                <!-- SECTION: CONNECTED DEVICES (34 CLIENTS) -->
                <section class="section-card" id="sec-devices">
                    <div class="section-header">
                        <div class="section-title">
                            <h2>📱 Aparelhos Conectados na Rede</h2>
                            <span class="badge pill-online" id="main_dev_badge">34 Dispositivos Online</span>
                        </div>
                        <button class="ark-btn ark-btn-secondary" onclick="openModal('add_device')">
                            ➕ Adicionar Reserva IP Fixo
                        </button>
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
                                <!-- Populated dynamically by JS -->
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- SECTION: ARK DOCTOR (12 HEALTH CHECKS) -->
                <section class="section-card" id="sec-doctor">
                    <div class="section-header">
                        <div class="section-title">
                            <h2>🩺 Ark Doctor — Diagnóstico Vital Inteligente</h2>
                            <span class="badge pill-online">12/12 Subsistemas Saudáveis</span>
                        </div>
                        <button class="ark-btn ark-btn-primary" onclick="runDoctorCheck()">
                            🔄 Executar Diagnóstico Completo
                        </button>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;" id="doctor_checks_grid">
                        <!-- Populated by JS -->
                    </div>
                </section>

                <!-- SECTION: SQM CAKE & BUFFERBLOAT -->
                <section class="section-card" id="sec-sqm">
                    <div class="section-header">
                        <div class="section-title">
                            <h2>⚡ SQM CAKE — Mitigação de Bufferbloat (Nota A+)</h2>
                            <span class="badge pill-online">Algoritmo CAKE Ativo</span>
                        </div>
                        <button class="ark-btn ark-btn-primary" onclick="openModal('sqm')">
                            ⚙️ Calibrar Banda & Framing
                        </button>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;" class="traffic-grid">
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                            <span style="font-size:0.75rem; text-transform:uppercase; color:#94a3b8; font-weight:700;">Conformidade Bufferbloat</span>
                            <div style="font-size:2rem; font-weight:900; color:#10b981; margin:4px 0;">NOTA A+ (0.4 ms)</div>
                            <p style="font-size:0.82rem; color:#cbd5e1; line-height:1.4;">
                                O escalonador CAKE fragmenta fluxos pesados de download em microslots contínuos, garantindo 0 ms de fila sob saturação máxima da rede.
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
                </section>

                <!-- SECTION: STARLINK DISHY LEO -->
                <section class="section-card" id="sec-starlink">
                    <div class="section-header">
                        <div class="section-title">
                            <h2>🛰️ Starlink Dishy — Telemetria Orbital LEO</h2>
                            <span class="badge pill-cyan">Antena Starlink Mini Conectada</span>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="ark-btn ark-btn-secondary" onclick="openModal('starlink_config')">⚙️ Configurações Dishy</button>
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
                </section>

                <!-- SECTION: VPN WIREGUARD & PBR -->
                <section class="section-card" id="sec-vpn">
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
                            <div style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">Endpoint: 198.51.100.22:51820 • IP Virtual: 10.14.0.2/24 • Handshake: há 14 segundos</div>
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
                </section>

                <!-- SECTION: SPEEDTEST MULTI-WAN -->
                <section class="section-card" id="sec-speedtest">
                    <div class="section-header">
                        <div class="section-title">
                            <h2>🚀 Teste de Velocidade Multi-WAN em Tempo Real</h2>
                            <span class="badge pill-online">Motor Speedtest OOKLA Integrado</span>
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
                                <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">Latência / Jitter</span>
                                <div style="font-size:1.8rem; font-weight:900; color:#10b981;" id="sp_ping_val">3.2 <span style="font-size:0.9rem;">ms</span></div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- SECTION: HARDWARE & LEDS -->
                <section class="section-card" id="sec-hardware">
                    <div class="section-header">
                        <div class="section-title">
                            <h2>💡 Hardware, Iluminação & LEDs Noturnos</h2>
                            <span class="badge pill-online">Controle de Placa</span>
                        </div>
                        <button class="ark-btn ark-btn-secondary" onclick="openModal('led_control')">⚙️ Configurar LEDs</button>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                        <div>
                            <div style="font-size:1rem; font-weight:800; color:#fff;">Modo Noturno (Desligar Iluminação do Roteador)</div>
                            <div style="font-size:0.8rem; color:#94a3b8;">Desativa todos os LEDs físicos das portas e logotipo frontal para ambientes escuros.</div>
                        </div>
                        <label class="ark-switch">
                            <input type="checkbox" id="led_night_toggle" onchange="toggleNightLeds(this)">
                            <span class="ark-slider"></span>
                        </label>
                    </div>
                </section>

            </main>
        </div>
    </div>

    <!-- ========================================================= -->
    <!-- SLIDE-OVER DRAWER: PÁGINAS NATIVAS DO LUCI (100% CLICÁVEIS) -->
    <!-- ========================================================= -->
    <div id="luci_drawer_backdrop" onclick="toggleLuciDrawer()"></div>
    <div id="luci_drawer">
        <div class="drawer-header">
            <h3 style="color:#fff; font-size:1.1rem; font-weight:800;">🛠️ LuCI Nativo do OpenWrt</h3>
            <button class="modal-close-btn" onclick="toggleLuciDrawer()">✕</button>
        </div>
        <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4;">
            Acesso irrestrito a todas as configurações avançadas originais do OpenWrt. Clique em qualquer item abaixo para abrir a página.
        </p>

        <div class="drawer-category">📊 Status & Diagnósticos</div>
        <a class="drawer-link" href="/cgi-bin/luci/admin/status/overview" onclick="handleLuciClick(event, 'overview')">
            <span>Visão Geral Original (Status)</span>
            <span class="drawer-link-meta">/status/overview</span>
        </a>
        <a class="drawer-link" href="/cgi-bin/luci/admin/status/routes" onclick="handleLuciClick(event, 'routes')">
            <span>Tabela de Rotas de Rede</span>
            <span class="drawer-link-meta">/status/routes</span>
        </a>
        <a class="drawer-link" href="/cgi-bin/luci/admin/status/syslog" onclick="handleLuciClick(event, 'syslog')">
            <span>Syslog do Sistema</span>
            <span class="drawer-link-meta">/status/syslog</span>
        </a>
        <a class="drawer-link" href="/cgi-bin/luci/admin/status/dmesg" onclick="handleLuciClick(event, 'dmesg')">
            <span>Log do Kernel (dmesg)</span>
            <span class="drawer-link-meta">/status/dmesg</span>
        </a>
        <a class="drawer-link" href="/cgi-bin/luci/admin/status/nftables" onclick="handleLuciClick(event, 'nftables')">
            <span>Regras do Firewall (nftables)</span>
            <span class="drawer-link-meta">/status/nftables</span>
        </a>

        <div class="drawer-category">🌐 Rede & Conexões</div>
        <a class="drawer-link" href="/cgi-bin/luci/admin/network/network" onclick="handleLuciClick(event, 'interfaces')">
            <span>Interfaces de Rede (WAN/LAN)</span>
            <span class="drawer-link-meta">/network/network</span>
        </a>
        <a class="drawer-link" href="/cgi-bin/luci/admin/network/wireless" onclick="handleLuciClick(event, 'wireless')">
            <span>Redes Sem Fio (Wireless)</span>
            <span class="drawer-link-meta">/network/wireless</span>
        </a>
        <a class="drawer-link" href="/cgi-bin/luci/admin/network/dhcp" onclick="handleLuciClick(event, 'dhcp')">
            <span>Servidor DHCP & DNS (dnsmasq)</span>
            <span class="drawer-link-meta">/network/dhcp</span>
        </a>
        <a class="drawer-link" href="/cgi-bin/luci/admin/network/firewall" onclick="handleLuciClick(event, 'firewall')">
            <span>Firewall & Redirecionamento NAT</span>
            <span class="drawer-link-meta">/network/firewall</span>
        </a>
        <a class="drawer-link" href="/cgi-bin/luci/admin/network/mwan" onclick="handleLuciClick(event, 'mwan')">
            <span>Multi-WAN (mwan3) Nativo</span>
            <span class="drawer-link-meta">/network/mwan</span>
        </a>

        <div class="drawer-category">⚙️ Sistema & Ferramentas</div>
        <a class="drawer-link" href="/cgi-bin/luci/admin/system/system" onclick="handleLuciClick(event, 'system')">
            <span>Configurações do Sistema</span>
            <span class="drawer-link-meta">/system/system</span>
        </a>
        <a class="drawer-link" href="/cgi-bin/luci/admin/system/opkg" onclick="handleLuciClick(event, 'packages')">
            <span>Gerenciador de Pacotes (Software)</span>
            <span class="drawer-link-meta">/system/opkg</span>
        </a>
        <a class="drawer-link" href="/cgi-bin/luci/admin/system/startup" onclick="handleLuciClick(event, 'startup')">
            <span>Scripts de Inicialização (init.d)</span>
            <span class="drawer-link-meta">/system/startup</span>
        </a>
        <a class="drawer-link" href="/cgi-bin/luci/admin/system/flash" onclick="handleLuciClick(event, 'flash')">
            <span>Backup / Gravar Firmware</span>
            <span class="drawer-link-meta">/system/flash</span>
        </a>
        <a class="drawer-link" href="/cgi-bin/luci/admin/system/reboot" onclick="handleLuciClick(event, 'reboot')">
            <span>Reinicialização do Sistema</span>
            <span class="drawer-link-meta">/system/reboot</span>
        </a>

        <div style="margin-top:auto; padding-top:14px; border-top:1px solid var(--ark-border);">
            <button class="ark-btn ark-btn-purple" style="width:100%; padding:10px;" onclick="openLuciSimulator('overview')">
                💻 Abrir LuCI em Modo Completo
            </button>
        </div>
    </div>

    <!-- ========================================================= -->
    <!-- SIMULADOR INTERATIVO DE PÁGINAS NATIVAS DO LUCI -->
    <!-- ========================================================= -->
    <div id="luci_native_view_container">
        <!-- Barra de Retorno Superior -->
        <div class="luci-sim-bar">
            <div style="display:flex; align-items:center; gap:12px;">
                <button class="ark-btn ark-btn-primary" onclick="closeLuciSimulator()">
                    ⬅ Voltar ao Painel ARK Router V2
                </button>
                <span style="font-size:0.85rem; color:#9ca3af;" id="luci_sim_current_route">Rota: /cgi-bin/luci/admin/status/overview</span>
            </div>
            <span class="pill-badge pill-cyan">MODO LUCI CLÁSSICO SIMULADO</span>
        </div>

        <!-- Cabeçalho Autêntico do LuCI -->
        <div class="luci-sim-classic-header">
            <div>
                <h1 style="font-size:1.3rem; font-weight:700; margin:0;">OpenWrt LuCI</h1>
                <span style="font-size:0.75rem; opacity:0.8;">Acer Predator W6x • OpenWrt 24.10.0 r27208</span>
            </div>
            <div style="font-size:0.82rem;">Usuário: <strong>root</strong></div>
        </div>

        <!-- Abas Clássicas do LuCI -->
        <div class="luci-sim-classic-nav">
            <a class="luci-nav-tab active" onclick="switchLuciTab('status')">Status</a>
            <a class="luci-nav-tab" onclick="switchLuciTab('system')">Sistema</a>
            <a class="luci-nav-tab" onclick="switchLuciTab('network')">Rede</a>
            <a class="luci-nav-tab" onclick="switchLuciTab('services')">Serviços</a>
            <a class="luci-nav-tab" style="background:#0284c7; color:#fff;" onclick="closeLuciSimulator()">⚡ ARK Router</a>
        </div>

        <!-- Conteúdo do LuCI Clássico -->
        <div class="luci-sim-content" id="luci_sim_content_body">
            <!-- Populated dynamically -->
        </div>
    </div>

    <!-- ========================================================= -->
    <!-- MODAL OVERLAY CENTRAL (100% OPERACIONAL COM SELECTS) -->
    <!-- ========================================================= -->
    <div id="modal_overlay">
        <div class="modal-box">
            <div id="modal_content_holder"></div>
        </div>
    </div>

    <!-- TOAST NOTIFICATION -->
    <div id="toast_notify"></div>

    <!-- JAVASCRIPT LOGIC & REAL-TIME INTERACTION -->
    <script>
        // Device Mock Database (34 Devices across 2.4G, 5G, 6G, Cable)
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

        // Render Devices Table
        function renderDevicesTable() {
            const tbody = document.getElementById('device_table_body');
            if (!tbody) return;

            let list = [...DEVICES];

            // Filter
            if (currentFilter !== 'all') {
                list = list.filter(d => d.band === currentFilter);
            }

            // Search
            if (currentSearch.trim()) {
                const q = currentSearch.toLowerCase();
                list = list.filter(d => d.name.toLowerCase().includes(q) || d.ip.includes(q) || d.mac.toLowerCase().includes(q));
            }

            // Sort
            if (currentSort === 'traffic') {
                list.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
            } else if (currentSort === 'speed') {
                list.sort((a, b) => parseFloat(b.speed) - parseFloat(a.speed));
            } else if (currentSort === 'name') {
                list.sort((a, b) => a.name.localeCompare(b.name));
            }

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
            if (timeEl) {
                timeEl.textContent = now.toLocaleTimeString('pt-BR', { hour12: false });
            }
            if (dateEl) {
                dateEl.textContent = now.toLocaleDateString('pt-BR');
            }
        }
        setInterval(updateClock, 1000);
        updateClock();

        // Smooth Scroll to Section
        function scrollToSection(id) {
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(a => a.getAttribute('onclick')?.includes(id));
                if (activeNav) activeNav.classList.add('active');
                if (window.innerWidth <= 854) toggleSidebar();
            }
        }

        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
        }

        // LuCI Slide-Over Drawer
        function toggleLuciDrawer() {
            const drawer = document.getElementById('luci_drawer');
            const backdrop = document.getElementById('luci_drawer_backdrop');
            drawer.classList.toggle('open');
            backdrop.classList.toggle('open');
        }

        // Handle LuCI Click (Real URL + Simulator in Staging)
        function handleLuciClick(ev, route) {
            ev.preventDefault();
            toggleLuciDrawer();
            openLuciSimulator(route);
        }

        // Open Native LuCI Simulator Mode
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
            } else if (route === 'interfaces' || route === 'network') {
                body.innerHTML = `
                    <div style="background:#1f2937; border:1px solid #374151; border-radius:6px; padding:20px; color:#fff; margin-bottom:20px;">
                        <h2 style="font-size:1.15rem; font-weight:700; margin-bottom:14px; border-bottom:1px solid #374151; padding-bottom:8px;">Interfaces de Rede (UCI /etc/config/network)</h2>
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            <div style="background:#111827; border:1px solid #374151; border-radius:6px; padding:14px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong style="color:#60a5fa; font-size:1rem;">lan (br-lan)</strong>
                                    <div style="font-size:0.8rem; color:#9ca3af;">Tipo: Bridge • IP: 192.168.1.1/24 • MAC: 00:e0:4c:68:01:00</div>
                                </div>
                                <span class="pill-badge pill-online">CONECTADO</span>
                            </div>
                            <div style="background:#111827; border:1px solid #374151; border-radius:6px; padding:14px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong style="color:#34d399; font-size:1rem;">wan (eth0 - Vivo Fibra GPON)</strong>
                                    <div style="font-size:0.8rem; color:#9ca3af;">Tipo: PPPoE • IP: 187.54.21.90 • MTU: 1492 • Gateway: 187.54.20.1</div>
                                </div>
                                <span class="pill-badge pill-online">CONECTADO</span>
                            </div>
                            <div style="background:#111827; border:1px solid #374151; border-radius:6px; padding:14px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong style="color:#22d3ee; font-size:1rem;">wan2 (eth1 - Claro Fibra)</strong>
                                    <div style="font-size:0.8rem; color:#9ca3af;">Tipo: DHCP • IP: 201.86.110.45 • MTU: 1500 • Gateway: 201.86.110.1</div>
                                </div>
                                <span class="pill-badge pill-cyan">CONECTADO (50%)</span>
                            </div>
                        </div>
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

        // =========================================================
        // MODALS ENGINE WITH 100% SELECT DROPDOWNS & REAL-TIME LOGIC
        // =========================================================
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
                                <option value="dhcp">DHCP Automático (Claro Fibra/Coaxial, Starlink, Modem em Bridge)</option>
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
                        <div class="form-group">
                            <label class="form-label">Servidor DNS Preferencial</label>
                            <select class="form-select">
                                <option selected>Cloudflare 1.1.1.1 + 1.0.0.1 (Máxima Velocidade)</option>
                                <option>Google DNS 8.8.8.8 + 8.8.4.4</option>
                                <option>AdGuard Anti-Anúncios 94.140.14.14</option>
                                <option>Automático do Provedor (ISP)</option>
                            </select>
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
                            <select class="form-select" id="m_wifi_crypto">
                                <option value="wpa3_mixed" selected>WPA3-SAE / WPA2-PSK Misto + PMF (Recomendado)</option>
                                <option value="wpa3_pure">WPA3-SAE Puro (Máxima Blindagem Wi-Fi 6E/7)</option>
                                <option value="wpa2_legacy">WPA2-PSK Legado (Para dispositivos antigos)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Distribuição de Frequências</label>
                            <select class="form-select">
                                <option selected>Rede Única Inteligente MLO (2.4G + 5G + 6G com Band Steering)</option>
                                <option>Separar em Redes Individuais (2.4G / 5G / 6G)</option>
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
                                <option value="100">100 Mbps Download / 50 Mbps Upload</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Algoritmo de Fila Inteligente (Qdisc)</label>
                            <select class="form-select">
                                <option selected>CAKE (Recomendado - Elimina Bufferbloat e Latência de Games)</option>
                                <option>FQ_CoDel (Padrão IETF)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Compensação de Framing (Overhead de Camada 2)</label>
                            <select class="form-select">
                                <option selected>Fibra Óptica FTTH / GPON (44 bytes de overhead)</option>
                                <option>Ethernet Pura (18 bytes de overhead)</option>
                                <option>Cabo Coaxial DOCSIS (18 bytes)</option>
                                <option>VDSL2 / PTM (26 bytes)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveSqmModal()">💾 Salvar Calibração SQM</button>
                    </div>
                `;
            } else if (type === 'wifi_qr') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📲 Conexão Wi-Fi via QR Code (EasyConnect)</h3>
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
                        <h4 style="color:#fff; margin-bottom:4px;">Wi-Fi-H&R</h4>
                        <p style="font-size:0.8rem; color:#94a3b8;">Aponte a câmera do seu celular para conectar automaticamente sem digitar senha.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    </div>
                `;
            } else if (type === 'wps') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🤝 Conectar Dispositivo por WPS (Push Button)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body" style="text-align:center;">
                        <p style="font-size:0.85rem; color:#cbd5e1; line-height:1.5;">
                            Pressione o botão virtual abaixo e, em seguida, pressione o botão WPS físico na sua impressora, TV ou repetidor dentro de 2 minutos.
                        </p>
                        <div style="padding:24px 0;">
                            <button class="ark-btn ark-btn-primary" style="padding:14px 28px; font-size:1.05rem;" onclick="closeModal(); showToast('🤝 Pareamento WPS PBC ativado por 120 segundos!')">
                                🔘 Iniciar Pareamento WPS (2 min)
                            </button>
                        </div>
                        <span style="font-size:0.75rem; color:#10b981;">● Modo Seguro: WPS por PIN desativado contra invasões.</span>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    </div>
                `;
            } else if (type === 'pppoe_logs') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📜 Histórico de Sessões & Logs PPPoE (WAN 1)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="background:#090e1a; border:1px solid var(--ark-border); border-radius:8px; padding:14px; font-family:monospace; font-size:0.75rem; color:#94a3b8; line-height:1.6; max-height:240px; overflow-y:auto;">
                            [Oct 14 02:40:12] pppd[1820]: Plugin rp-pppoe.so loaded.<br>
                            [Oct 14 02:40:12] pppd[1820]: PPP session is 48212 (0xbc54)<br>
                            [Oct 14 02:40:12] pppd[1820]: Connected to 00:30:88:00:1a:ff via interface eth0<br>
                            [Oct 14 02:40:12] pppd[1820]: Using interface pppoe-wan<br>
                            [Oct 14 02:40:12] pppd[1820]: Connect: pppoe-wan &lt;--&gt; eth0<br>
                            [Oct 14 02:40:13] pppd[1820]: PAP authentication succeeded<br>
                            [Oct 14 02:40:13] pppd[1820]: peer from calling number 00:30:88:00:1A:FF authorized<br>
                            [Oct 14 02:40:13] pppd[1820]: local  IP address 187.54.21.90<br>
                            [Oct 14 02:40:13] pppd[1820]: remote IP address 187.54.20.1<br>
                            [Oct 14 02:40:13] pppd[1820]: primary   DNS address 1.1.1.1<br>
                            [Oct 14 02:40:13] netifd: Network device 'pppoe-wan' link is up (MTU 1492)
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
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
            } else if (type === 'starlink_config') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🛰️ Configurações da Antena Starlink</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Sensor de Degelo de Neve (Snow Melt)</label>
                            <select class="form-select">
                                <option selected>Automático (Sensor Térmico Inteligente)</option>
                                <option>Sempre Ativado (Ambientes de Neve Contínua)</option>
                                <option>Desativado (Economia de Energia)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Modo Operacional da Antena</label>
                            <select class="form-select">
                                <option selected>Modo Bypass (Pass-Through para Roteador ARK)</option>
                                <option>Roteador Nativo Starlink Ativo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Horário de Suspensão Noturna (Sleep Mode)</label>
                            <select class="form-select">
                                <option selected>Programado (02:00 às 06:00)</option>
                                <option>Programado (00:00 às 07:00)</option>
                                <option>Desativado (Sempre Ligado)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="closeModal(); showToast('🛰️ Parâmetros Starlink salvos!')">💾 Salvar Starlink</button>
                    </div>
                `;
            } else if (type === 'add_vpn') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🔒 Adicionar Túnel WireGuard</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Localização / Servidor VPN</label>
                            <select class="form-select">
                                <option selected>São Paulo (Brasil) — 12ms</option>
                                <option>Miami (EUA) — 98ms</option>
                                <option>Frankfurt (Alemanha) — 180ms</option>
                                <option>Personalizado</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Chave Privada (Private Key)</label>
                            <input type="password" class="form-input" placeholder="Cole sua chave privada WireGuard...">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Endereço IP Virtual do Túnel</label>
                            <select class="form-select">
                                <option selected>10.14.0.2/24 (Padrão WireGuard)</option>
                                <option>10.8.0.2/24</option>
                                <option>192.168.99.2/24</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-purple" onclick="closeModal(); showToast('🔒 Novo túnel WireGuard ativado!')">💾 Conectar VPN</button>
                    </div>
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
                            <select class="form-select" onchange="changeTheme(this.value)">
                                <option value="cyan" selected>ARK Flagship Cyan & Deep Blue (Padrão)</option>
                                <option value="gamer">Predator Gamer Red & Carbon</option>
                                <option value="emerald">Cyber Emerald Green</option>
                                <option value="purple">Quantum Purple & Violet</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-primary" onclick="closeModal(); showToast('🎨 Tema visual aplicado!')">Fechar</button>
                    </div>
                `;
            } else if (type === 'op_mode') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🌐 Modo de Operação do Dispositivo</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Modo Operacional Ativo</label>
                            <select class="form-select">
                                <option selected>Roteador Gateway Principal (DHCP, NAT, Firewall e SQM Ativos)</option>
                                <option>Ponto de Acesso Bridge (Desativa NAT e DHCP, opera como Extensor)</option>
                                <option>Repetidor Mesh Sem Fio (802.11s EasyMesh)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="closeModal(); showToast('🌐 Modo de operação atualizado!')">Salvar Modo</button>
                    </div>
                `;
            } else if (type === 'gamer_mode') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🎮 Perfil Gamer Ultra de Baixa Latência</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Priorização de Pacotes UDP de Jogos</label>
                            <select class="form-select">
                                <option selected>Ultra Baixa Latência (Express Queue FQ-CoDel + DSCP CS4)</option>
                                <option>Equilibrado (Streaming + Jogos)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Console / PC Principal</label>
                            <select class="form-select">
                                <option selected>PlayStation-5-Pro (192.168.1.189)</option>
                                <option>Xbox-Series-X (192.168.1.188)</option>
                                <option>MacBook-Pro-M3-Max (192.168.1.142)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="closeModal(); showToast('🎮 Perfil Gamer Ultra ativado!')">Ativar Modo Gamer</button>
                    </div>
                `;
            } else {
                closeModal();
            }
        }

        // Open WAN Modal (100% Selects for Protocol, MTU, DNS)
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
                            <option value="1480">1480 (Túneis Corporativos e Roteamento Avançado)</option>
                            <option value="1420">1420 (VPN WireGuard MTU)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Servidores DNS de Resolução</label>
                        <select class="form-select" id="m_wan_dns">
                            <option value="1.1.1.1" selected>Cloudflare DNS (1.1.1.1 + 1.0.0.1 - Latência 2ms)</option>
                            <option value="8.8.8.8">Google DNS (8.8.8.8 + 8.8.4.4 - Alta Redundância)</option>
                            <option value="adguard">AdGuard DNS (94.140.14.14 - Bloqueio de Anúncios)</option>
                            <option value="quad9">Quad9 (9.9.9.9 - Proteção contra Phishing)</option>
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

        // Open Radio Modal (100% Selects for Channel, Width, TX Power)
        function openRadioModal(band) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');

            let channelSelectOptions = '';
            let widthSelectOptions = '';
            let defaultTx = '20';

            if (band === '2.4') {
                channelSelectOptions = `
                    <option value="auto" selected>Auto (Canal Inteligente: Canal 6)</option>
                    <option value="1">Canal 1 (2412 MHz)</option>
                    <option value="6">Canal 6 (2437 MHz)</option>
                    <option value="11">Canal 11 (2462 MHz)</option>
                `;
                widthSelectOptions = `
                    <option value="20" selected>20 MHz (Maior Alcance & Menor Interferência)</option>
                    <option value="40">20/40 MHz Misto (Maior Velocidade de Pico)</option>
                `;
                defaultTx = '20';
            } else if (band === '5') {
                channelSelectOptions = `
                    <option value="auto" selected>Auto (Canal Inteligente: Canal 36)</option>
                    <option value="36">Canal 36 (5180 MHz - Baixo)</option>
                    <option value="40">Canal 40 (5200 MHz)</option>
                    <option value="44">Canal 44 (5220 MHz)</option>
                    <option value="48">Canal 48 (5240 MHz)</option>
                    <option value="149">Canal 149 (5745 MHz - Alto)</option>
                    <option value="153">Canal 153 (5765 MHz)</option>
                    <option value="157">Canal 157 (5785 MHz)</option>
                    <option value="161">Canal 161 (5805 MHz)</option>
                `;
                widthSelectOptions = `
                    <option value="160" selected>160 MHz Ultra (Velocidade Máxima Wi-Fi 6)</option>
                    <option value="80">80 MHz (Alta Compatibilidade Residencial)</option>
                    <option value="40">40 MHz</option>
                    <option value="20">20 MHz</option>
                `;
                defaultTx = '23';
            } else {
                channelSelectOptions = `
                    <option value="auto" selected>Auto (Canal Inteligente: Canal 37 PSC)</option>
                    <option value="37">Canal 37 PSC (6135 MHz)</option>
                    <option value="53">Canal 53 PSC (6215 MHz)</option>
                    <option value="69">Canal 69 PSC (6295 MHz)</option>
                    <option value="85">Canal 85 PSC (6375 MHz)</option>
                    <option value="101">Canal 101 (6455 MHz)</option>
                    <option value="117">Canal 117 (6535 MHz)</option>
                `;
                widthSelectOptions = `
                    <option value="320" selected>320 MHz Extremo (Banda Completa Wi-Fi 7 BE)</option>
                    <option value="160">160 MHz</option>
                    <option value="80">80 MHz</option>
                `;
                defaultTx = '23';
            }

            cont.innerHTML = `
                <div class="modal-header">
                    <h3>📶 Configurar Rádio — ${band} GHz</h3>
                    <button class="modal-close-btn" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Canal de Operação</label>
                        <select class="form-select" id="m_radio_ch">
                            ${channelSelectOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Largura de Banda</label>
                        <select class="form-select" id="m_radio_width">
                            ${widthSelectOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Potência de Transmissão (Potência de Rádio)</label>
                        <select class="form-select" id="m_radio_tx">
                            <option value="20" ${defaultTx === '20' ? 'selected' : ''}>20 dBm (100 mW - Padrão Equilibrado)</option>
                            <option value="23" ${defaultTx === '23' ? 'selected' : ''}>23 dBm (200 mW - Alta Cobertura Residencial)</option>
                            <option value="26">26 dBm (400 mW - Máxima Potência Anatel)</option>
                            <option value="17">17 dBm (50 mW - Baixa Interferência / Apartamentos)</option>
                            <option value="14">14 dBm (25 mW - Econômico / Quarto)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">BSS Coloring & TWT</label>
                        <select class="form-select">
                            <option selected>Ativado (Anti-Interferência de Vizinhança + TWT Economia de Bateria)</option>
                            <option>Desativado</option>
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
                document.getElementById('tx_radio_24').textContent = `${tx} dBm (${tx === '20' ? '100 mW' : '200 mW'})`;
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
            showToast(`📶 Rádio ${band} GHz reconfigurado com sucesso!`);
        }

        // Open Device Modal (100% Selects for Category & Priority)
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
                        <label class="form-label">Nome Amigável do Aparelho</label>
                        <input type="text" class="form-input" id="m_dev_name" value="${dev.name}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo / Ícone do Aparelho</label>
                        <select class="form-select" id="m_dev_type">
                            <option value="phone" ${dev.type === 'phone' ? 'selected' : ''}>📱 Smartphone / Celular</option>
                            <option value="laptop" ${dev.type === 'laptop' ? 'selected' : ''}>💻 Computador / Notebook</option>
                            <option value="tv" ${dev.type === 'tv' ? 'selected' : ''}>📺 Smart TV / Streaming</option>
                            <option value="console" ${dev.type === 'console' ? 'selected' : ''}>🎮 Console de Games (PS5 / Xbox)</option>
                            <option value="server" ${dev.type === 'server' ? 'selected' : ''}>🖥️ Servidor Local / NAS</option>
                            <option value="printer" ${dev.type === 'printer' ? 'selected' : ''}>🖨️ Impressora de Rede</option>
                            <option value="iot" ${dev.type === 'iot' ? 'selected' : ''}>🏠 Automação IoT / Lâmpada / Câmera</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Prioridade de Conexão (Qualidade de Serviço CAKE)</label>
                        <select class="form-select" id="m_dev_prio">
                            <option value="normal" ${dev.prio === 'normal' ? 'selected' : ''}>Normal (Equilíbrio Inteligente CAKE)</option>
                            <option value="gamer" ${dev.prio === 'gamer' ? 'selected' : ''}>⚡ Alta Prioridade Gamer (Baixa Latência Express)</option>
                            <option value="high" ${dev.prio === 'high' ? 'selected' : ''}>Prioridade Elevada (Trabalho / Streaming)</option>
                            <option value="low" ${dev.prio === 'low' ? 'selected' : ''}>Segundo Plano / Fundo (Downloads lentos)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Política de Endereçamento IP</label>
                        <select class="form-select">
                            <option selected>Reserva Estática Permanente (IP Fixo: ${dev.ip})</option>
                            <option>Dinâmico pelo Servidor DHCP</option>
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

        function closeModal() {
            document.body.classList.remove('modal-overlay-active');
        }

        function saveSetupModal() {
            const ssid = document.getElementById('setup_ssid').value;
            document.getElementById('label_main_ssid').textContent = ssid;
            closeModal();
            showToast(`⚡ Assistente concluído! Rede ${ssid} configurada.`);
        }

        function saveWifiModal() {
            const ssid = document.getElementById('m_wifi_ssid').value;
            document.getElementById('label_main_ssid').textContent = ssid;
            closeModal();
            showToast(`📶 Rede ${ssid} e rádios atualizados!`);
        }

        function saveSqmModal() {
            closeModal();
            showToast('⚡ Parâmetros SQM CAKE gravados no nftables e kernel!');
        }

        function applySqmPreset(val) {
            if (val === '1000') {
                document.getElementById('sqm_label_down').textContent = '1000 Mbps';
                document.getElementById('sqm_label_up').textContent = '500 Mbps';
            } else if (val === '850') {
                document.getElementById('sqm_label_down').textContent = '850 Mbps';
                document.getElementById('sqm_label_up').textContent = '450 Mbps';
            } else {
                document.getElementById('sqm_label_down').textContent = val + ' Mbps';
                document.getElementById('sqm_label_up').textContent = Math.round(parseInt(val)/2) + ' Mbps';
            }
        }

        function toggleWifiPass() {
            const p = document.getElementById('pwd_main_wifi');
            if (p.textContent === '••••••••••••') {
                p.textContent = 'MinhaSenhaForte2026';
            } else {
                p.textContent = '••••••••••••';
            }
        }

        function toggleMwan(el) {
            showToast(el.checked ? '⚖️ Balanceamento de Carga Multi-WAN ativado!' : '⚠️ Modo Failover puro ativado (WAN 2 em standby)');
        }

        function toggleNightLeds(el) {
            showToast(el.checked ? '🌙 Modo Noturno Ativado: Todos os LEDs físicos desligados.' : '☀️ Modo Normal: LEDs de atividade ativos.');
        }

        function testWanPing(wan) {
            showToast(`📶 Testando ping para 1.1.1.1 via ${wan.toUpperCase()}... Latência: 4.2 ms (0% perda)`);
        }

        function executeReboot() {
            closeModal();
            showToast('🔄 Reiniciando roteador com segurança... Reconexão em 45s.');
        }

        // Stepper Simulation for Smart Wi-Fi Enhancer
        let enhancerRunning = false;
        function startEnhancerProcess() {
            if (enhancerRunning) return;
            enhancerRunning = true;
            const btn = document.getElementById('btn_run_enhancer');
            const title = document.getElementById('enhancer_status_title');
            const counter = document.getElementById('enhancer_step_counter');
            const bar = document.getElementById('enhancer_progress_bar');
            const log = document.getElementById('enhancer_log_box');

            btn.disabled = true;
            btn.textContent = '⏳ Executando Otimização...';

            const steps = [
                { title: "Verificando pacotes Wi-Fi atuais...", log: "[1/7] Checando lock opkg e pacotes wpad..." },
                { title: "Criando backup das configurações UCI...", log: "[2/7] Backup gerado em /etc/config/wireless.bak..." },
                { title: "Removendo pacote legado wpad-basic...", log: "[3/7] Removendo wpad-basic sem desligar rádios..." },
                { title: "Instalando stack completo wpad-mbedtls...", log: "[4/7] Instalando wpad-mbedtls (WPA3-SAE, 802.11r/k/v, Suite-B)..." },
                { title: "Calibrando chaves criptográficas WPA3...", log: "[5/7] Configurando sae_pwe=2 e bss_transition=1..." },
                { title: "Sincronizando usteer e band steering...", log: "[6/7] Ajustando usteer para transição suave de clientes..." },
                { title: "Otimização concluída com sucesso!", log: "[7/7] Verificação de integridade 100% OK! Rádios otimizados." }
            ];

            let curr = 0;
            const timer = setInterval(() => {
                if (curr < steps.length) {
                    title.textContent = "Status: " + steps[curr].title;
                    counter.textContent = `Etapa ${curr + 1} de 7`;
                    bar.style.width = `${((curr + 1) / 7) * 100}%`;
                    log.innerHTML += `<br>${steps[curr].log}`;
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

        // Ark Doctor Check Simulation
        function runDoctorCheck() {
            showToast('🩺 Executando diagnóstico vital em 12 subsistemas...');
            const grid = document.getElementById('doctor_checks_grid');
            grid.innerHTML = '<div style="color:#38bdf8; padding:12px;">Diagnosticando...</div>';

            setTimeout(() => {
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
                showToast('🩺 Diagnóstico concluído: 12/12 subsistemas 100% saudáveis!');
            }, 600);
        }

        // Speedtest Simulation
        function runSpeedtestProcess() {
            const btn = document.getElementById('btn_run_speedtest');
            btn.disabled = true;
            btn.textContent = '⏳ Medindo Latência e Banda...';

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
                showToast('🚀 Teste de velocidade finalizado: 924.8 Mbps Down / 482.1 Mbps Up!');
            }, 2400);
        }

        // Live Traffic Canvas 2D Animator
        function initTrafficCanvas() {
            const cvs = document.getElementById('live_traffic_canvas');
            if (!cvs) return;
            const ctx = cvs.getContext('2d');
            const w = cvs.width = cvs.parentElement.clientWidth - 32;
            const h = cvs.height = 140;

            let downPoints = new Array(30).fill(50);
            let upPoints = new Array(30).fill(20);

            function draw() {
                ctx.clearRect(0, 0, w, h);

                // Grid lines
                ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
                ctx.lineWidth = 1;
                for (let y = 20; y < h; y += 30) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(w, y);
                    ctx.stroke();
                }

                // Push new random realistic points
                downPoints.shift();
                downPoints.push(Math.min(120, Math.max(30, downPoints[downPoints.length - 1] + (Math.random() * 24 - 12))));

                upPoints.shift();
                upPoints.push(Math.min(80, Math.max(10, upPoints[upPoints.length - 1] + (Math.random() * 14 - 7))));

                // Update text stats
                const curDown = (downPoints[downPoints.length - 1] * 0.95).toFixed(1);
                const curUp = (upPoints[upPoints.length - 1] * 0.85).toFixed(1);
                const sDown = document.getElementById('stat_down');
                const sUp = document.getElementById('stat_up');
                if (sDown) sDown.innerHTML = `${curDown} <span style="font-size:1rem;">Mbps</span>`;
                if (sUp) sUp.innerHTML = `${curUp} <span style="font-size:1rem;">Mbps</span>`;

                // Draw Down Line (Cyan/Blue)
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

                // Draw Up Line (Purple)
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

            setInterval(draw, 1000);
            draw();
        }

        // Toast Helper
        function showToast(msg) {
            const t = document.getElementById('toast_notify');
            if (!t) return;
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3500);
        }

        // Global ESC handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
                closeLuciSimulator();
                const drawer = document.getElementById('luci_drawer');
                if (drawer && drawer.classList.contains('open')) toggleLuciDrawer();
            }
        });

        // Initialize on load
        window.addEventListener('DOMContentLoaded', () => {
            renderDevicesTable();
            initTrafficCanvas();
            runDoctorCheck();
        });
    </script>
</body>
</html>''')

print("Comprehensive V2 Flagship Dashboard generated successfully!")
