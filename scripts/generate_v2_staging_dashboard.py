#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Senior UI/UX Redesign & Complete V2 Staging Dashboard Generator.
Builds the comprehensive, interactive, production-grade V2 dashboard for local emulation.
Includes:
- Native LuCI Slide-Over Drawer with links to ALL native LuCI pages (unobtrusive & clean).
- All ARK Router Modules: Multi-WAN, Wi-Fi 6E/7, Enhancer, Devices, SQM CAKE, AdBlock,
  Doctor, System & LEDs, Starlink Dishy, WireGuard & PBR, Speedtest Multi-WAN.
- 100% of edit buttons, toggles, switches, and modals fully wired and functional.
"""

import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
WORKSPACE_ROOT = os.path.abspath(os.path.join(REPO_DIR, "..", ".."))
TARGET_FILE = os.path.join(WORKSPACE_ROOT, "docs", "qa_screenshots", "v2_staging", "index.html")

print(f"Generating Comprehensive V2 Flagship Dashboard at: {TARGET_FILE}")
os.makedirs(os.path.dirname(TARGET_FILE), exist_ok=True)

html_content = r'''<!DOCTYPE html>
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

        /* Sidebar Styling */
        .sidebar {
            width: 260px;
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
            padding: 18px 14px;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 4px 8px 18px;
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
            padding: 10px 10px 4px;
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 12px;
            border-radius: var(--ark-radius-sm);
            color: var(--ark-text-muted);
            font-size: 0.86rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            user-select: none;
            margin-bottom: 2px;
            text-decoration: none;
        }

        .nav-item:hover {
            color: var(--ark-text-main);
            background: rgba(255, 255, 255, 0.05);
        }

        .nav-item.active {
            background: rgba(2, 132, 199, 0.18);
            color: #38bdf8;
            font-weight: 750;
            border-left: 3px solid #38bdf8;
        }

        .nav-item .nav-badge {
            margin-left: auto;
            font-size: 0.65rem;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
        }

        .nav-item .nav-badge.pulse {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
        }

        .nav-item .nav-badge.purple {
            background: rgba(139, 92, 246, 0.2);
            color: #c084fc;
        }

        /* Content Area */
        .content-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
            background: var(--ark-bg);
        }

        /* Top Header Bar */
        .header-bar {
            height: 64px;
            border-bottom: 1px solid var(--ark-border);
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            position: sticky;
            top: 0;
            z-index: 40;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 28px;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .mobile-menu-btn {
            display: none;
            background: transparent;
            border: 1px solid var(--ark-border);
            color: var(--ark-text-main);
            border-radius: 8px;
            width: 38px;
            height: 38px;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
        }

        .page-heading {
            font-size: 1.15rem;
            font-weight: 850;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .stat-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 5px 12px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--ark-border);
            color: #cbd5e1;
            user-select: none;
        }

        .ping-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--ark-emerald);
            box-shadow: 0 0 8px var(--ark-emerald);
            animation: pulseDot 2s infinite ease-in-out;
        }

        @keyframes pulseDot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
        }

        /* LuCI Drawer Button */
        .btn-luci-drawer {
            background: rgba(56, 189, 248, 0.12);
            color: #38bdf8;
            border: 1px solid rgba(56, 189, 248, 0.3);
            border-radius: 9px;
            padding: 6px 14px;
            font-size: 0.80rem;
            font-weight: 750;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.18s ease;
        }
        .btn-luci-drawer:hover {
            background: rgba(56, 189, 248, 0.22);
            box-shadow: 0 0 14px rgba(56, 189, 248, 0.3);
        }

        /* Slide-Over Drawer for Native LuCI Pages */
        #luci_drawer_backdrop {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100dvh;
            background: rgba(0, 0, 0, 0.6);
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
            right: -420px;
            width: 380px;
            max-width: 90vw;
            height: 100dvh;
            background: #0f192d;
            border-left: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: -10px 0 40px rgba(0, 0, 0, 0.7);
            z-index: 1600;
            overflow-y: auto;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 18px;
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

        .drawer-header h3 {
            font-size: 1.1rem;
            font-weight: 850;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .drawer-cat {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #38bdf8;
            font-weight: 800;
            margin-top: 6px;
            margin-bottom: 6px;
        }

        .drawer-link {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            border-radius: 8px;
            color: var(--ark-text-muted);
            font-size: 0.84rem;
            text-decoration: none;
            transition: all 0.15s ease;
            background: rgba(255, 255, 255, 0.02);
            margin-bottom: 4px;
        }

        .drawer-link:hover {
            background: rgba(255, 255, 255, 0.08);
            color: #fff;
            transform: translateX(4px);
        }

        .drawer-link span.uri {
            font-size: 0.70rem;
            font-family: monospace;
            color: #64748b;
        }

        /* View Panels */
        .view-panel {
            display: none;
            padding: 28px;
            animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            max-width: 1440px;
            margin: 0 auto;
            width: 100%;
        }

        .view-panel.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Hero Banner */
        .hero-banner {
            background: linear-gradient(135deg, #0d1a30 0%, #102746 50%, #1a3860 100%);
            border: 1px solid rgba(56, 189, 248, 0.25);
            border-radius: var(--ark-radius-lg);
            padding: 24px 28px;
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
            position: relative;
            overflow: hidden;
        }

        .hero-eyebrow {
            font-size: 0.72rem;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            font-weight: 800;
            color: #38bdf8;
            margin-bottom: 4px;
            display: block;
        }

        .hero-title {
            font-size: 1.85rem;
            font-weight: 900;
            color: #fff;
            letter-spacing: -0.02em;
            margin-bottom: 4px;
        }

        .hero-desc {
            font-size: 0.88rem;
            color: #94a3b8;
            max-width: 680px;
            line-height: 1.45;
        }

        .hero-actions {
            display: flex;
            gap: 10px;
            margin-top: 16px;
            flex-wrap: wrap;
        }

        /* Buttons */
        .ark-btn {
            min-height: 42px;
            padding: 8px 18px;
            border-radius: 9px;
            font-size: 0.84rem;
            font-weight: 750;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.18s ease;
            user-select: none;
            -webkit-user-select: none;
            touch-action: manipulation;
            border: none;
            text-decoration: none;
        }

        .ark-btn-primary {
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #fff;
            box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
        }
        .ark-btn-primary:hover {
            box-shadow: 0 6px 20px rgba(2, 132, 199, 0.5);
            transform: translateY(-1px);
        }

        .ark-btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: #f8fafc;
            border: 1px solid var(--ark-border);
        }
        .ark-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.12);
        }

        .ark-btn-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
            color: #fff;
            box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
        }
        .ark-btn-purple:hover {
            box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5);
            transform: translateY(-1px);
        }

        .ark-btn-danger {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .ark-btn-danger:hover {
            background: #ef4444;
            color: #fff;
        }

        /* Switch Toggles */
        .ark-switch {
            position: relative;
            display: inline-block;
            width: 46px;
            height: 26px;
            flex-shrink: 0;
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
            transition: .2s;
            border-radius: 26px;
            border: 1px solid var(--ark-border);
        }

        .ark-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .2s;
            border-radius: 50%;
        }

        input:checked + .ark-slider {
            background-color: #0284c7;
        }

        input:checked + .ark-slider:before {
            transform: translateX(20px);
        }

        .toggle-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: var(--ark-radius-sm);
            border: 1px solid var(--ark-border);
            margin-bottom: 10px;
            gap: 14px;
        }

        .toggle-title {
            font-weight: 750;
            font-size: 0.88rem;
            color: #fff;
            display: block;
        }

        .toggle-desc {
            font-size: 0.75rem;
            color: var(--ark-text-muted);
            margin-top: 2px;
            line-height: 1.4;
        }

        /* Grid System */
        .grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 18px;
            margin-bottom: 22px;
        }

        .grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 18px;
            margin-bottom: 22px;
        }

        .grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 22px;
        }

        /* Cards */
        .ark-card {
            background: var(--ark-surface-1);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 20px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
            position: relative;
        }

        .ark-card:hover {
            border-color: var(--ark-border-hover);
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
        }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            gap: 12px;
        }

        .card-title {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .card-title h3 {
            font-size: 1.05rem;
            font-weight: 800;
            color: #fff;
        }

        .card-kicker {
            font-size: 0.68rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #64748b;
            font-weight: 800;
            display: block;
        }

        .info-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            font-size: 0.85rem;
            min-width: 0;
        }

        .info-row:last-child {
            border-bottom: none;
        }

        .info-label {
            color: var(--ark-text-muted);
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .info-val {
            font-weight: 750;
            color: var(--ark-text-main);
            text-align: right;
        }

        .info-val.highlight {
            color: #38bdf8;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .info-val.success {
            color: var(--ark-emerald);
        }

        .stat-card {
            background: linear-gradient(145deg, #0f192d 0%, #13223d 100%);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .stat-card-label {
            font-size: 0.75rem;
            font-weight: 750;
            color: var(--ark-text-muted);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .stat-card-value {
            font-size: 1.7rem;
            font-weight: 900;
            color: #fff;
            letter-spacing: -0.02em;
            display: flex;
            align-items: baseline;
            gap: 6px;
        }

        .stat-card-value small {
            font-size: 0.82rem;
            color: var(--ark-text-muted);
            font-weight: 600;
        }

        .stat-card-meta {
            font-size: 0.72rem;
            color: #64748b;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        /* Canvas Chart Wrapper */
        .chart-wrapper {
            position: relative;
            width: 100%;
            height: 180px;
            background: rgba(0, 0, 0, 0.35);
            border-radius: var(--ark-radius-md);
            padding: 12px;
            border: 1px solid var(--ark-border);
            margin-top: 10px;
        }

        .chart-canvas {
            width: 100% !important;
            height: 100% !important;
            display: block;
        }

        /* Tables */
        .table-responsive {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            border-radius: var(--ark-radius-sm);
            border: 1px solid var(--ark-border);
            margin-top: 12px;
        }

        .ark-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.84rem;
            min-width: 680px;
        }

        .ark-table th {
            background: rgba(255, 255, 255, 0.04);
            color: var(--ark-text-muted);
            text-transform: uppercase;
            font-size: 0.70rem;
            letter-spacing: 0.08em;
            padding: 12px 14px;
            text-align: left;
            font-weight: 800;
            border-bottom: 1px solid var(--ark-border);
        }

        .ark-table td {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            color: var(--ark-text-main);
        }

        .ark-table tr:hover td {
            background: rgba(255, 255, 255, 0.02);
        }

        .swipe-hint {
            font-size: 0.72rem;
            color: #64748b;
            margin-bottom: 6px;
            display: none;
        }

        /* Steppers */
        .stepper-list {
            list-style: none;
            padding-left: 0;
            margin: 14px 0;
        }

        .step-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 10px;
            border-radius: 8px;
            font-size: 0.84rem;
            color: var(--ark-text-muted);
            margin-bottom: 4px;
            transition: all 0.2s ease;
        }

        .step-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 11px;
            font-family: monospace;
            background: rgba(255, 255, 255, 0.08);
            color: #94a3b8;
            flex-shrink: 0;
        }

        .step-item.active {
            background: rgba(2, 132, 199, 0.12);
            color: #38bdf8;
            font-weight: 750;
        }
        .step-item.active .step-icon {
            background: var(--ark-primary);
            color: #fff;
            box-shadow: 0 0 10px var(--ark-primary);
        }

        .step-item.done {
            color: var(--ark-emerald);
        }
        .step-item.done .step-icon {
            background: rgba(16, 185, 129, 0.2);
            color: var(--ark-emerald);
        }

        /* Modals */
        #modal_overlay {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100dvh;
            background: rgba(0, 0, 0, 0.78);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            box-sizing: border-box;
            transition: opacity 0.2s ease, visibility 0.2s ease;
        }

        #modal_overlay.inactive {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .modal-card {
            background: #0f192d;
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: var(--ark-radius-lg);
            width: 100%;
            max-width: 620px;
            max-height: calc(100dvh - 48px);
            overflow-y: auto;
            padding: 24px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
            animation: modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalPop {
            from { opacity: 0; transform: scale(0.96) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--ark-border);
        }

        .modal-header h3 {
            font-size: 1.15rem;
            font-weight: 850;
            color: #fff;
        }

        .modal-close-btn {
            background: rgba(255, 255, 255, 0.08);
            border: none;
            color: #94a3b8;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-close-btn:hover {
            background: rgba(255, 255, 255, 0.16);
            color: #fff;
        }

        .form-group {
            margin-bottom: 14px;
        }

        .form-label {
            display: block;
            font-size: 0.78rem;
            font-weight: 750;
            color: var(--ark-text-muted);
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .form-input, .form-select {
            width: 100%;
            height: 42px;
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-sm);
            padding: 8px 12px;
            color: #fff;
            font-size: 0.88rem;
            outline: none;
            transition: border-color 0.15s ease;
        }

        .form-input:focus, .form-select:focus {
            border-color: #38bdf8;
            box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
        }

        .form-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid var(--ark-border);
        }

        /* Toast */
        #toast_notify {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1e293b;
            color: #fff;
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-radius: 10px;
            padding: 12px 20px;
            font-size: 0.88rem;
            font-weight: 700;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            z-index: 3000;
            display: flex;
            align-items: center;
            gap: 10px;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: none;
        }

        #toast_notify.show {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }

        /* Responsive Breakpoints */
        @media (max-width: 960px) {
            .sidebar {
                position: fixed;
                left: -280px;
                top: 0;
                bottom: 0;
                box-shadow: 10px 0 30px rgba(0, 0, 0, 0.7);
            }
            .sidebar.open {
                left: 0;
            }
            .mobile-menu-btn {
                display: inline-flex;
            }
            .grid-4, .grid-3 {
                grid-template-columns: repeat(2, 1fr);
            }
            .grid-2 {
                grid-template-columns: 1fr;
            }
            .view-panel {
                padding: 16px;
            }
            .header-bar {
                padding: 0 16px;
            }
            .swipe-hint {
                display: block;
            }
        }

        @media (max-width: 600px) {
            .grid-4, .grid-3 {
                grid-template-columns: 1fr;
            }
            .hero-banner {
                padding: 18px;
            }
            .hero-title {
                font-size: 1.45rem;
            }
            .stat-pill:not(.online) {
                display: none;
            }
        }
    </style>
</head>
<body>

    <!-- APP SHELL -->
    <div class="app-shell">

        <!-- SIDEBAR -->
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-brand">
                <div class="sidebar-logo">A</div>
                <div class="sidebar-title">
                    <h1>ARK Router</h1>
                    <span class="version-badge">v1.5.17 PRO</span>
                </div>
            </div>

            <div class="nav-section-title">Principal</div>
            <a class="nav-item active" onclick="switchView('overview')">
                <span>📊</span> Visão Geral
                <span class="nav-badge pulse">AO VIVO</span>
            </a>
            <a class="nav-item" onclick="switchView('wan')">
                <span>🌐</span> Multi-WAN & Failover
                <span class="nav-badge">DUAL</span>
            </a>
            <a class="nav-item" onclick="switchView('wifi')">
                <span>📶</span> Redes Wi-Fi & Rádios
                <span class="nav-badge">6E/7</span>
            </a>
            <a class="nav-item" onclick="switchView('enhancer')" style="color:#c084fc;">
                <span>🚀</span> Smart Wi-Fi Enhancer
                <span class="nav-badge purple">7 ETAPAS</span>
            </a>
            <a class="nav-item" onclick="switchView('devices')">
                <span>📱</span> Dispositivos
                <span class="nav-badge">34</span>
            </a>

            <div class="nav-section-title">Conectividade & Satélite</div>
            <a class="nav-item" onclick="switchView('starlink')">
                <span>🛰️</span> Starlink & Satélite
                <span class="nav-badge">28ms</span>
            </a>
            <a class="nav-item" onclick="switchView('vpn')">
                <span>🔒</span> VPN & Roteamento (PBR)
                <span class="nav-badge">WG</span>
            </a>
            <a class="nav-item" onclick="switchView('speedtest')">
                <span>⚡</span> Speedtest Multi-WAN
            </a>

            <div class="nav-section-title">Otimização & Segurança</div>
            <a class="nav-item" onclick="switchView('sqm')">
                <span>🛡️</span> Firewall & SQM CAKE
                <span class="nav-badge">0ms LAG</span>
            </a>
            <a class="nav-item" onclick="switchView('adblock')">
                <span>🛑</span> Escudo AdBlock & DNS
                <span class="nav-badge">42K</span>
            </a>
            <a class="nav-item" onclick="switchView('doctor')">
                <span>🩺</span> Ark Doctor
                <span class="nav-badge pulse">28 CHECKS</span>
            </a>

            <div class="nav-section-title">Manutenção & Avançado</div>
            <a class="nav-item" onclick="switchView('system')">
                <span>⚙️</span> Sistema, LEDs & Modos
                <span class="nav-badge">46°C</span>
            </a>
            <a class="nav-item" onclick="toggleLuciDrawer()" style="color:#38bdf8; background:rgba(56,189,248,0.08);">
                <span>🛠️</span> Páginas Nativas LuCI
            </a>
            <a class="nav-item" onclick="openModal('reboot')" style="color:#f87171;">
                <span>🔄</span> Reiniciar Roteador
            </a>
        </aside>

        <!-- CONTENT AREA -->
        <div class="content-area">

            <!-- HEADER BAR -->
            <header class="header-bar">
                <div class="header-left">
                    <button class="mobile-menu-btn" onclick="toggleSidebar()">☰</button>
                    <div class="page-heading" id="current_page_title">
                        <span>📊</span> Visão Geral do Roteador
                    </div>
                </div>
                <div class="header-right">
                    <div class="stat-pill online">
                        <span class="ping-dot"></span> GATEWAY: <span id="header_ping">12</span>ms
                    </div>
                    <div class="stat-pill">
                        🛡️ CAKE: 0ms
                    </div>
                    <div class="stat-pill">
                        📱 34 Clientes
                    </div>
                    <div class="stat-pill" style="font-family: monospace;" id="header_clock">
                        --:--:--
                    </div>
                    <!-- Discrete LuCI Drawer Trigger -->
                    <button class="btn-luci-drawer" onclick="toggleLuciDrawer()">
                        🛠️ LuCI Nativo ▾
                    </button>
                </div>
            </header>

            <!-- ========================================================= -->
            <!-- 1. VIEW: VISÃO GERAL (OVERVIEW)                            -->
            <!-- ========================================================= -->
            <main class="view-panel active" id="view-overview">
                <!-- HERO BANNER -->
                <section class="hero-banner">
                    <div>
                        <span class="hero-eyebrow">CENTRAL DE OPERAÇÕES • V2 PROFISSIONAL</span>
                        <h2 class="hero-title">ARK Router OS</h2>
                        <p class="hero-desc">
                            MediaTek Filogic 830 (MT7986) Quad-Core 2.0 GHz • OpenWrt 25.12.5 • Dual-WAN Ativo com Failover Instantâneo e SQM CAKE.
                        </p>
                        <div class="hero-actions">
                            <button class="ark-btn ark-btn-primary" onclick="openModal('setup')">⚡ Ark Setup (Assistente)</button>
                            <button class="ark-btn ark-btn-purple" onclick="switchView('enhancer')">🚀 Smart Wi-Fi Enhancer (7 Etapas)</button>
                            <button class="ark-btn ark-btn-secondary" onclick="switchView('doctor')">🩺 Executar Doctor</button>
                            <button class="ark-btn ark-btn-secondary" onclick="openModal('wifi_qr')">📲 Conectar via QR Code</button>
                            <button class="ark-btn ark-btn-danger" onclick="openModal('reboot')">🔄 Reiniciar</button>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size:0.75rem; color:#94a3b8; font-weight:700;">CONSUMO AGREGADO:</span>
                        <div style="font-size:2.2rem; font-weight:900; color:#38bdf8;" id="overview_total_speed">482.4 Mbps</div>
                        <span style="font-size:0.78rem; color:#10b981; font-weight:700;">⬆ 184.2 Mbps Upload</span>
                    </div>
                </section>

                <!-- 4 STAT CARDS -->
                <div class="grid-4">
                    <div class="stat-card">
                        <div class="stat-card-label">
                            <span>VELOCIDADE ATUAL</span>
                            <span style="color:#38bdf8;">⚡ LIVE</span>
                        </div>
                        <div class="stat-card-value">
                            <span id="stat_down">482</span> <small>Mbps Down</small>
                        </div>
                        <div class="stat-card-meta" style="color:#10b981;">
                            ▲ 184 Mbps Up • CAKE 0ms Bufferbloat
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-card-label">
                            <span>INTERNET MULTI-WAN</span>
                            <span class="stat-pill online" style="padding:2px 8px; font-size:0.65rem;">ONLINE</span>
                        </div>
                        <div class="stat-card-value">
                            2 <small>Links Ativos</small>
                        </div>
                        <div class="stat-card-meta">
                            WAN 1: Fibra 1Gbps • WAN 2: Backup 300M
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-card-label">
                            <span>DISPOSITIVOS CONECTADOS</span>
                            <span style="color:#c084fc;">📶 WI-FI 6E</span>
                        </div>
                        <div class="stat-card-value">
                            34 <small>Aparelhos</small>
                        </div>
                        <div class="stat-card-meta">
                            18 em 5 GHz • 12 em 2.4 GHz • 4 em 6 GHz
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-card-label">
                            <span>SAÚDE DO SISTEMA</span>
                            <span style="color:#10b981;">100% OK</span>
                        </div>
                        <div class="stat-card-value">
                            46°C <small>Normal</small>
                        </div>
                        <div class="stat-card-meta">
                            RAM: 134/512 MB • CPU: 8% • Doctor 28/28
                        </div>
                    </div>
                </div>

                <!-- LIVE TRAFFIC GRAPH (CANVAS 2D) -->
                <div class="ark-card" style="margin-bottom: 22px;">
                    <div class="card-header">
                        <div class="card-title">
                            <span class="card-kicker">TELEMETRIA EM TEMPO REAL</span>
                            <h3>Tráfego Agregado de Rede (Download & Upload)</h3>
                        </div>
                        <div style="display:flex; gap:12px; align-items:center;">
                            <span style="font-size:0.75rem; color:#38bdf8; font-weight:750;">● Download: <span id="chart_down_label">482 Mbps</span></span>
                            <span style="font-size:0.75rem; color:#10b981; font-weight:750;">● Upload: <span id="chart_up_label">184 Mbps</span></span>
                            <button class="ark-btn ark-btn-secondary" style="min-height:30px; padding:3px 10px; font-size:0.75rem;" onclick="toggleChartPause()">⏸ Pausar</button>
                        </div>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="traffic_canvas" class="chart-canvas"></canvas>
                    </div>
                </div>

                <!-- 2-COL SECTION: WANs & SMART ENHANCER -->
                <div class="grid-2">
                    <div class="ark-card">
                        <div class="card-header">
                            <div class="card-title">
                                <span class="card-kicker">BALANCEAMENTO MWAN3</span>
                                <h3>Interfaces WAN</h3>
                            </div>
                            <button class="ark-btn ark-btn-secondary" style="min-height:32px; padding:4px 12px; font-size:0.75rem;" onclick="switchView('wan')">Gerenciar WANs</button>
                        </div>
                        <div class="info-row">
                            <span class="info-label">WAN 1 (Vivo Fibra PPPoE 1Gbps)</span>
                            <span class="info-val success">● Ativo (1000M Full) • 12ms</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">WAN 2 (Claro Backup DHCP 300Mbps)</span>
                            <span class="info-val" style="color:#38bdf8;">● Standby Quente • 16ms</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">IPv6 Operadora</span>
                            <span class="info-val highlight">2804:14d:5484::/64 (Delegado)</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Controle de Latência (Bufferbloat)</span>
                            <span class="info-val success">CAKE Ativo (Fila Zero-Lag)</span>
                        </div>
                    </div>

                    <div class="ark-card">
                        <div class="card-header">
                            <div class="card-title">
                                <span class="card-kicker">WIRELESS PROFISSIONAL</span>
                                <h3>Redes Wi-Fi & Roaming</h3>
                            </div>
                            <button class="ark-btn ark-btn-secondary" style="min-height:32px; padding:4px 12px; font-size:0.75rem;" onclick="switchView('wifi')">Configurar Wi-Fi</button>
                        </div>
                        <div class="info-row">
                            <span class="info-label">SSID Unificado</span>
                            <span class="info-val" style="color:#38bdf8; font-weight:800;" id="overview_ssid_label">Wi-Fi-H&R (2.4G/5G/6G)</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Segurança Criptográfica</span>
                            <span class="info-val">WPA3-SAE / WPA2-PSK Misto + PMF</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Fast Roaming (802.11k/v/r)</span>
                            <span class="info-val success">Ativo (WNM BSS Transition)</span>
                        </div>
                        <div class="info-row" style="border-top:1px dashed rgba(255,255,255,0.08); padding-top:10px; margin-top:8px;">
                            <div>
                                <span style="font-weight:750; font-size:0.85rem; color:#c084fc;">🚀 Smart Wi-Fi Enhancer</span>
                                <div style="font-size:0.72rem; color:#94a3b8;">Daemon hostapd avançado com 802.11v nativo</div>
                            </div>
                            <button class="ark-btn ark-btn-purple" style="min-height:30px; padding:3px 12px; font-size:0.75rem;" onclick="switchView('enhancer')">Ver Status 7 Etapas</button>
                        </div>
                    </div>
                </div>
            </main>

            <!-- ========================================================= -->
            <!-- 2. VIEW: MULTI-WAN, AUTO-WAN & FAILOVER                   -->
            <!-- ========================================================= -->
            <main class="view-panel" id="view-wan">
                <div class="hero-banner" style="background: linear-gradient(135deg, #091a30 0%, #0d284f 100%);">
                    <div>
                        <span class="hero-eyebrow">ARQUITETURA MULTI-WAN INTELIGENTE</span>
                        <h2 class="hero-title">Multi-WAN, Auto-WAN & Failover</h2>
                        <p class="hero-desc">
                            Monitoramento em tempo real com perda zero de pacotes via mwan3. O Piloto Automático de Portas (Auto-WAN) detecta quando um cabo de operadora é plugado e reconfigura a porta automaticamente.
                        </p>
                    </div>
                    <button class="ark-btn ark-btn-danger" id="sim_failover_btn" onclick="toggleSimulatedFailover()">
                        ⚡ Simular Queda da WAN 1 (Teste de Failover)
                    </button>
                </div>

                <!-- Toggles de Auto-WAN e Balanceamento -->
                <div class="grid-2">
                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Piloto Automático de Portas (Auto-WAN)</span>
                            <span class="toggle-desc">Converte dinamicamente qualquer porta LAN em WAN ao detectar sinal de link de operadora.</span>
                        </div>
                        <label class="ark-switch">
                            <input type="checkbox" checked onchange="toggleGenericSwitch(this, 'Auto-WAN (Piloto Automático de Portas)')">
                            <span class="ark-slider"></span>
                        </label>
                    </div>

                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Modo de Operação Multi-WAN</span>
                            <span class="toggle-desc" id="mwan_mode_desc">Balanceamento Ativo (70% WAN 1 Vivo / 30% WAN 2 Claro).</span>
                        </div>
                        <button class="ark-btn ark-btn-secondary" style="min-height:34px; font-size:0.75rem;" onclick="openModal('mwan_mode')">⚙️ Alterar Regras</button>
                    </div>
                </div>

                <div class="grid-2">
                    <!-- WAN 1 Card -->
                    <div class="ark-card" id="card_wan1">
                        <div class="card-header">
                            <div class="card-title">
                                <span class="card-kicker">INTERFACE PRINCIPAL (eth0 - 2.5 GbE)</span>
                                <h3 id="card_wan1_title">WAN 1: Vivo Fibra PPPoE</h3>
                            </div>
                            <span class="stat-pill online" id="badge_wan1">● ONLINE</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Protocolo</span>
                            <span class="info-val" id="wan1_proto_val">PPPoE (Direto na ONT)</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">IP Público IPv4</span>
                            <span class="info-val highlight" id="val_wan1_ip">177.142.88.94</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Gateway Operadora</span>
                            <span class="info-val highlight">177.142.88.1</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">IPv6 Prefix Delegation</span>
                            <span class="info-val highlight">2804:14d:5484::/64</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">MTU / MRU</span>
                            <span class="info-val" id="wan1_mtu_val">1492 (Padrão Ótimo PPPoE)</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Velocidade & Ping</span>
                            <span class="info-val success">1000 Mbps • 11ms Latência</span>
                        </div>
                        <div class="form-actions" style="margin-top:14px; padding-top:12px;">
                            <button class="ark-btn ark-btn-secondary" style="min-height:34px; font-size:0.78rem;" onclick="openWanModal('WAN 1', 'pppoe', 'Vivo Fibra', '1492')">⚙️ Editar Conexão</button>
                        </div>
                    </div>

                    <!-- WAN 2 Card -->
                    <div class="ark-card" id="card_wan2">
                        <div class="card-header">
                            <div class="card-title">
                                <span class="card-kicker">INTERFACE SECUNDÁRIA (eth1 - 1 GbE)</span>
                                <h3 id="card_wan2_title">WAN 2: Claro Backup DHCP</h3>
                            </div>
                            <span class="stat-pill" style="color:#38bdf8; border-color:#38bdf8;" id="badge_wan2">● STANDBY ATIVO</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Protocolo</span>
                            <span class="info-val" id="wan2_proto_val">DHCP Cliente (Modem em Bridge)</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">IP Público IPv4</span>
                            <span class="info-val highlight">189.120.44.15</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Gateway Operadora</span>
                            <span class="info-val highlight">189.120.44.1</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">MTU</span>
                            <span class="info-val" id="wan2_mtu_val">1500 (Padrão Ethernet)</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Velocidade & Ping</span>
                            <span class="info-val">300 Mbps • 16ms Latência</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Regra de Failover</span>
                            <span class="info-val" style="color:#f59e0b;">Assume se WAN 1 perder 3 pings</span>
                        </div>
                        <div class="form-actions" style="margin-top:14px; padding-top:12px;">
                            <button class="ark-btn ark-btn-secondary" style="min-height:34px; font-size:0.78rem;" onclick="openWanModal('WAN 2', 'dhcp', 'Claro Backup', '1500')">⚙️ Editar Conexão</button>
                        </div>
                    </div>
                </div>
            </main>

            <!-- ========================================================= -->
            <!-- 3. VIEW: REDES WI-FI, RÁDIOS & TOGGLES REAIS              -->
            <!-- ========================================================= -->
            <main class="view-panel" id="view-wifi">
                <div class="hero-banner" style="background: linear-gradient(135deg, #131435 0%, #1e1b4b 100%);">
                    <div>
                        <span class="hero-eyebrow">CONTROLE TOTAL DE RADIOFREQUÊNCIA</span>
                        <h2 class="hero-title">Rádios Wi-Fi 6 / 6E / 7 & Roaming 802.11k/v</h2>
                        <p class="hero-desc">
                            Canais de alta performance com DFS Radar, BSS Coloring, largura de banda de até 160/320 MHz e transição suave entre pontos de acesso sem queda de voz ou jogos.
                        </p>
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <button class="ark-btn ark-btn-primary" onclick="openModal('wifi')">⚙️ Editar SSID e Senha</button>
                        <button class="ark-btn ark-btn-purple" onclick="openModal('wifi_guest')">👥 Rede de Visitantes</button>
                        <button class="ark-btn ark-btn-secondary" onclick="openModal('wifi_qr')">📲 Gerar QR Code Wi-Fi</button>
                        <button class="ark-btn ark-btn-secondary" onclick="openModal('wps')">🤝 Conectar via WPS</button>
                    </div>
                </div>

                <!-- Toggles Reais de Hardware Wi-Fi -->
                <div class="grid-2">
                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Aceleração de Hardware Wi-Fi (MediaTek WED / DMA)</span>
                            <span class="toggle-desc">Despacho direto de pacotes Wi-Fi via DMA/PPE no hardware Filogic 830, liberando os 4 núcleos de CPU.</span>
                        </div>
                        <label class="ark-switch">
                            <input type="checkbox" checked onchange="toggleGenericSwitch(this, 'Aceleração de Hardware Wi-Fi (MediaTek WED)')">
                            <span class="ark-slider"></span>
                        </label>
                    </div>

                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Modo Estabilidade Casa Inteligente / Alexas (2,4 GHz)</span>
                            <span class="toggle-desc">Aplica disassoc_low_ack='0', sincroniza DTIM 1 e estabiliza conexões MQTT/AWS IoT.</span>
                        </div>
                        <label class="ark-switch">
                            <input type="checkbox" checked onchange="toggleGenericSwitch(this, 'Modo Estabilidade Casa Inteligente')">
                            <span class="ark-slider"></span>
                        </label>
                    </div>

                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Prevenção de Quedas Radar DFS (802.11h CSA - 5 GHz)</span>
                            <span class="toggle-desc">Migra aparelhos de canal sem desconectar ao detectar sinais de radar meteorológico nos canais 52 a 144.</span>
                        </div>
                        <label class="ark-switch">
                            <input type="checkbox" checked onchange="toggleGenericSwitch(this, 'Prevenção de Quedas Radar DFS (802.11h)')">
                            <span class="ark-slider"></span>
                        </label>
                    </div>

                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Forçar Potência Máxima de Transmissão (RF FEM)</span>
                            <span class="toggle-desc">Libera 100% da potência física dos amplificadores de sinal do roteador (até 1000mW com salvaguarda térmica).</span>
                        </div>
                        <label class="ark-switch">
                            <input type="checkbox" checked onchange="toggleGenericSwitch(this, 'Potência Máxima de Transmissão RF')">
                            <span class="ark-slider"></span>
                        </label>
                    </div>
                </div>

                <!-- 3 RÁDIOS CARDS -->
                <div class="grid-3">
                    <div class="ark-card">
                        <div class="card-header">
                            <div class="card-title">
                                <span class="card-kicker">RÁDIO 1 • LONGO ALCANCE</span>
                                <h3>2.4 GHz (IoT & Legado)</h3>
                            </div>
                            <span class="stat-pill online">ATIVO</span>
                        </div>
                        <div class="info-row"><span class="info-label">Canal / Frequência</span><span class="info-val highlight" id="wifi_ch_2g">Canal 1 (2412 MHz)</span></div>
                        <div class="info-row"><span class="info-label">Largura de Canal</span><span class="info-val">HE20 (Sem interferência)</span></div>
                        <div class="info-row"><span class="info-label">Potência TX / Ruído</span><span class="info-val">24 dBm (250mW) • -92 dBm</span></div>
                        <div class="info-row"><span class="info-label">Clientes Conectados</span><span class="info-val">12 Aparelhos</span></div>
                        <div class="form-actions" style="margin-top:12px; padding-top:10px;">
                            <button class="ark-btn ark-btn-secondary" style="min-height:32px; font-size:0.75rem;" onclick="openRadioModal('2.4 GHz', '1', 'HE20', '24')">⚙️ Configurar Rádio</button>
                        </div>
                    </div>

                    <div class="ark-card">
                        <div class="card-header">
                            <div class="card-title">
                                <span class="card-kicker">RÁDIO 2 • ALTA VELOCIDADE</span>
                                <h3>5 GHz (Wi-Fi 6)</h3>
                            </div>
                            <span class="stat-pill online">ATIVO</span>
                        </div>
                        <div class="info-row"><span class="info-label">Canal / Frequência</span><span class="info-val highlight" id="wifi_ch_5g">Canal 36 (5180 MHz - DFS)</span></div>
                        <div class="info-row"><span class="info-label">Largura de Canal</span><span class="info-val" style="color:#38bdf8;">HE160 (Até 2400 Mbps)</span></div>
                        <div class="info-row"><span class="info-label">Potência TX / Ruído</span><span class="info-val">27 dBm (500mW) • -95 dBm</span></div>
                        <div class="info-row"><span class="info-label">Clientes Conectados</span><span class="info-val">18 Aparelhos</span></div>
                        <div class="form-actions" style="margin-top:12px; padding-top:10px;">
                            <button class="ark-btn ark-btn-secondary" style="min-height:32px; font-size:0.75rem;" onclick="openRadioModal('5 GHz', '36', 'HE160', '27')">⚙️ Configurar Rádio</button>
                        </div>
                    </div>

                    <div class="ark-card">
                        <div class="card-header">
                            <div class="card-title">
                                <span class="card-kicker">RÁDIO 3 • ULTRA-LOW LATENCY</span>
                                <h3>6 GHz (Wi-Fi 6E/7)</h3>
                            </div>
                            <span class="stat-pill" style="color:#c084fc; border-color:#c084fc;">ATIVO (MLO)</span>
                        </div>
                        <div class="info-row"><span class="info-label">Canal / Frequência</span><span class="info-val highlight" id="wifi_ch_6g">Canal 69 (6295 MHz - PSC)</span></div>
                        <div class="info-row"><span class="info-label">Largura de Canal</span><span class="info-val" style="color:#c084fc;">HE160 / 320 MHz</span></div>
                        <div class="info-row"><span class="info-label">Segurança Obrigatória</span><span class="info-val">WPA3-SAE Puro com PMF</span></div>
                        <div class="info-row"><span class="info-label">Clientes Conectados</span><span class="info-val">4 Aparelhos (iPhone/Mac)</span></div>
                        <div class="form-actions" style="margin-top:12px; padding-top:10px;">
                            <button class="ark-btn ark-btn-secondary" style="min-height:32px; font-size:0.75rem;" onclick="openRadioModal('6 GHz', '69', 'HE160', '23')">⚙️ Configurar Rádio</button>
                        </div>
                    </div>
                </div>
            </main>

            <!-- ========================================================= -->
            <!-- 4. VIEW: SMART WI-FI ENHANCER (7 ETAPAS)                  -->
            <!-- ========================================================= -->
            <main class="view-panel" id="view-enhancer">
                <div class="hero-banner" style="background: linear-gradient(135deg, #2e1065 0%, #3b0764 100%); border-color: rgba(168, 85, 247, 0.4);">
                    <div>
                        <span class="hero-eyebrow" style="color: #c084fc;">MOTOR DE OTIMIZAÇÃO AUTOMÁTICA</span>
                        <h2 class="hero-title">Smart Wi-Fi Package Enhancer</h2>
                        <p class="hero-desc">
                            Upgrade atômico do daemon Wi-Fi do OpenWrt de <strong style="color:#f59e0b;">wpad-basic-mbedtls</strong> para <strong style="color:#10b981;">wpad-mbedtls completo</strong>. Destrava nativamente o 802.11v BSS Transition Management e Fast Roaming com zero perda de conectividade.
                        </p>
                    </div>
                    <button class="ark-btn ark-btn-purple" id="enhancer_main_run_btn" onclick="startEnhancerLiveSimulation()">
                        🚀 Iniciar Upgrade Automático (7 Etapas)
                    </button>
                </div>

                <div class="grid-2">
                    <div class="ark-card">
                        <div class="card-header">
                            <div class="card-title">
                                <span class="card-kicker">PRÉ-REQUISITOS DE HARDWARE</span>
                                <h3>Validação de Capacidade</h3>
                            </div>
                            <span class="stat-pill online">COMPATÍVEL</span>
                        </div>
                        <div class="info-row"><span class="info-label">Memória RAM do Roteador</span><span class="info-val success">512 MB (Mínimo 256 MB ✓)</span></div>
                        <div class="info-row"><span class="info-label">Espaço Flash Livre (Overlay)</span><span class="info-val success">8.4 MB (Mínimo 4 MB ✓)</span></div>
                        <div class="info-row"><span class="info-label">Pacote Atual Instalado</span><span class="info-val" id="enhancer_page_cur_pkg" style="color:#f59e0b;">wpad-basic-mbedtls</span></div>
                        <div class="info-row"><span class="info-label">Pacote Alvo da Otimização</span><span class="info-val success">wpad-mbedtls (Com WNM 802.11v)</span></div>
                        <div class="info-row"><span class="info-label">Proteção de Rollback</span><span class="info-val">Ativa (Restauração se falhar)</span></div>
                    </div>

                    <div class="ark-card">
                        <div class="card-header">
                            <div class="card-title">
                                <span class="card-kicker">ACOMPANHAMENTO AO VIVO</span>
                                <h3>Progresso da Otimização</h3>
                            </div>
                            <span class="stat-pill" id="enhancer_status_badge" style="background:#8b5cf6; color:#fff;">PRONTO</span>
                        </div>

                        <div style="background:rgba(255,255,255,0.08); border-radius:6px; overflow:hidden; height:12px; margin:10px 0 14px;">
                            <div id="enhancer_pbar" style="background:linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6); height:100%; width:0%; transition:width 0.35s ease;"></div>
                        </div>

                        <p id="enhancer_msg" style="font-size:0.85rem; color:#94a3b8; min-height:22px; margin-bottom:14px;">
                            Clique em "Iniciar Upgrade Automático" para executar as 7 etapas.
                        </p>

                        <ul class="stepper-list" id="enhancer_stepper">
                            <li class="step-item" id="s_step_1"><span class="step-icon">1</span> 1. Pré-voo de Recursos (RAM >= 256MB, Flash >= 4MB)</li>
                            <li class="step-item" id="s_step_2"><span class="step-icon">2</span> 2. Teste de Conectividade com Repositório OpenWrt</li>
                            <li class="step-item" id="s_step_3"><span class="step-icon">3</span> 3. Preparação e Limpeza de Dependências</li>
                            <li class="step-item" id="s_step_4"><span class="step-icon">4</span> 4. Download e Instalação Atômica (wpad-mbedtls)</li>
                            <li class="step-item" id="s_step_5"><span class="step-icon">5</span> 5. Verificação de Integridade dos Binários</li>
                            <li class="step-item" id="s_step_6"><span class="step-icon">6</span> 6. Ativação de 802.11v, BSS Transition e Sincronização</li>
                            <li class="step-item" id="s_step_7"><span class="step-icon">7</span> 7. Instalação e Otimização Concluídas com Sucesso</li>
                        </ul>
                    </div>
                </div>
            </main>

            <!-- ========================================================= -->
            <!-- 5. VIEW: DISPOSITIVOS (34 CLIENTES)                       -->
            <!-- ========================================================= -->
            <main class="view-panel" id="view-devices">
                <div class="card-header" style="margin-bottom:16px;">
                    <div>
                        <span class="card-kicker">INSPEÇÃO E CONTROLE DE TRÁFEGO</span>
                        <h2 style="font-size:1.6rem; font-weight:850; color:#fff;">34 Dispositivos Conectados na Rede</h2>
                    </div>
                    <button class="ark-btn ark-btn-secondary" onclick="openDeviceModal('Novo Dispositivo', '192.168.1.50', 'AA:BB:CC:DD:EE:FF')">➕ Reservar IP Fixo</button>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:14px; flex-wrap:wrap;">
                    <div style="display:flex; gap:8px;">
                        <button class="ark-btn ark-btn-primary" style="min-height:34px; padding:4px 12px; font-size:0.75rem;" onclick="filterDevices('all')">Todos (34)</button>
                        <button class="ark-btn ark-btn-secondary" style="min-height:34px; padding:4px 12px; font-size:0.75rem;" onclick="filterDevices('5g')">5 GHz (18)</button>
                        <button class="ark-btn ark-btn-secondary" style="min-height:34px; padding:4px 12px; font-size:0.75rem;" onclick="filterDevices('2g')">2.4 GHz (12)</button>
                        <button class="ark-btn ark-btn-secondary" style="min-height:34px; padding:4px 12px; font-size:0.75rem;" onclick="filterDevices('6g')">6 GHz (4)</button>
                    </div>
                    <input type="text" class="form-input" id="device_search_input" placeholder="🔍 Buscar por nome, IP ou MAC..." style="width:280px; height:36px;" oninput="searchDevices(this.value)">
                </div>

                <div class="swipe-hint">↔ Deslize a tabela lateralmente para visualizar detalhes completos</div>
                <div class="table-responsive">
                    <table class="ark-table" id="devices_table">
                        <thead>
                            <tr>
                                <th>Dispositivo / Fabricante</th>
                                <th>Endereço IP / MAC</th>
                                <th>Banda / Sinal</th>
                                <th>Download</th>
                                <th>Upload</th>
                                <th>Status / Ação</th>
                            </tr>
                        </thead>
                        <tbody id="devices_tbody"></tbody>
                    </table>
                </div>
            </main>

            <!-- ========================================================= -->
            <!-- 6. VIEW: STARLINK & SATÉLITE (MÓDULO STARLINK.JS)         -->
            <!-- ========================================================= -->
            <main class="view-panel" id="view-starlink">
                <div class="hero-banner" style="background: linear-gradient(135deg, #091d36 0%, #0d2e54 100%); border-color: rgba(6, 182, 212, 0.4);">
                    <div>
                        <span class="hero-eyebrow" style="color: #06b6d4;">INTEGRAÇÃO DE SATÉLITE EM ÓRBITA BAIXA</span>
                        <h2 class="hero-title">Starlink Dishy Telemetry & Bypass</h2>
                        <p class="hero-desc">
                            Monitoramento direto via gRPC da antena Starlink (Dishy V2 / V3 / Mini). Exibição em tempo real de latência aos satélites, mapa de obstrução, azimute e controle de modo sleep.
                        </p>
                    </div>
                    <button class="ark-btn ark-btn-primary" onclick="openModal('starlink_config')">⚙️ Configurações Starlink</button>
                </div>

                <div class="grid-3">
                    <div class="stat-card">
                        <div class="stat-card-label">LATÊNCIA PARA O SATÉLITE</div>
                        <div class="stat-card-value" style="color:#06b6d4;">28 <small>ms</small></div>
                        <div class="stat-card-meta">Órbita LEO • Jitter de ±3ms</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-label">OBSTRUÇÃO DO CÉU</div>
                        <div class="stat-card-value" style="color:#10b981;">0.0% <small>Livre</small></div>
                        <div class="stat-card-meta">Visada 100% limpa ao Norte</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-label">CONSUMO DE ENERGIA</div>
                        <div class="stat-card-value">42 <small>Watts</small></div>
                        <div class="stat-card-meta">Degelo inteligente desativado</div>
                    </div>
                </div>

                <div class="grid-2">
                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Modo Bypass de Roteador Starlink</span>
                            <span class="toggle-desc">Encaminha tráfego público direto para o ARK Router sem duplo NAT (CGNAT IPv4 / IPv6 nativo).</span>
                        </div>
                        <label class="ark-switch">
                            <input type="checkbox" checked onchange="toggleGenericSwitch(this, 'Modo Bypass Starlink')">
                            <span class="ark-slider"></span>
                        </label>
                    </div>
                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Modo Noturno / Economia de Energia (Sleep Schedule)</span>
                            <span class="toggle-desc">Pausa a antena das 02:00 às 06:00 da manhã para reduzir consumo de energia em off-grid.</span>
                        </div>
                        <label class="ark-switch">
                            <input type="checkbox" onchange="toggleGenericSwitch(this, 'Modo Noturno Starlink')">
                            <span class="ark-slider"></span>
                        </label>
                    </div>
                </div>
            </main>

            <!-- ========================================================= -->
            <!-- 7. VIEW: VPN, WIREGUARD & PBR (MÓDULO VPN.JS)             -->
            <!-- ========================================================= -->
            <main class="view-panel" id="view-vpn">
                <div class="hero-banner" style="background: linear-gradient(135deg, #18182b 0%, #2b1f47 100%); border-color: rgba(139, 92, 246, 0.4);">
                    <div>
                        <span class="hero-eyebrow" style="color: #c084fc;">CRIPTOGRAFIA & PRIVACIDADE</span>
                        <h2 class="hero-title">WireGuard VPN & Roteamento por Políticas (PBR)</h2>
                        <p class="hero-desc">
                            Conecte túneis WireGuard de alta velocidade e direcione tráfego de dispositivos específicos (ex: Smart TVs, Torrent, consoles) para a VPN ou para uma WAN de preferência.
                        </p>
                    </div>
                    <button class="ark-btn ark-btn-purple" onclick="openModal('add_vpn')">➕ Adicionar Túnel WireGuard</button>
                </div>

                <div class="ark-card" style="margin-bottom:20px;">
                    <div class="card-header">
                        <div class="card-title">
                            <span class="card-kicker">TÚNEIS ATIVOS</span>
                            <h3>Clientes e Servidores VPN</h3>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="ark-table">
                            <thead>
                                <tr>
                                    <th>Interface</th>
                                    <th>Servidor / Endpoint</th>
                                    <th>IP do Túnel</th>
                                    <th>Tráfego RX/TX</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>wg0 (Mullvad Suécia)</strong></td>
                                    <td>se-sto-wg-001.relays.mullvad.net:51820</td>
                                    <td style="font-family:monospace; color:#38bdf8;">10.64.120.4/32</td>
                                    <td>⬇ 1.4 GB / ⬆ 340 MB</td>
                                    <td><span class="stat-pill online">CONECTADO (14ms)</span></td>
                                    <td><button class="ark-btn ark-btn-secondary" style="min-height:30px; font-size:0.75rem;" onclick="openModal('edit_vpn')">⚙️ Configurar</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <!-- ========================================================= -->
            <!-- 8. VIEW: SPEEDTEST MULTI-WAN (MÓDULO SPEEDTEST.JS)        -->
            <!-- ========================================================= -->
            <main class="view-panel" id="view-speedtest">
                <div class="hero-banner" style="background: linear-gradient(135deg, #092c30 0%, #06404e 100%); border-color: rgba(6, 182, 212, 0.4);">
                    <div>
                        <span class="hero-eyebrow" style="color: #06b6d4;">MEDIDOR DE CAPACIDADE DE BANDA</span>
                        <h2 class="hero-title">Speedtest Multi-WAN Integrado</h2>
                        <p class="hero-desc">
                            Execute testes de vazão diretamente no roteador contra servidores Ookla / LibreSpeed sem sofrer atenuação de Wi-Fi. Teste WAN 1 e WAN 2 de forma isolada ou agregada.
                        </p>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="ark-btn ark-btn-primary" onclick="runSpeedtest('wan1')">⚡ Testar WAN 1 (Fibra)</button>
                        <button class="ark-btn ark-btn-secondary" onclick="runSpeedtest('wan2')">⚡ Testar WAN 2 (Claro)</button>
                    </div>
                </div>

                <div class="grid-3">
                    <div class="stat-card">
                        <div class="stat-card-label">DOWNLOAD TESTADO</div>
                        <div class="stat-card-value" style="color:#38bdf8;" id="sp_down_val">942.8 <small>Mbps</small></div>
                        <div class="stat-card-meta">Servidor São Paulo (Vivo)</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-label">UPLOAD TESTADO</div>
                        <div class="stat-card-value" style="color:#10b981;" id="sp_up_val">488.2 <small>Mbps</small></div>
                        <div class="stat-card-meta">Bufferbloat 0ms adicionado</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-label">LATÊNCIA & JITTER</div>
                        <div class="stat-card-value" id="sp_ping_val">4.2 <small>ms</small></div>
                        <div class="stat-card-meta">Jitter: 0.4 ms</div>
                    </div>
                </div>
            </main>

            <!-- ========================================================= -->
            <!-- 9. VIEW: FIREWALL & SQM CAKE                              -->
            <!-- ========================================================= -->
            <main class="view-panel" id="view-sqm">
                <div class="hero-banner" style="background: linear-gradient(135deg, #092c20 0%, #064e3b 100%); border-color:rgba(16,185,129,0.3);">
                    <div>
                        <span class="hero-eyebrow" style="color:#10b981;">ELIMINADOR DE BUFFERBLOAT (ZERO-LAG)</span>
                        <h2 class="hero-title">Smart Queue Management (SQM CAKE)</h2>
                        <p class="hero-desc">
                            O algoritmo CAKE prioriza pacotes essenciais como jogos online, chamadas de vídeo e DNS, garantindo que o ping permaneça estável mesmo durante downloads pesados.
                        </p>
                    </div>
                    <button class="ark-btn ark-btn-primary" style="background:#10b981;" onclick="openModal('sqm')">⚙️ Ajustar Velocidades</button>
                </div>

                <div class="grid-2">
                    <div class="ark-card">
                        <div class="card-header">
                            <div class="card-title">
                                <span class="card-kicker">CONFIGURAÇÃO ATUAL DO CAKE</span>
                                <h3>Limites de Fila e Enquadramento</h3>
                            </div>
                            <span class="stat-pill online">0ms LAG</span>
                        </div>
                        <div class="info-row"><span class="info-label">Interface de Aplicação</span><span class="info-val highlight">pppoe-wan (Vivo Fibra)</span></div>
                        <div class="info-row"><span class="info-label">Limite de Download</span><span class="info-val highlight" id="sqm_val_down">850 Mbps (95% da banda)</span></div>
                        <div class="info-row"><span class="info-label">Limite de Upload</span><span class="info-val highlight" id="sqm_val_up">450 Mbps (95% da banda)</span></div>
                        <div class="info-row"><span class="info-label">Compensação de Framing</span><span class="info-val">Fibra Óptica FTTH (0 bytes)</span></div>
                        <div class="info-row"><span class="info-label">Escalonamento Multi-Core</span><span class="info-val success">cake-mq ativo nos 4 núcleos</span></div>
                        <div class="form-actions" style="margin-top:12px; padding-top:10px;">
                            <button class="ark-btn ark-btn-secondary" style="min-height:34px; font-size:0.78rem;" onclick="openModal('sqm')">⚙️ Ajustar Parâmetros</button>
                        </div>
                    </div>

                    <div class="ark-card">
                        <div class="card-header">
                            <div class="card-title">
                                <span class="card-kicker">ZONA DESMILITARIZADA & PORT FORWARD</span>
                                <h3>DMZ & Redirecionamento de Portas</h3>
                            </div>
                            <span class="stat-pill" id="dmz_status_badge" style="color:#f59e0b; border-color:#f59e0b;">DMZ DESLIGADO</span>
                        </div>
                        <div class="toggle-row">
                            <div>
                                <span class="toggle-title">DMZ (Zona Desmilitarizada)</span>
                                <span class="toggle-desc">Encaminha todas as portas não mapeadas para o IP de um videogame ou servidor local.</span>
                            </div>
                            <label class="ark-switch">
                                <input type="checkbox" id="dmz_switch" onchange="toggleDmzSwitch(this)">
                                <span class="ark-slider"></span>
                            </label>
                        </div>
                        <div class="form-actions" style="margin-top:12px; padding-top:10px;">
                            <button class="ark-btn ark-btn-secondary" style="min-height:34px; font-size:0.78rem;" onclick="openModal('port_forward')">➕ Adicionar Regra de Porta (NAT)</button>
                        </div>
                    </div>
                </div>
            </main>

            <!-- ========================================================= -->
            <!-- 10. VIEW: ESCUDO ADBLOCK & DNS                            -->
            <!-- ========================================================= -->
            <main class="view-panel" id="view-adblock">
                <div class="hero-banner" style="background: linear-gradient(135deg, #3b0716 0%, #4c0519 100%); border-color:rgba(244,63,94,0.3);">
                    <div>
                        <span class="hero-eyebrow" style="color:#fb7185;">PROTEÇÃO NATIVA NO ROTEADOR</span>
                        <h2 class="hero-title">Escudo AdBlock & Bloqueio DNS</h2>
                        <p class="hero-desc">
                            Bloqueio automático de anúncios, rastreadores e sites maliciosos diretamente na raiz da rede para todos os celulares, smart TVs e computadores da casa.
                        </p>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="ark-btn ark-btn-primary" style="background:#f43f5e;" onclick="runAdblockUpdate()">🔄 Atualizar Listas Agora</button>
                        <button class="ark-btn ark-btn-secondary" onclick="openModal('adblock_rules')">⚙️ Gerenciar Whitelist</button>
                    </div>
                </div>

                <div class="grid-3">
                    <div class="stat-card">
                        <div class="stat-card-label">ANÚNCIOS BLOQUEADOS HOJE</div>
                        <div class="stat-card-value" style="color:#fb7185;">42.819</div>
                        <div class="stat-card-meta">23.4% de todas as consultas DNS</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-label">DOMÍNIOS NA LISTA NEGRA</div>
                        <div class="stat-card-value">248.910</div>
                        <div class="stat-card-meta">Listas OISD + StevenBlack atualizadas</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-label">LATÊNCIA DO DNS PRIVADO</div>
                        <div class="stat-card-value" style="color:#10b981;">1.2 ms</div>
                        <div class="stat-card-meta">Dnsmasq + Cache em RAM</div>
                    </div>
                </div>
            </main>

            <!-- ========================================================= -->
            <!-- 11. VIEW: ARK DOCTOR (28 CHECKS)                          -->
            <!-- ========================================================= -->
            <main class="view-panel" id="view-doctor">
                <div class="hero-banner" style="background: linear-gradient(135deg, #022c22 0%, #064e3b 100%); border-color:rgba(16,185,129,0.3);">
                    <div>
                        <span class="hero-eyebrow" style="color:#10b981;">AUDITORIA PROFISSIONAL E AUTOCURA</span>
                        <h2 class="hero-title">Ark Doctor — Diagnóstico Completo</h2>
                        <p class="hero-desc">
                            Verificação profunda de 28 pontos críticos de rede, firewall fw4 puro, MTU, IPv6, BSS Transition e detecção de conflitos de pacotes.
                        </p>
                    </div>
                    <button class="ark-btn ark-btn-primary" style="background:#10b981;" onclick="runDoctorAudit()">🩺 Executar Auditoria Completa</button>
                </div>

                <div class="ark-card">
                    <div class="card-header">
                        <div class="card-title">
                            <span class="card-kicker">STATUS GERAL DO ROTEADOR</span>
                            <h3 id="doctor_status_text">STATUS: SISTEMA 100% SAUDÁVEL E OTIMIZADO! (28/28 APROVADOS)</h3>
                        </div>
                        <span class="stat-pill online" id="doctor_badge">28/28 OK</span>
                    </div>

                    <div class="grid-2" id="doctor_checks_container"></div>
                </div>
            </main>

            <!-- ========================================================= -->
            <!-- 12. VIEW: SISTEMA, SENSORES, LEDS & MODOS OPERACIONAIS    -->
            <!-- ========================================================= -->
            <main class="view-panel" id="view-system">
                <div class="hero-banner">
                    <div>
                        <span class="hero-eyebrow">DIAGNÓSTICO FÍSICO & OPERACIONAL</span>
                        <h2 class="hero-title">Sistema, Sensores & Hardware</h2>
                        <p class="hero-desc">
                            Acer Predator Connect W6x / Cudy WR3000 • MediaTek Filogic 830 Quad-Core • OpenWrt 25.12.5.
                        </p>
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <button class="ark-btn ark-btn-secondary" onclick="generateBackupDownload()">💾 Backup das Configurações</button>
                        <button class="ark-btn ark-btn-secondary" onclick="openModal('theme_picker')">🎨 Trocar Tema Visual</button>
                        <button class="ark-btn ark-btn-danger" onclick="openModal('reboot')">🔄 Reiniciar</button>
                    </div>
                </div>

                <!-- Toggles de Sistema, LEDs e HTTPS -->
                <div class="grid-2">
                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Redirecionamento HTTPS Automático</span>
                            <span class="toggle-desc">Força conexões seguras com certificado SSL local em todo acesso web.</span>
                        </div>
                        <label class="ark-switch">
                            <input type="checkbox" checked onchange="toggleGenericSwitch(this, 'Redirecionamento HTTPS')">
                            <span class="ark-slider"></span>
                        </label>
                    </div>

                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Atualizações Automáticas de Firmware (ASU)</span>
                            <span class="toggle-desc">Verifica compilações estáveis do OpenWrt com restauração automática de pacotes.</span>
                        </div>
                        <label class="ark-switch">
                            <input type="checkbox" onchange="toggleGenericSwitch(this, 'Atualizações ASU')">
                            <span class="ark-slider"></span>
                        </label>
                    </div>

                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Controle Inteligente de LEDs do Roteador</span>
                            <span class="toggle-desc" id="led_mode_desc">Modo Tráfego Dinâmico (Pisca suave conforme download/upload).</span>
                        </div>
                        <button class="ark-btn ark-btn-secondary" style="min-height:34px; font-size:0.75rem;" onclick="openModal('led_control')">💡 Ajustar LEDs</button>
                    </div>

                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Modo de Operação do Roteador</span>
                            <span class="toggle-desc">Modo Roteador Gateway Completo (NAT, Firewall e DHCP ativos).</span>
                        </div>
                        <button class="ark-btn ark-btn-secondary" style="min-height:34px; font-size:0.75rem;" onclick="openModal('router_mode')">🔀 Alternar Modo</button>
                    </div>
                </div>

                <div class="grid-3">
                    <div class="ark-card">
                        <div class="card-header">
                            <h3>Processador (CPU)</h3>
                            <span class="stat-pill online">8% Carga</span>
                        </div>
                        <div class="info-row"><span class="info-label">Modelo</span><span class="info-val">Filogic 830 Quad-Core</span></div>
                        <div class="info-row"><span class="info-label">Frequência</span><span class="info-val">2.0 GHz por núcleo</span></div>
                        <div class="info-row"><span class="info-label">Core 0</span><span class="info-val highlight">6%</span></div>
                        <div class="info-row"><span class="info-label">Core 1</span><span class="info-val highlight">9%</span></div>
                        <div class="info-row"><span class="info-label">Core 2</span><span class="info-val highlight">7%</span></div>
                        <div class="info-row"><span class="info-label">Core 3</span><span class="info-val highlight">10%</span></div>
                    </div>

                    <div class="ark-card">
                        <div class="card-header">
                            <h3>Memória RAM (512 MB)</h3>
                            <span class="stat-pill online">26% Usada</span>
                        </div>
                        <div class="info-row"><span class="info-label">Total Físico</span><span class="info-val">512 MB DDR4</span></div>
                        <div class="info-row"><span class="info-label">Em Uso Real (RSS)</span><span class="info-val highlight">134 MB</span></div>
                        <div class="info-row"><span class="info-label">Buffers & Cache</span><span class="info-val">88 MB</span></div>
                        <div class="info-row"><span class="info-label">Livre para Alocação</span><span class="info-val success">290 MB</span></div>
                    </div>

                    <div class="ark-card">
                        <div class="card-header">
                            <h3>Armazenamento Flash (128 MB)</h3>
                            <span class="stat-pill online">Livre</span>
                        </div>
                        <div class="info-row"><span class="info-label">Tipo</span><span class="info-val">SPI NAND Flash</span></div>
                        <div class="info-row"><span class="info-label">Partição Overlay RW</span><span class="info-val highlight">96 MB</span></div>
                        <div class="info-row"><span class="info-label">Espaço Livre</span><span class="info-val success">82.4 MB Livres</span></div>
                        <div class="info-row"><span class="info-label">Saúde do Overlay</span><span class="info-val success">100% Íntegro</span></div>
                    </div>
                </div>
            </main>

        </div>
    </div>

    <!-- ========================================================= -->
    <!-- SLIDE-OVER DRAWER: PÁGINAS NATIVAS DO LUCI (NÃO-INTRUSIVO) -->
    <!-- ========================================================= -->
    <div id="luci_drawer_backdrop" onclick="toggleLuciDrawer()"></div>
    <div id="luci_drawer">
        <div class="drawer-header">
            <h3>🛠️ Páginas Nativas do LuCI</h3>
            <button class="modal-close-btn" onclick="toggleLuciDrawer()">✕</button>
        </div>
        <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4;">
            Acesso direto e irrestrito a todos os formulários UCI e ferramentas avançadas do LuCI original sem sair do ecossistema.
        </p>

        <div class="drawer-cat">📊 Status & Diagnósticos</div>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/status/overview')">
            <span>Visão Geral do LuCI</span>
            <span class="uri">/status/overview</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/status/routes')">
            <span>Tabela de Rotas de Kernel</span>
            <span class="uri">/status/routes</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/status/syslog')">
            <span>Log do Sistema (Syslog)</span>
            <span class="uri">/status/syslog</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/status/dmesg')">
            <span>Log do Kernel (dmesg)</span>
            <span class="uri">/status/dmesg</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/status/processes')">
            <span>Processos em Execução</span>
            <span class="uri">/status/processes</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/status/realtime')">
            <span>Gráficos em Tempo Real</span>
            <span class="uri">/status/realtime</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/status/nftables')">
            <span>Status do Firewall (nftables)</span>
            <span class="uri">/status/nftables</span>
        </a>

        <div class="drawer-cat">🌐 Rede & Interfaces</div>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/network/network')">
            <span>Interfaces de Rede</span>
            <span class="uri">/network/network</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/network/device')">
            <span>Dispositivos & Pontes (DSA)</span>
            <span class="uri">/network/device</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/network/wireless')">
            <span>Redes Sem Fio (Wireless)</span>
            <span class="uri">/network/wireless</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/network/dhcp')">
            <span>Servidor DHCP e DNS</span>
            <span class="uri">/network/dhcp</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/network/firewall')">
            <span>Firewall (Regras de Tráfego)</span>
            <span class="uri">/network/firewall</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/network/mwan')">
            <span>Multi-WAN (mwan3)</span>
            <span class="uri">/network/mwan</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/network/diagnostics')">
            <span>Diagnóstico (Ping & Traceroute)</span>
            <span class="uri">/network/diagnostics</span>
        </a>

        <div class="drawer-cat">🛡️ Serviços</div>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/services/sqm')">
            <span>Gerenciador de Filas SQM</span>
            <span class="uri">/services/sqm</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/services/adblock')">
            <span>AdBlock Nativo</span>
            <span class="uri">/services/adblock</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/services/upnp')">
            <span>UPnP / Port Forwarding</span>
            <span class="uri">/services/upnp</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/services/ddns')">
            <span>DNS Dinâmico (DDNS)</span>
            <span class="uri">/services/ddns</span>
        </a>

        <div class="drawer-cat">⚙️ Sistema & Firmware</div>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/system/system')">
            <span>Configurações do Sistema</span>
            <span class="uri">/system/system</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/system/admin')">
            <span>Senha do Administrador & SSH</span>
            <span class="uri">/system/admin</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/system/packages')">
            <span>Gerenciador de Pacotes (opkg/apk)</span>
            <span class="uri">/system/packages</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/system/startup')">
            <span>Inicialização & Daemons</span>
            <span class="uri">/system/startup</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/system/crontab')">
            <span>Tarefas Agendadas (Cron)</span>
            <span class="uri">/system/crontab</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/system/flash')">
            <span>Backup / Flash Firmware</span>
            <span class="uri">/system/flash</span>
        </a>
        <a class="drawer-link" onclick="openLuciUrl('/cgi-bin/luci/admin/system/reboot')">
            <span>Reiniciar Sistema</span>
            <span class="uri">/system/reboot</span>
        </a>

        <div style="margin-top:16px; padding-top:14px; border-top:1px solid var(--ark-border);">
            <button class="ark-btn ark-btn-secondary" style="width:100%; font-size:0.78rem;" onclick="switchToClassicLuCI()">
                🔄 Alternar para Modo LuCI Clássico (Argon)
            </button>
        </div>
    </div>

    <!-- MODAL OVERLAY GENÉRICO DINÂMICO -->
    <div id="modal_overlay" class="inactive" onclick="if(event.target === this) closeModal();">
        <div class="modal modal-card" id="modal_container"></div>
    </div>

    <!-- TOAST NOTIFICATION -->
    <div id="toast_notify"></div>

    <!-- ========================================================= -->
    <!-- JAVASCRIPT REATIVO DO DASHBOARD                           -->
    <!-- ========================================================= -->
    <script>
        // Router & Navigation
        const pageTitles = {
            overview: '<span>📊</span> Visão Geral do Roteador',
            wan: '<span>🌐</span> Multi-WAN, Interfaces & Failover',
            wifi: '<span>📶</span> Redes Wi-Fi 6E/7 & Radiofrequência',
            enhancer: '<span>🚀</span> Smart Wi-Fi Package Enhancer',
            devices: '<span>📱</span> Dispositivos Conectados (34 Clientes)',
            starlink: '<span>🛰️</span> Starlink & Satélite (Dishy LEO)',
            vpn: '<span>🔒</span> WireGuard VPN & Roteamento PBR',
            speedtest: '<span>⚡</span> Speedtest Multi-WAN Integrado',
            sqm: '<span>🛡️</span> Firewall & SQM CAKE (Zero-Lag)',
            adblock: '<span>🛑</span> Escudo AdBlock & Bloqueio DNS',
            doctor: '<span>🩺</span> Ark Doctor — Diagnóstico Completo (28 Checks)',
            system: '<span>⚙️</span> Sistema, Sensores, LEDs & Modos'
        };

        function switchView(viewId) {
            document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.sidebar .nav-item').forEach(el => el.classList.remove('active'));

            const targetPanel = document.getElementById('view-' + viewId);
            if (targetPanel) targetPanel.classList.add('active');

            const heading = document.getElementById('current_page_title');
            if (heading && pageTitles[viewId]) heading.innerHTML = pageTitles[viewId];

            document.querySelectorAll('.sidebar .nav-item').forEach(el => {
                const attr = el.getAttribute('onclick') || '';
                if (attr.includes("'" + viewId + "'")) el.classList.add('active');
            });

            document.getElementById('sidebar').classList.remove('open');
            window.scrollTo({ top: 0, behavior: 'smooth' });
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

        function openLuciUrl(path) {
            toggleLuciDrawer();
            showToast('Navegando para: ' + path);
            // Em ambiente real com LuCI conectado: window.location.href = path;
        }

        function switchToClassicLuCI() {
            toggleLuciDrawer();
            showToast('Alternando para o tema LuCI clássico (Argon / Bootstrap)...');
        }

        // Live Clock & Ping Jitter
        function updateClock() {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            const clockEl = document.getElementById('header_clock');
            if (clockEl) clockEl.textContent = timeStr;

            const jitter = Math.floor(Math.random() * 4) + 11;
            const pingEl = document.getElementById('header_ping');
            if (pingEl) pingEl.textContent = jitter;
        }
        setInterval(updateClock, 1000);
        updateClock();

        // Canvas 2D Live Traffic Chart
        const canvas = document.getElementById('traffic_canvas');
        let chartPaused = false;
        const downData = [240, 260, 310, 420, 450, 480, 470, 490, 510, 480, 460, 482];
        const upData = [80, 95, 110, 140, 160, 180, 175, 185, 190, 182, 178, 184];

        function drawChart() {
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const w = rect.width;
            const h = rect.height;
            ctx.clearRect(0, 0, w, h);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            for (let y = 30; y < h; y += 35) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            function renderLine(data, strokeColor, fillColor) {
                const maxVal = 600;
                const pts = data.map((v, i) => ({
                    x: (i / (data.length - 1)) * w,
                    y: h - (v / maxVal) * (h - 20)
                }));

                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 0; i < pts.length - 1; i++) {
                    const xc = (pts[i].x + pts[i + 1].x) / 2;
                    const yc = (pts[i].y + pts[i + 1].y) / 2;
                    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
                }
                ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);

                ctx.save();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2.5;
                ctx.shadowColor = strokeColor;
                ctx.shadowBlur = 8;
                ctx.stroke();
                ctx.restore();

                ctx.lineTo(w, h);
                ctx.lineTo(0, h);
                ctx.closePath();
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, fillColor);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.fill();
            }

            renderLine(downData, '#38bdf8', 'rgba(56, 189, 248, 0.25)');
            renderLine(upData, '#10b981', 'rgba(16, 185, 129, 0.2)');
        }

        function updateTraffic() {
            if (chartPaused) return;
            const nextDown = Math.floor(Math.random() * 80) + 440;
            const nextUp = Math.floor(Math.random() * 40) + 160;

            downData.shift();
            downData.push(nextDown);
            upData.shift();
            upData.push(nextUp);

            const downEl = document.getElementById('stat_down');
            const totalSpeedEl = document.getElementById('overview_total_speed');
            const chartDown = document.getElementById('chart_down_label');
            const chartUp = document.getElementById('chart_up_label');

            if (downEl) downEl.textContent = nextDown;
            if (totalSpeedEl) totalSpeedEl.textContent = (nextDown + (nextUp * 0.1)).toFixed(1) + ' Mbps';
            if (chartDown) chartDown.textContent = nextDown + ' Mbps';
            if (chartUp) chartUp.textContent = nextUp + ' Mbps';

            drawChart();
        }
        setInterval(updateTraffic, 1500);
        window.addEventListener('resize', drawChart);
        setTimeout(drawChart, 200);

        function toggleChartPause() {
            chartPaused = !chartPaused;
            showToast(chartPaused ? 'Tráfego pausado' : 'Tráfego retomado');
        }

        // Multi-WAN Failover Simulation
        let wanFailoverSimulated = false;
        function toggleSimulatedFailover() {
            wanFailoverSimulated = !wanFailoverSimulated;
            const btn = document.getElementById('sim_failover_btn');
            const b1 = document.getElementById('badge_wan1');
            const b2 = document.getElementById('badge_wan2');

            if (wanFailoverSimulated) {
                btn.textContent = '🔄 Restaurar WAN 1 (Reconectar Fibra)';
                btn.className = 'ark-btn ark-btn-primary';
                b1.textContent = '✕ DESCONECTADO (Cabo Rompido)';
                b1.className = 'stat-pill';
                b1.style.color = '#ef4444';
                b1.style.borderColor = '#ef4444';

                b2.textContent = '● ASSUMIU 100% DO TRÁFEGO (FAILOVER)';
                b2.className = 'stat-pill online';

                showToast('⚠️ WAN 1 desconectada! Failover acionado: WAN 2 assumiu o tráfego em 200ms!');
            } else {
                btn.textContent = '⚡ Simular Queda da WAN 1 (Teste de Failover)';
                btn.className = 'ark-btn ark-btn-danger';
                b1.textContent = '● ONLINE';
                b1.className = 'stat-pill online';
                b1.style.color = '';
                b1.style.borderColor = '';

                b2.textContent = '● STANDBY ATIVO';
                b2.className = 'stat-pill';

                showToast('✅ WAN 1 restabelecida! Balanceamento normal restaurado.');
            }
        }

        // Devices Data & Table Renderer
        const devicesList = [
            { name: 'MacBook Pro 16" M3 Max', ip: '192.168.1.105', mac: 'AA:BB:CC:11:22:33', band: '6g', icon: '💻', signal: -42, down: '142.4 Mbps', up: '45.1 Mbps', paused: false },
            { name: 'iPhone 16 Pro Max', ip: '192.168.1.112', mac: 'DD:EE:FF:44:55:66', band: '6g', icon: '📱', signal: -48, down: '68.2 Mbps', up: '18.4 Mbps', paused: false },
            { name: 'iPad Pro M4', ip: '192.168.1.119', mac: '11:22:33:AA:BB:CC', band: '6g', icon: '📱', signal: -52, down: '24.1 Mbps', up: '4.2 Mbps', paused: false },
            { name: 'Smart TV LG OLED 65" 4K', ip: '192.168.1.140', mac: '44:55:66:DD:EE:FF', band: '5g', icon: '📺', signal: -58, down: '48.9 Mbps', up: '2.1 Mbps', paused: false },
            { name: 'PlayStation 5 Pro', ip: '192.168.1.155', mac: '77:88:99:11:22:33', band: '5g', icon: '🎮', signal: -54, down: '85.4 Mbps', up: '12.0 Mbps', paused: false },
            { name: 'Samsung Galaxy S24 Ultra', ip: '192.168.1.162', mac: '22:33:44:55:66:77', band: '5g', icon: '📱', signal: -50, down: '18.2 Mbps', up: '3.4 Mbps', paused: false },
            { name: 'Apple Watch Series 10', ip: '192.168.1.171', mac: '88:99:AA:BB:CC:DD', band: '2g', icon: '⌚', signal: -68, down: '0.4 Mbps', up: '0.1 Mbps', paused: false },
            { name: 'Lâmpada Inteligente Sala', ip: '192.168.1.201', mac: 'CC:DD:EE:FF:11:22', band: '2g', icon: '💡', signal: -72, down: '0.02 Mbps', up: '0.01 Mbps', paused: false },
            { name: 'Câmera Externa Garagem', ip: '192.168.1.205', mac: 'EE:FF:11:22:33:44', band: '2g', icon: '📷', signal: -64, down: '4.2 Mbps', up: '4.1 Mbps', paused: false },
            { name: 'Robô Aspirador Xiaomi', ip: '192.168.1.210', mac: '33:44:55:66:77:88', band: '2g', icon: '🤖', signal: -70, down: '0.1 Mbps', up: '0.05 Mbps', paused: false }
        ];

        function renderDevices(filter = 'all', query = '') {
            const tbody = document.getElementById('devices_tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const filtered = devicesList.filter(d => {
                const matchFilter = (filter === 'all') || (d.band === filter);
                const matchQuery = !query || d.name.toLowerCase().includes(query.toLowerCase()) || d.ip.includes(query) || d.mac.toLowerCase().includes(query.toLowerCase());
                return matchFilter && matchQuery;
            });

            filtered.forEach(d => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:1.3rem;">${d.icon}</span>
                            <div>
                                <strong style="color:#fff; display:block;">${d.name}</strong>
                                <span style="font-size:0.72rem; color:#94a3b8;">${d.band.toUpperCase()} • Alta Prioridade</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="font-family:monospace; color:#38bdf8;">${d.ip}</div>
                        <div style="font-family:monospace; font-size:0.72rem; color:#64748b;">${d.mac}</div>
                    </td>
                    <td>
                        <span class="stat-pill ${d.signal > -60 ? 'online' : ''}">${d.band.toUpperCase()} (${d.signal} dBm)</span>
                    </td>
                    <td style="color:#38bdf8; font-weight:750;">${d.down}</td>
                    <td style="color:#10b981; font-weight:750;">${d.up}</td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="ark-btn ark-btn-secondary" style="min-height:30px; padding:2px 8px; font-size:0.72rem;" onclick="openDeviceModal('${d.name}', '${d.ip}', '${d.mac}')">⚙️ Editar</button>
                            <button class="ark-btn ${d.paused ? 'ark-btn-primary' : 'ark-btn-danger'}" style="min-height:30px; padding:2px 8px; font-size:0.72rem;" onclick="toggleDevicePause('${d.mac}')">
                                ${d.paused ? '▶ Desbloquear' : '⏸ Pausar'}
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        function filterDevices(band) { renderDevices(band); }
        function searchDevices(query) { renderDevices('all', query); }

        function toggleDevicePause(mac) {
            const dev = devicesList.find(d => d.mac === mac);
            if (dev) {
                dev.paused = !dev.paused;
                renderDevices();
                showToast(dev.paused ? `⏸ Internet pausada para ${dev.name}` : `▶ Conexão liberada para ${dev.name}`);
            }
        }
        renderDevices();

        // Doctor Checks
        const doctorChecks = [
            "1. Conectividade WAN 1 (Gateway 177.142.88.1)",
            "2. Conectividade WAN 2 (Gateway 189.120.44.1)",
            "3. Roteamento e Balanceamento mwan3",
            "4. Resolução DNS Primária e Secundária",
            "5. Validação de Prefixo IPv6 (/64 Delegado)",
            "6. Auditoria de MTU (1492 no PPPoE, 1500 no Ethernet)",
            "7. Detecção de Falhas de NAT e Port Forward",
            "8. Firewall fw4: Ausência Total de Regras Legadas iptables",
            "9. Validação de Sintaxe nftables nas Cadeias de Forward",
            "10. Bloqueio de Portas Inseguras (Telnet / SMB na WAN)",
            "11. Estado do Rádio Wi-Fi 2.4 GHz (Canal 1 HE20)",
            "12. Estado do Rádio Wi-Fi 5 GHz (Canal 36 HE160 DFS)",
            "13. Estado do Rádio Wi-Fi 6 GHz (Canal 69 HE160 PSC)",
            "14. Blindagem WPA3-SAE (Sem conflito FT-SAE 802.11r)",
            "15. Ativação do Protocolo 802.11k (Neighbor Reports)",
            "16. Ativação do Protocolo 802.11v (BSS Transition WNM)",
            "17. Calibração Anti-Queda: disassoc_low_ack='0'",
            "18. Calibração do Band Steering usteer (-70 dBm)",
            "19. Integridade do Daemon hostapd (wpad-mbedtls)",
            "20. Limites de Fila SQM CAKE na WAN Principal",
            "21. Compensação de Framing (Zero Overhead FTTH)",
            "22. Escalonamento Multi-Core cake-mq (4 Cores)",
            "23. Lista Negra do AdBlock (248.910 domínios)",
            "24. Memória RAM Livre e Ausência de Memory Leaks",
            "25. Espaço Livre no Overlay RW da Flash MTD",
            "26. Temperatura dos Sensores Filogic (46°C)",
            "27. Daemon ubus e chamadas RPC sem timeout",
            "28. Serviços Essenciais em Execução (uhttpd, rpcd, odhcpd)"
        ];

        function renderDoctorChecks() {
            const cont = document.getElementById('doctor_checks_container');
            if (!cont) return;
            cont.innerHTML = '';
            doctorChecks.forEach(c => {
                const div = document.createElement('div');
                div.style.cssText = 'background:rgba(255,255,255,0.02); padding:10px 14px; border-radius:8px; border:1px solid var(--ark-border); display:flex; align-items:center; justify-content:space-between; font-size:0.82rem;';
                div.innerHTML = `<span>${c}</span> <strong style="color:#10b981;">✓ APROVADO</strong>`;
                cont.appendChild(div);
            });
        }
        renderDoctorChecks();

        function runDoctorAudit() {
            const badge = document.getElementById('doctor_badge');
            const txt = document.getElementById('doctor_status_text');
            badge.textContent = 'AUDITANDO...';
            badge.style.background = '#3b82f6';
            txt.textContent = 'Executando 28 testes de conformidade no roteador...';

            setTimeout(() => {
                badge.textContent = '28/28 OK';
                badge.style.background = '#10b981';
                txt.textContent = 'STATUS: SISTEMA 100% SAUDÁVEL E OTIMIZADO! (28/28 APROVADOS)';
                showToast('🩺 Ark Doctor: Todos os 28 checks foram validados com 100% de sucesso!');
            }, 1200);
        }

        // Smart Wi-Fi Enhancer Live Stepper
        let enhancerTimer = null;
        function startEnhancerLiveSimulation() {
            const btn = document.getElementById('enhancer_main_run_btn');
            if (btn) { btn.disabled = true; btn.textContent = '⏳ Executando em Tempo Real...'; }

            const stages = [
                { id: 1, name: 'PREFLIGHT', pct: 15, msg: 'Validando RAM disponível (512MB) e Flash livre (8.4MB)...' },
                { id: 2, name: 'CONNECTIVITY', pct: 30, msg: 'Verificando conexão com downloads.openwrt.org...' },
                { id: 3, name: 'PREPARING', pct: 45, msg: 'Atualizando catálogos de pacotes e removendo travas de dependência...' },
                { id: 4, name: 'INSTALLING', pct: 65, msg: 'Instalando pacote atômico wpad-mbedtls...' },
                { id: 5, name: 'VERIFYING', pct: 80, msg: 'Validando integridade dos binários hostapd e wpa_supplicant...' },
                { id: 6, name: 'CONFIGURING', pct: 92, msg: 'Ativando 802.11v BSS Transition e sincronizando disassoc_low_ack=0...' },
                { id: 7, name: 'COMPLETED', pct: 100, msg: 'Motor Wi-Fi wpad-mbedtls ativo com 802.11v! Otimização concluída com sucesso!' }
            ];

            let curIndex = 0;
            if (enhancerTimer) clearInterval(enhancerTimer);

            function step() {
                if (curIndex >= stages.length) {
                    clearInterval(enhancerTimer);
                    const b = document.getElementById('enhancer_status_badge');
                    if (b) { b.textContent = 'MOTOR PRO ATIVO'; b.style.background = '#10b981'; }
                    const pkg = document.getElementById('enhancer_page_cur_pkg');
                    if (pkg) { pkg.textContent = 'wpad-mbedtls (Completo)'; pkg.style.color = '#10b981'; }
                    if (btn) { btn.disabled = false; btn.textContent = '✓ Concluído com Sucesso'; btn.className = 'ark-btn ark-btn-primary'; }
                    showToast('🎉 Motor Wi-Fi 802.11v BSS Transition Otimizado com Sucesso!');
                    return;
                }

                const s = stages[curIndex];
                const b = document.getElementById('enhancer_status_badge');
                if (b) { b.textContent = 'Etapa ' + s.id + '/7: ' + s.name; b.style.background = '#3b82f6'; }
                const pbar = document.getElementById('enhancer_pbar');
                if (pbar) pbar.style.width = s.pct + '%';
                const msg = document.getElementById('enhancer_msg');
                if (msg) msg.textContent = s.msg;

                for (let i = 1; i <= stages.length; i++) {
                    const el = document.getElementById('s_step_' + i);
                    if (!el) continue;
                    if (i < s.id) {
                        el.className = 'step-item done';
                        el.querySelector('.step-icon').textContent = '✓';
                    } else if (i === s.id) {
                        el.className = 'step-item active';
                        el.querySelector('.step-icon').textContent = '▶';
                    } else {
                        el.className = 'step-item';
                        el.querySelector('.step-icon').textContent = i;
                    }
                }
                curIndex++;
            }
            step();
            enhancerTimer = setInterval(step, 800);
        }

        // Speedtest Multi-WAN Runner
        function runSpeedtest(wan) {
            showToast('⚡ Iniciando Speedtest no link ' + wan.toUpperCase() + '...');
            const downEl = document.getElementById('sp_down_val');
            const upEl = document.getElementById('sp_up_val');
            const pingEl = document.getElementById('sp_ping_val');

            downEl.innerHTML = '<span style="color:#06b6d4;">Testando...</span>';
            upEl.innerHTML = '<span style="color:#06b6d4;">Aguardando...</span>';

            setTimeout(() => {
                if (wan === 'wan1') {
                    downEl.innerHTML = '942.8 <small>Mbps</small>';
                    upEl.innerHTML = '488.2 <small>Mbps</small>';
                    pingEl.innerHTML = '4.2 <small>ms</small>';
                    showToast('✅ Teste WAN 1 concluído: 942.8 Mbps Down / 488.2 Mbps Up!');
                } else {
                    downEl.innerHTML = '298.4 <small>Mbps</small>';
                    upEl.innerHTML = '48.1 <small>Mbps</small>';
                    pingEl.innerHTML = '14.8 <small>ms</small>';
                    showToast('✅ Teste WAN 2 concluído: 298.4 Mbps Down / 48.1 Mbps Up!');
                }
            }, 1800);
        }

        // DMZ Toggle Handler
        function toggleDmzSwitch(input) {
            const badge = document.getElementById('dmz_status_badge');
            if (input.checked) {
                badge.textContent = 'DMZ ATIVO (192.168.1.155)';
                badge.style.color = '#10b981';
                badge.style.borderColor = '#10b981';
                showToast('⚠️ DMZ Ativada para o IP 192.168.1.155 (PlayStation 5 Pro)');
            } else {
                badge.textContent = 'DMZ DESLIGADO';
                badge.style.color = '#f59e0b';
                badge.style.borderColor = '#f59e0b';
                showToast('DMZ Desativada com sucesso.');
            }
        }

        function toggleGenericSwitch(input, label) {
            showToast(`${label}: ${input.checked ? 'Ativado' : 'Desativado'}`);
        }

        function runAdblockUpdate() {
            showToast('🔄 Atualizando 248.910 domínios na lista negra do AdBlock...');
            setTimeout(() => {
                showToast('✅ Listas do AdBlock atualizadas e compiladas no nftables!');
            }, 1600);
        }

        function generateBackupDownload() {
            showToast('💾 Gerando arquivo de backup das configurações (.tar.gz)...');
            setTimeout(() => {
                showToast('✅ Download do backup concluído: ark_backup_2026.tar.gz');
            }, 1000);
        }

        // =========================================================
        // COMPLETE MODAL CONTROLLERS (100% WIRED & WORKING)
        // =========================================================
        function openModal(type, data) {
            document.body.classList.add('modal-overlay-active');
            document.getElementById('modal_overlay').classList.remove('inactive');
            const cont = document.getElementById('modal_container');

            if (type === 'setup') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>⚡ Assistente de Configuração Rápida (Ark Setup)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <p style="font-size:0.85rem; color:#94a3b8; margin-bottom:14px;">Configure sua conexão de operadora e Wi-Fi em apenas 3 passos:</p>
                    <div class="form-group">
                        <label class="form-label">Tipo de Conexão com a Internet</label>
                        <select class="form-select" id="setup_proto">
                            <option value="pppoe" selected>Fibra Óptica PPPoE (Vivo, Oi, Desktop, Vero)</option>
                            <option value="dhcp">DHCP Automático (Claro, Starlink, Roteador Secundário)</option>
                            <option value="ap">Modo Ponto de Acesso / Ponte (Desativa Roteamento)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome da Rede Wi-Fi (SSID)</label>
                        <input type="text" class="form-input" id="setup_ssid" value="Wi-Fi-H&R">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Senha do Wi-Fi</label>
                        <input type="password" class="form-input" id="setup_pass" value="MinhaSenhaForte2026">
                    </div>
                    <div class="form-actions">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveSetupModal()">💾 Salvar e Aplicar</button>
                    </div>
                `;
            } else if (type === 'wifi') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📶 Configurar Redes Wi-Fi (2.4 / 5 / 6 GHz)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome da Rede Wi-Fi (SSID)</label>
                        <input type="text" class="form-input" id="modal_wifi_ssid" value="Wi-Fi-H&R">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Senha da Rede (Mínimo 8 dígitos)</label>
                        <input type="password" class="form-input" id="modal_wifi_pass" value="MinhaSenhaForte2026">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Modo de Criptografia</label>
                        <select class="form-select">
                            <option selected>WPA3-SAE / WPA2-PSK Misto + PMF (Recomendado)</option>
                            <option>WPA3-SAE Puro (Máxima Segurança Wi-Fi 6E/7)</option>
                            <option>WPA2-PSK Legado</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveWifiModal()">💾 Salvar e Atualizar Rádios</button>
                    </div>
                `;
            } else if (type === 'wifi_guest') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>👥 Rede Wi-Fi de Visitantes (Guest Network)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome da Rede de Visitantes</label>
                        <input type="text" class="form-input" id="modal_guest_ssid" value="Wi-Fi-Visitantes">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Senha de Visitantes</label>
                        <input type="text" class="form-input" id="modal_guest_pass" value="Visita2026">
                    </div>
                    <div class="toggle-row">
                        <div>
                            <span class="toggle-title">Isolar Clientes da Rede Local (LAN)</span>
                            <span class="toggle-desc">Impede que visitantes acessem computadores, impressoras e câmeras da casa.</span>
                        </div>
                        <label class="ark-switch">
                            <input type="checkbox" checked>
                            <span class="ark-slider"></span>
                        </label>
                    </div>
                    <div class="form-actions">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-purple" onclick="closeModal(); showToast('👥 Rede de Visitantes configurada e isolada!')">💾 Aplicar Rede de Visitantes</button>
                    </div>
                `;
            } else if (type === 'wifi_qr') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📲 Conectar via QR Code (EasyConnect)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div style="text-align:center; padding:16px 0;">
                        <div style="display:inline-block; padding:16px; background:#fff; border-radius:12px;">
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
                        <h4 style="margin:14px 0 4px; color:#fff;" id="qr_ssid_label">Wi-Fi-H&R</h4>
                        <p style="font-size:0.8rem; color:#94a3b8;">Aponte a câmera do celular para conectar instantaneamente sem digitar a senha.</p>
                    </div>
                    <div class="form-actions">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    </div>
                `;
            } else if (type === 'wps') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🤝 Conectar Dispositivo via WPS (Push Button)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <p style="font-size:0.85rem; color:#cbd5e1; line-height:1.4;">
                        Pressione o botão virtual abaixo e, em seguida, pressione o botão WPS na sua impressora ou repetidor dentro de 2 minutos.
                    </p>
                    <div style="text-align:center; padding:20px 0;">
                        <button class="ark-btn ark-btn-primary" style="padding:12px 28px; font-size:1rem;" onclick="closeModal(); showToast('🤝 Pareamento WPS ativado por 120 segundos!')">
                            🔘 Disparar Pareamento WPS (PBC)
                        </button>
                    </div>
                    <div class="form-actions">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    </div>
                `;
            } else if (type === 'sqm') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🛡️ Ajustar Limites de Velocidade (SQM CAKE)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Velocidade Contratada de Download (Mbps)</label>
                        <input type="number" class="form-input" id="modal_sqm_down" value="850">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Velocidade Contratada de Upload (Mbps)</label>
                        <input type="number" class="form-input" id="modal_sqm_up" value="450">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Perfil de Compensação de Framing</label>
                        <select class="form-select">
                            <option selected>Fibra Óptica FTTH (0 bytes de overhead)</option>
                            <option>GPON / VDSL (28 bytes de overhead)</option>
                            <option>Cabo Coaxial DOCSIS (18 bytes de overhead)</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveSqmModal()">💾 Aplicar Regras CAKE</button>
                    </div>
                `;
            } else if (type === 'reboot') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3 style="color:#ef4444;">🔄 Reiniciar Roteador com Segurança</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <p style="font-size:0.85rem; color:#cbd5e1; line-height:1.5;">
                        Deseja realmente reiniciar o roteador? A conexão de todos os 34 aparelhos será pausada por aproximadamente 45 segundos.
                    </p>
                    <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:10px; padding:12px; margin:14px 0;">
                        <span style="font-size:0.78rem; color:#ef4444; font-weight:750;">⚠️ Trava de Segurança Ativa:</span>
                        <p style="margin:4px 0 0; font-size:0.75rem; color:#cbd5e1;">O botão de confirmação permanecerá travado por 2 segundos para evitar cliques acidentais no celular.</p>
                    </div>
                    <div class="form-actions">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-danger" id="reboot_confirm_btn" disabled onclick="executeReboot()">Confirmar (2s)...</button>
                    </div>
                `;
                setTimeout(() => {
                    const btn = document.getElementById('reboot_confirm_btn');
                    if (btn) { btn.disabled = false; btn.textContent = 'Sim, Reiniciar Agora'; }
                }, 2000);
            } else if (type === 'led_control') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>💡 Controle de LEDs do Hardware</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Perfil de Iluminação</label>
                        <select class="form-select" id="modal_led_mode">
                            <option value="traffic" selected>Tráfego Inteligente (Pisca suave em download/upload)</option>
                            <option value="stealth">Modo Furtivo / Noturno (Todos os LEDs desligados)</option>
                            <option value="static">Ligado Estático (Apenas indicação de status)</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveLedModal()">💾 Aplicar LEDs</button>
                    </div>
                `;
            } else if (type === 'theme_picker') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🎨 Personalização de Tema Visual</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tema da Interface</label>
                        <select class="form-select">
                            <option selected>ARK Router Cyber Dark (Padrão)</option>
                            <option>Argon Deep Blue</option>
                            <option>OpenWrt Bootstrap Clássico</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="closeModal(); showToast('🎨 Tema visual aplicado com sucesso!')">💾 Aplicar Tema</button>
                    </div>
                `;
            } else if (type === 'starlink_config') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🛰️ Configurações da Antena Starlink</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">IP da Antena Dishy (gRPC)</label>
                        <input type="text" class="form-input" value="192.168.100.1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Degelo de Neve (Snow Melt)</label>
                        <select class="form-select">
                            <option selected>Automático</option>
                            <option>Desativado (Economia de Energia)</option>
                            <option>Forçado Máximo</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="closeModal(); showToast('🛰️ Configurações Starlink salvas!')">💾 Salvar Starlink</button>
                    </div>
                `;
            } else if (type === 'add_vpn') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🔒 Adicionar Túnel WireGuard</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome da Conexão</label>
                        <input type="text" class="form-input" value="wg1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Chave Privada (Private Key)</label>
                        <input type="password" class="form-input" placeholder="Cole sua chave privada WireGuard...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Servidor Endpoint (IP:Porta)</label>
                        <input type="text" class="form-input" placeholder="ex: vpn.servidor.com:51820">
                    </div>
                    <div class="form-actions">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-purple" onclick="closeModal(); showToast('🔒 Túnel WireGuard cadastrado e ativado!')">💾 Conectar VPN</button>
                    </div>
                `;
            } else if (type === 'port_forward') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>➕ Adicionar Regra de Redirecionamento de Porta (NAT)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome da Regra</label>
                        <input type="text" class="form-input" placeholder="ex: Servidor Web / Jogo">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Porta Externa WAN</label>
                        <input type="number" class="form-input" placeholder="ex: 8080">
                    </div>
                    <div class="form-group">
                        <label class="form-label">IP Interno do Dispositivo</label>
                        <input type="text" class="form-input" placeholder="ex: 192.168.1.105">
                    </div>
                    <div class="form-actions">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="closeModal(); showToast('✅ Regra de porta NAT aplicada no nftables!')">💾 Adicionar Regra</button>
                    </div>
                `;
            }
        }

        function closeModal() {
            document.body.classList.remove('modal-overlay-active');
            document.getElementById('modal_overlay').classList.add('inactive');
        }

        function openWanModal(name, proto, provider, mtu) {
            document.body.classList.add('modal-overlay-active');
            document.getElementById('modal_overlay').classList.remove('inactive');
            const cont = document.getElementById('modal_container');
            cont.innerHTML = `
                <div class="modal-header">
                    <h3>🌐 Editar Conexão — ${name} (${provider})</h3>
                    <button class="modal-close-btn" onclick="closeModal()">✕</button>
                </div>
                <div class="form-group">
                    <label class="form-label">Protocolo de Conexão</label>
                    <select class="form-select" id="m_wan_proto">
                        <option value="pppoe" ${proto === 'pppoe' ? 'selected' : ''}>PPPoE (Login / Senha de Provedor)</option>
                        <option value="dhcp" ${proto === 'dhcp' ? 'selected' : ''}>DHCP Cliente (Automático)</option>
                        <option value="static">IP Estático Fixo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Tamanho Máximo de Pacote (MTU)</label>
                    <input type="number" class="form-input" id="m_wan_mtu" value="${mtu}">
                </div>
                <div class="form-group">
                    <label class="form-label">Servidores DNS Personalizados</label>
                    <input type="text" class="form-input" value="1.1.1.1, 8.8.8.8">
                </div>
                <div class="form-actions">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="saveWanModal('${name}')">💾 Salvar e Aplicar</button>
                </div>
            `;
        }

        function openRadioModal(band, channel, width, power) {
            document.body.classList.add('modal-overlay-active');
            document.getElementById('modal_overlay').classList.remove('inactive');
            const cont = document.getElementById('modal_container');
            cont.innerHTML = `
                <div class="modal-header">
                    <h3>📶 Configurar Rádio — ${band}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">✕</button>
                </div>
                <div class="form-group">
                    <label class="form-label">Canal de Operação</label>
                    <input type="text" class="form-input" id="m_radio_ch" value="${channel}">
                </div>
                <div class="form-group">
                    <label class="form-label">Largura de Banda</label>
                    <input type="text" class="form-input" id="m_radio_width" value="${width}">
                </div>
                <div class="form-group">
                    <label class="form-label">Potência de Transmissão (dBm)</label>
                    <input type="number" class="form-input" id="m_radio_tx" value="${power}">
                </div>
                <div class="form-actions">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="saveRadioModal('${band}')">💾 Salvar Rádio</button>
                </div>
            `;
        }

        function openDeviceModal(name, ip, mac) {
            document.body.classList.add('modal-overlay-active');
            document.getElementById('modal_overlay').classList.remove('inactive');
            const cont = document.getElementById('modal_container');
            cont.innerHTML = `
                <div class="modal-header">
                    <h3>📱 Gerenciar Dispositivo — ${name}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">✕</button>
                </div>
                <div class="form-group">
                    <label class="form-label">Nome Amigável do Aparelho</label>
                    <input type="text" class="form-input" id="m_dev_name" value="${name}">
                </div>
                <div class="form-group">
                    <label class="form-label">Endereço IP Fixo (Reserva DHCP)</label>
                    <input type="text" class="form-input" id="m_dev_ip" value="${ip}">
                </div>
                <div class="form-group">
                    <label class="form-label">Endereço MAC Físico</label>
                    <input type="text" class="form-input" value="${mac}" readonly style="opacity:0.6;">
                </div>
                <div class="form-actions">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="saveDeviceModal('${mac}')">💾 Salvar Dispositivo</button>
                </div>
            `;
        }

        // Save Handlers
        function saveSetupModal() {
            const ssid = document.getElementById('setup_ssid').value;
            const overviewSsid = document.getElementById('overview_ssid_label');
            if (overviewSsid) overviewSsid.textContent = ssid + ' (2.4G/5G/6G)';
            closeModal();
            showToast('✅ Configurações iniciais aplicadas com sucesso!');
        }

        function saveWifiModal() {
            const ssid = document.getElementById('modal_wifi_ssid').value;
            const overviewSsid = document.getElementById('overview_ssid_label');
            if (overviewSsid) overviewSsid.textContent = ssid + ' (2.4G/5G/6G)';
            const qrSsid = document.getElementById('qr_ssid_label');
            if (qrSsid) qrSsid.textContent = ssid;
            closeModal();
            showToast('✅ Redes Wi-Fi atualizadas e rádios sincronizados!');
        }

        function saveWanModal(name) {
            const proto = document.getElementById('m_wan_proto').value;
            const mtu = document.getElementById('m_wan_mtu').value;
            if (name === 'WAN 1') {
                document.getElementById('wan1_proto_val').textContent = proto.toUpperCase();
                document.getElementById('wan1_mtu_val').textContent = mtu;
            } else {
                document.getElementById('wan2_proto_val').textContent = proto.toUpperCase();
                document.getElementById('wan2_mtu_val').textContent = mtu;
            }
            closeModal();
            showToast('✅ Conexão ' + name + ' atualizada e aplicada!');
        }

        function saveRadioModal(band) {
            const ch = document.getElementById('m_radio_ch').value;
            if (band === '2.4 GHz') document.getElementById('wifi_ch_2g').textContent = 'Canal ' + ch;
            else if (band === '5 GHz') document.getElementById('wifi_ch_5g').textContent = 'Canal ' + ch;
            else if (band === '6 GHz') document.getElementById('wifi_ch_6g').textContent = 'Canal ' + ch;
            closeModal();
            showToast('✅ Rádio ' + band + ' recalibrado para o Canal ' + ch);
        }

        function saveDeviceModal(mac) {
            const name = document.getElementById('m_dev_name').value;
            const ip = document.getElementById('m_dev_ip').value;
            const dev = devicesList.find(d => d.mac === mac);
            if (dev) {
                dev.name = name;
                dev.ip = ip;
                renderDevices();
            }
            closeModal();
            showToast('✅ Reserva de IP salva para ' + name);
        }

        function saveSqmModal() {
            const down = document.getElementById('modal_sqm_down').value;
            const up = document.getElementById('modal_sqm_up').value;
            document.getElementById('sqm_val_down').textContent = down + ' Mbps (95% da banda)';
            document.getElementById('sqm_val_up').textContent = up + ' Mbps (95% da banda)';
            closeModal();
            showToast('✅ Limites SQM CAKE atualizados com sucesso!');
        }

        function saveLedModal() {
            const mode = document.getElementById('modal_led_mode').value;
            const desc = document.getElementById('led_mode_desc');
            if (mode === 'stealth') desc.textContent = 'Modo Furtivo / Noturno (Todos os LEDs desligados).';
            else if (mode === 'traffic') desc.textContent = 'Modo Tráfego Dinâmico (Pisca suave conforme tráfego).';
            else desc.textContent = 'Modo Estático (Apenas indicação de status).';
            closeModal();
            showToast('💡 Perfil de LEDs atualizado no hardware!');
        }

        function executeReboot() {
            closeModal();
            showToast('🔄 Reiniciando roteador... Aguarde a reconexão em 45s.');
        }

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeModal();
                const drawer = document.getElementById('luci_drawer');
                if (drawer && drawer.classList.contains('open')) toggleLuciDrawer();
            }
        });

        // Toast Helper
        function showToast(msg) {
            const t = document.getElementById('toast_notify');
            if (!t) return;
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3500);
        }
    </script>
</body>
</html>
'''

with open(TARGET_FILE, "w", encoding="utf-8") as f:
    f.write(html_content)

print("Comprehensive V2 Flagship Dashboard generated successfully!")
