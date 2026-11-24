#!/usr/bin/env python3
"""
ARK Router — Real Visual Capture & UI Audit Runner (macOS / Linux / CI).

Supports two pixel-faithful modes using Playwright Chromium (HiDPI 2x):
  1. --mode offline (default):
     Mounts the REAL compiled overview.js, overview.css, cascade.css, mobile.css,
     ark-theme.js, ark-guides.js and i18n.*.js inside the exact LuCI ARK shell
     (matching header.ut/footer.ut) via a faithful LuCI runtime shim backed by
     scripts/fixtures/ark_ui_snapshot.json. Zero synthetic fake UI cards.
  2. --mode live --url <http(s)://...>:
     Connects strictly read-only to a real OpenWrt VM or router, logs into LuCI,
     masks PII by default (--mask-pii), and captures the live rendered dashboard
     panels, modals and native LuCI themed pages.
"""

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import sys
import threading
import time
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parents[1]
STATIC_ROOT = REPO / "root" / "www" / "luci-static"
DEFAULT_FIXTURE = REPO / "scripts" / "fixtures" / "ark_ui_snapshot.json"
DEFAULT_OUT = REPO / "docs" / "screenshots" / "visual_audit"

VIEWPORT_PRESETS = {
    "desktop": {"width": 1440, "height": 900, "device_scale_factor": 2, "is_mobile": False, "has_touch": False},
    "mobile": {"width": 390, "height": 844, "device_scale_factor": 2, "is_mobile": True, "has_touch": True},
    "tablet": {"width": 768, "height": 1024, "device_scale_factor": 2, "is_mobile": True, "has_touch": True},
}

PANEL_NAV_SELECTORS = {
    "cockpit": "#ex-v2-nav-cockpit",
    "wan": "#ex-v2-nav-wan",
    "wifi": "#ex-v2-nav-wifi",
    "devices": "#ex-v2-nav-devices",
    "sqm_perf": "#ex-v2-nav-sqm_perf",
    "adblock": "#ex-v2-nav-adblock",
    "wireguard": "#ex-v2-nav-wireguard",
    "all": "#ex-v2-nav-all",
}


def _read_version():
    vpath = REPO / "VERSION"
    if vpath.exists():
        return vpath.read_text(encoding="utf-8").strip()
    return "2.2.15"


def _build_traffic_history_csv(now_ts):
    lines = []
    points = 60
    start_ts = now_ts - points * 600
    for i in range(points):
        t = start_ts + i * 600
        wave = 0.55 + 0.45 * math.sin(i / 5.5) + 0.25 * math.cos(i / 2.3)
        down_bps = int(max(12_000_000, 145_000_000 * wave))
        up_bps = int(max(4_000_000, 38_000_000 * (0.6 + 0.4 * math.cos(i / 4.2))))
        lines.append(f"{t},{down_bps},{up_bps}")
    return "\n".join(lines) + "\n"


def _build_wan_daily_csv(now_ts):
    day = time.strftime("%Y-%m-%d", time.localtime(now_ts))
    return f"{day},wan,19438291040,4829104120\n{day},wan2,2140982100,512981200\n"


def _build_arp_table(fixture):
    rows = ["IP address       HW type     Flags       HW address            Mask     Device"]
    for lease in fixture.get("dhcp_leases", {}).get("dhcp_leases", []):
        ip = lease.get("ipaddr", "")
        mac = lease.get("macaddr", "").lower()
        if ip and mac:
            rows.append(f"{ip:<16} 0x1         0x2         {mac}     *        br-lan")
    return "\n".join(rows) + "\n"


LUCI_RUNTIME_SHIM_JS = r"""
(function() {
  'use strict';

  function isElement(node) {
    return node instanceof Node;
  }

  function appendChildSmart(parent, child) {
    if (child == null || child === false || child === true) return;
    if (Array.isArray(child)) {
      for (var i = 0; i < child.length; i++) appendChildSmart(parent, child[i]);
      return;
    }
    if (isElement(child)) {
      parent.appendChild(child);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
    }
  }

  function applyAttr(el, key, val) {
    if (val === undefined || val === null || val === false) {
      el.removeAttribute(key);
      return;
    }
    if (typeof val === 'function') {
      el.addEventListener(key, val);
      return;
    }
    if (key === 'style' && typeof val === 'object') {
      Object.assign(el.style, val);
      return;
    }
    if (key === 'class' || key === 'className') {
      el.setAttribute('class', String(val));
      return;
    }
    if (key === 'value' && ('value' in el)) {
      el.value = String(val);
      el.setAttribute('value', String(val));
      return;
    }
    if (key === 'checked' && ('checked' in el)) {
      el.checked = !!val;
      if (val) el.setAttribute('checked', 'checked');
      else el.removeAttribute('checked');
      return;
    }
    if (key === 'disabled' && ('disabled' in el)) {
      el.disabled = !!val;
      if (val) el.setAttribute('disabled', 'disabled');
      else el.removeAttribute('disabled');
      return;
    }
    if (key === 'selected' && ('selected' in el)) {
      el.selected = !!val;
      if (val) el.setAttribute('selected', 'selected');
      else el.removeAttribute('selected');
      return;
    }
    if (val === true) {
      el.setAttribute(key, '');
      return;
    }
    el.setAttribute(key, String(val));
  }

  window.E = function(tag, attrs, children) {
    var htmlTag = tag;
    if (arguments.length === 2 && (Array.isArray(attrs) || typeof attrs === 'string' || typeof attrs === 'number' || isElement(attrs))) {
      children = attrs;
      attrs = {};
    }
    var el;
    if (htmlTag === 'svg' || htmlTag === 'path' || htmlTag === 'circle' || htmlTag === 'rect' || htmlTag === 'line' || htmlTag === 'polyline' || htmlTag === 'polygon' || htmlTag === 'g') {
      el = document.createElementNS('http://www.w3.org/2000/svg', htmlTag);
    } else if (typeof htmlTag === 'string') {
      el = document.createElement(htmlTag);
    } else if (isElement(htmlTag)) {
      el = htmlTag;
    } else {
      el = document.createElement('div');
    }
    if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
      var keys = Object.keys(attrs);
      for (var i = 0; i < keys.length; i++) {
        applyAttr(el, keys[i], attrs[keys[i]]);
      }
    }
    if (children !== undefined) appendChildSmart(el, children);
    return el;
  };

  window._ = function(s) { return s; };
  window.N_ = function(n, s, p) { return n === 1 ? s : p; };

  function DomProto() {}
  DomProto.prototype.attr = function(node, key, val) {
    if (!node) return null;
    if (typeof key === 'object' && key !== null) {
      Object.keys(key).forEach(function(k) { applyAttr(node, k, key[k]); });
      return node;
    }
    if (arguments.length < 3) return node.getAttribute(key);
    applyAttr(node, key, val);
    return node;
  };
  DomProto.prototype.content = function(node, children) {
    if (!node) return null;
    while (node.firstChild) node.removeChild(node.firstChild);
    appendChildSmart(node, children);
    return node;
  };
  DomProto.prototype.append = function(node, children) {
    if (!node) return null;
    appendChildSmart(node, children);
    return node;
  };
  DomProto.prototype.create = function(tag, attrs, children) {
    return window.E(tag, attrs, children);
  };
  DomProto.prototype.isEmpty = function(node) {
    return !node || !node.firstChild;
  };
  var domMod = new DomProto();

  var uiMod = {
    showModal: function(title, children) {
      var overlay = document.getElementById('modal_overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal_overlay';
        document.body.appendChild(overlay);
      }
      overlay.innerHTML = '';
      var extraClasses = Array.prototype.slice.call(arguments, 2).filter(Boolean).join(' ');
      var modal = window.E('div', { class: ('modal cbi-modal ' + extraClasses).trim(), role: 'dialog', 'aria-modal': 'true' }, [
        title ? window.E('h4', {}, [title]) : null,
        children
      ]);
      overlay.appendChild(modal);
      overlay.style.display = 'flex';
      document.body.classList.add('modal-overlay-active');
      return modal;
    },
    hideModal: function() {
      var overlay = document.getElementById('modal_overlay');
      if (overlay) {
        overlay.innerHTML = '';
        overlay.style.display = 'none';
      }
      document.body.classList.remove('modal-overlay-active');
    },
    addNotification: function(title, children, cls) {
      var box = document.getElementById('ark-toast-host');
      if (!box) {
        box = window.E('div', { id: 'ark-toast-host', style: 'position:fixed;top:16px;right:16px;z-index:9999;max-width:380px;' });
        document.body.appendChild(box);
      }
      var el = window.E('div', { class: 'alert-message ' + (cls || 'notice') }, [
        title ? window.E('h4', {}, [title]) : null,
        children
      ]);
      box.appendChild(el);
      return el;
    },
    uploadFile: function() { return Promise.resolve({ name: 'mock.bin', size: 0 }); }
  };

  var pollMod = {
    _tasks: [],
    add: function(fn, interval) { this._tasks.push({ fn: fn, interval: interval || 5 }); },
    remove: function(fn) { this._tasks = this._tasks.filter(function(t) { return t.fn !== fn; }); },
    start: function() {},
    stop: function() {},
    active: function() { return true; }
  };

  var rpcMod = {
    declare: function(spec) {
      return function() {
        var callArgs = Array.prototype.slice.call(arguments);
        var mapped = {};
        if (Array.isArray(spec.params)) {
          spec.params.forEach(function(k, idx) {
            if (callArgs[idx] !== undefined) mapped[k] = callArgs[idx];
          });
        }
        return fetch('/__ark_mock__/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ object: spec.object, method: spec.method, params: mapped })
        }).then(function(r) { return r.json(); });
      };
    }
  };

  var fsMod = {
    exec: function(cmd, args) {
      return fetch('/__ark_mock__/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: cmd, args: args || [] })
      }).then(function(r) { return r.json(); });
    },
    exec_direct: function(cmd, args, format) {
      return fsMod.exec(cmd, args).then(function(res) {
        if (format === 'json') {
          try { return JSON.parse(res.stdout || '{}'); } catch(e) { return {}; }
        }
        return res.stdout || '';
      });
    },
    read: function(path) {
      return fetch('/__ark_mock__/read?path=' + encodeURIComponent(path))
        .then(function(r) { return r.text(); });
    }
  };

  var viewMod = {
    extend: function(proto) {
      return Object.assign({
        load: function() { return Promise.resolve([]); },
        render: function() { return window.E('div'); }
      }, proto);
    }
  };

  window.L = {
    env: { lang: document.documentElement.lang || 'pt-br', media: '/luci-static/ark', resource: '/luci-static/resources' },
    bind: function(fn, self) {
      var extra = Array.prototype.slice.call(arguments, 2);
      return function() {
        var args = extra.concat(Array.prototype.slice.call(arguments));
        return fn.apply(self, args);
      };
    },
    url: function() {
      var parts = Array.prototype.slice.call(arguments).filter(Boolean).map(function(s) {
        return String(s).replace(/^\/+|\/+$/g, '');
      });
      return '/cgi-bin/luci/' + parts.join('/');
    },
    resource: function(rel) {
      return '/luci-static/resources/' + String(rel || '').replace(/^\/+/, '');
    },
    resolveDefault: function(promise, fallback) {
      return Promise.resolve(promise).then(function(v) {
        return (v === undefined || v === null) ? fallback : v;
      }, function() {
        return fallback;
      });
    },
    createObjectURL: function(blob) { return URL.createObjectURL(blob); },
    revokeObjectURL: function(url) { return URL.revokeObjectURL(url); },
    require: function(name) {
      if (name === 'menu-bootstrap') return Promise.resolve();
      return Promise.resolve({});
    },
    ui: uiMod,
    dom: domMod
  };

  window.__arkMountRealOverview = function() {
    var mount = document.getElementById('view');
    if (!mount) return Promise.resolve();
    return fetch('/luci-static/resources/view/equipe-dashboard/overview.js')
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' loading overview.js');
        return r.text();
      })
      .then(function(src) {
        var cleaned = src.replace(/^\s*['"]require\s+[^'"]+['"];?\s*$/gm, '');
        var factory = new Function('view', 'dom', 'rpc', 'poll', 'fs', 'ui', cleaned);
        var instance = factory(viewMod, domMod, rpcMod, pollMod, fsMod, uiMod);
        return Promise.resolve(instance.load()).then(function(loaded) {
          var rendered = instance.render(loaded);
          mount.innerHTML = '';
          appendChildSmart(mount, rendered);
          if (typeof instance.update === 'function' && loaded && loaded[3]) {
            try { instance.update(loaded[3]); } catch (e) { console.error('[visual_capture] initial update error:', e); }
          }
          window.__arkOverviewMounted = true;
          return instance;
        });
      });
  };
})();
"""


def _render_shell_html(route_path, ark_version, lang="pt-br"):
    lang_cls = "lang_pt" if lang.startswith("pt") else f"lang_{lang[:2]}"
    data_page = route_path.strip("/").replace("/", "-")
    is_dashboard = "equipe-dashboard" in route_path

    native_content = ""
    if not is_dashboard:
        if "firewall" in route_path:
            native_content = """
            <div class="cbi-map" id="cbi-firewall">
              <h2>Firewall — Configurações de Zona</h2>
              <div class="cbi-map-descr">O firewall cria zonas sobre suas interfaces de rede para controlar o tráfego de entrada, saída e encaminhamento.</div>
              <ul class="cbi-tabmenu">
                <li class="cbi-tab"><a href="#">Configurações Gerais</a></li>
                <li class="cbi-tab-disabled"><a href="#">Redirecionamento de Portas</a></li>
                <li class="cbi-tab-disabled"><a href="#">Regras de Tráfego</a></li>
                <li class="cbi-tab-disabled"><a href="#">Regras NAT</a></li>
              </ul>
              <div class="cbi-section">
                <h3>Zonas</h3>
                <table class="table cbi-section-table">
                  <tr class="tr table-titles">
                    <th class="th">Zona ⇒ Encaminhamento</th>
                    <th class="th">Entrada</th>
                    <th class="th">Saída</th>
                    <th class="th">Encaminhamento</th>
                    <th class="th">Mascaramento</th>
                    <th class="th cbi-section-actions">Ações</th>
                  </tr>
                  <tr class="tr cbi-rowstyle-1">
                    <td class="td"><span class="zonebadge" style="background-color:#90f090"><strong>lan</strong>: br-lan</span> ⇒ <span class="zonebadge" style="background-color:#f09090"><strong>wan</strong></span></td>
                    <td class="td">aceitar</td>
                    <td class="td">aceitar</td>
                    <td class="td">aceitar</td>
                    <td class="td"><input type="checkbox"></td>
                    <td class="td cbi-section-actions"><button type="button" class="btn cbi-button cbi-button-edit">Editar</button></td>
                  </tr>
                  <tr class="tr cbi-rowstyle-2">
                    <td class="td"><span class="zonebadge" style="background-color:#f09090"><strong>wan</strong>: pppoe-wan, lan4</span> ⇒ REJECT</td>
                    <td class="td">rejeitar</td>
                    <td class="td">aceitar</td>
                    <td class="td">rejeitar</td>
                    <td class="td"><input type="checkbox" checked></td>
                    <td class="td cbi-section-actions"><button type="button" class="btn cbi-button cbi-button-edit">Editar</button></td>
                  </tr>
                </table>
              </div>
              <div class="cbi-page-actions">
                <button type="button" class="btn cbi-button cbi-button-apply">Salvar &amp; Aplicar</button>
                <button type="button" class="btn cbi-button cbi-button-save">Salvar</button>
                <button type="button" class="btn cbi-button cbi-button-reset">Descartar</button>
              </div>
            </div>
            """
        else:
            native_content = """
            <div class="cbi-map">
              <h2>Status — Visão Geral do Sistema</h2>
              <div class="cbi-section">
                <h3>Sistema</h3>
                <div class="table">
                  <div class="tr"><div class="td left" width="33%">Hostname</div><div class="td left">ARK-W6x</div></div>
                  <div class="tr"><div class="td left">Modelo</div><div class="td left">Acer Predator Connect W6x (Stock Layout)</div></div>
                  <div class="tr"><div class="td left">Arquitetura</div><div class="td left">ARMv8 Processor rev 4 (MediaTek Filogic 830)</div></div>
                  <div class="tr"><div class="td left">Versão do Firmware</div><div class="td left">OpenWrt 25.12.6 r33311-981c978eff / ARK Router """ + ark_version + """</div></div>
                  <div class="tr"><div class="td left">Versão do Kernel</div><div class="td left">6.12.28</div></div>
                </div>
              </div>
            </div>
            """

    boot_script = (
        "<script>window.addEventListener('DOMContentLoaded', function(){ window.__arkMountRealOverview(); });</script>"
        if is_dashboard
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="{lang}" data-darkmode="true">
<head>
  <meta charset="utf-8">
  <title>ARK-W6x | ARK Router</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#0f172a">
  <link rel="stylesheet" href="/luci-static/ark/cascade.css?v={ark_version}">
  <link rel="stylesheet" media="only screen and (max-width: 854px)" href="/luci-static/ark/mobile.css?v={ark_version}" />
  <link rel="icon" href="/luci-static/ark/favicon.png">
  <script>
    window.ARK_VERSION = "{ark_version}";
    window.ARK_ASSET_REV = "{ark_version}-offline";
  </script>
  <script src="/__ark_mock__/luci-shim.js"></script>
  <script src="/luci-static/ark/ark-theme.js?v={ark_version}"></script>
</head>
<body class="{lang_cls} ark-app-page ark-theme" data-page="{data_page}">
  <div class="ark-mobile-bar">
    <button type="button" class="ark-menu-toggle" id="ark-menu-toggle" aria-label="Menu">
      <span class="ark-burger-line"></span>
      <span class="ark-burger-line"></span>
      <span class="ark-burger-line"></span>
    </button>
    <a class="brand ark-brand" href="/cgi-bin/luci/admin/equipe-dashboard">
      <span class="ark-brand-icon">⚡</span>
      <span class="ark-brand-name">ARK <span class="ark-brand-accent">Router</span></span>
    </a>
    <div class="ark-mobile-spacer"></div>
  </div>

  <div class="ark-sidebar-backdrop" id="ark-sidebar-backdrop"></div>

  <aside class="ark-sidebar" id="ark-sidebar">
    <div class="ark-sidebar-header">
      <a class="brand ark-brand" href="/cgi-bin/luci/admin/equipe-dashboard">
        <span class="ark-brand-icon">⚡</span>
        <span class="ark-brand-name">ARK <span class="ark-brand-accent">Router</span></span>
      </a>
      <button type="button" class="ark-sidebar-close" id="ark-sidebar-close" aria-label="Fechar">&times;</button>
    </div>
    <div class="ark-sidebar-nav">
      <ul class="nav" id="topmenu">
        <li><a class="menu" href="/cgi-bin/luci/admin/equipe-dashboard">ARK Router</a></li>
        <li class="dropdown">
          <a class="menu" href="#">Status</a>
          <ul class="dropdown-menu">
            <li><a href="/cgi-bin/luci/admin/status/overview">Visão Geral</a></li>
            <li><a href="/cgi-bin/luci/admin/status/routes">Rotas</a></li>
            <li><a href="/cgi-bin/luci/admin/status/syslog">Log do Sistema</a></li>
          </ul>
        </li>
        <li class="dropdown">
          <a class="menu" href="#">Sistema</a>
          <ul class="dropdown-menu">
            <li><a href="/cgi-bin/luci/admin/system/system">Sistema</a></li>
            <li><a href="/cgi-bin/luci/admin/system/admin">Administração</a></li>
            <li><a href="/cgi-bin/luci/admin/system/flash">Backup / Flash</a></li>
          </ul>
        </li>
        <li class="dropdown">
          <a class="menu" href="#">Rede</a>
          <ul class="dropdown-menu">
            <li><a href="/cgi-bin/luci/admin/network/network">Interfaces</a></li>
            <li><a href="/cgi-bin/luci/admin/network/wireless">Wireless</a></li>
            <li><a href="/cgi-bin/luci/admin/network/firewall">Firewall</a></li>
            <li><a href="/cgi-bin/luci/admin/network/sqm">SQM QoS</a></li>
          </ul>
        </li>
      </ul>
    </div>
    <div class="ark-sidebar-footer">
      <div id="indicators" class="ark-indicators"></div>
    </div>
  </aside>

  <div id="maincontent" class="container ark-main-container">
    <div id="tabmenu" style="display:none"></div>
    <div id="view">{native_content}</div>
    <footer class="ark-footer">
      <div class="ark-footer-wrap">
        <span>ARK Router OS {ark_version} &bull; OpenWrt 25.12.6</span>
        <ul class="breadcrumb pull-right" id="modemenu" style="display:none"></ul>
      </div>
    </footer>
  </div>
  <div id="modal_overlay" style="display:none;"></div>
  {boot_script}
</body>
</html>
"""


class RealOfflineLuciServer:
    def __init__(self, fixture_path, lang="pt-br"):
        self.fixture = json.loads(Path(fixture_path).read_text(encoding="utf-8"))
        self.ark_version = _read_version()
        self.lang = lang
        if "features" in self.fixture:
            self.fixture["features"]["language"] = lang
            self.fixture["features"].setdefault("update", {})["current"] = self.ark_version
        self._poll_tick = 0
        self._lock = threading.Lock()
        self._server = None
        self._thread = None

    def _next_tick(self):
        with self._lock:
            self._poll_tick += 1
            return self._poll_tick

    def handle_rpc(self, obj, method, params):
        fx = self.fixture
        now_ts = int(time.time())
        if obj == "system" and method == "board":
            return fx.get("board", {})
        if obj == "system" and method == "info":
            info = dict(fx.get("system_info", {}))
            info["localtime"] = now_ts
            return info
        if obj == "network.interface" and method == "dump":
            return fx.get("interfaces", {"interface": []})
        if obj == "network.device" and method == "status":
            name = (params or {}).get("name", "")
            dev = dict(fx.get("devices", {}).get(name, {"up": False, "statistics": {"rx_bytes": 0, "tx_bytes": 0}}))
            stats = dict(dev.get("statistics", {}))
            if name in ("pppoe-wan", "eth1", "br-lan") and dev.get("up"):
                tick = self._next_tick()
                stats["rx_bytes"] = int(stats.get("rx_bytes", 0)) + tick * 6_450_000
                stats["tx_bytes"] = int(stats.get("tx_bytes", 0)) + tick * 1_820_000
            dev["statistics"] = stats
            return dev
        if obj == "network.wireless" and method == "status":
            return fx.get("wireless_status", {})
        if obj == "mwan3" and method == "status":
            return fx.get("mwan", {})
        if obj == "luci-rpc" and method == "getDHCPLeases":
            return fx.get("dhcp_leases", {"dhcp_leases": []})
        if obj == "luci-rpc" and method == "getHostHints":
            hints = {}
            for lease in fx.get("dhcp_leases", {}).get("dhcp_leases", []):
                mac = lease.get("macaddr")
                if mac:
                    hints[mac] = {"name": lease.get("hostname", ""), "ipaddrs": [lease.get("ipaddr", "")], "ip6addrs": []}
            return hints
        if obj == "iwinfo" and method == "assoclist":
            dev = (params or {}).get("device", "")
            res = []
            for st in fx.get("device_stations", {}).get("stations", []):
                if st.get("ifname") == dev:
                    res.append({
                        "mac": st["mac"],
                        "signal": st.get("signal", -58),
                        "noise": -95,
                        "rx": {"bytes": st.get("rx_bytes", 0), "rate": 866700, "mhz": 80},
                        "tx": {"bytes": st.get("tx_bytes", 0), "rate": 1201000, "mhz": 80},
                    })
            return {"results": res}
        if obj == "uci" and method == "get":
            cfg = (params or {}).get("config", "")
            return fx.get("uci", {}).get(cfg, {"values": {}})
        return {"results": []}

    def handle_exec(self, cmd, args):
        fx = self.fixture
        now_ts = int(time.time())
        args = args or []
        sub = args[0] if args else ""
        if cmd == "/bin/ping":
            return {"code": 0, "stdout": "64 bytes from 1.1.1.1: seq=0 ttl=58 time=4.120 ms\n", "stderr": ""}
        if "nlbwmon" in str(cmd):
            data_rows = []
            for idx, lease in enumerate(fx.get("dhcp_leases", {}).get("dhcp_leases", [])):
                rx = (idx + 2) * 380_000_000
                tx = (idx + 1) * 95_000_000
                data_rows.append([4, lease["macaddr"].lower(), lease["ipaddr"], rx, tx])
            return {"code": 0, "stdout": json.dumps({"columns": ["family", "mac", "ip", "rx_bytes", "tx_bytes"], "data": data_rows}), "stderr": ""}
        if "equipe-dashboard-control" in str(cmd):
            mapping = {
                "features": fx.get("features", {}),
                "lan-status": fx.get("lan_status", {}),
                "system-perf-status": fx.get("perf_status", {}),
                "system-hardware-info": fx.get("hardware_info", {}),
                "device-stations": fx.get("device_stations", {}),
                "device-fingerprints": {},
                "mwan-status-fast": fx.get("mwan", {}),
                "doctor-status": dict(fx.get("doctor_status", {}), timestamp=now_ts, date=time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now_ts))),
                "doctor-log": "[2026-11-24 15:40:00] Ark Doctor Audit: STATUS=OK (Erros=0, Avisos=0, Reparos=0, AutoFix=0)\n",
                "dns-turbo-status": {"active": True, "servers": ["1.1.1.1", "8.8.8.8"], "cache_size": 10000, "doh_enabled": False},
                "network-capacity-status": {"conntrack_count": 1428, "conntrack_max": 65536, "ppe_bound_flows": 412},
            }
            payload = mapping.get(sub, {})
            if isinstance(payload, str):
                return {"code": 0, "stdout": payload, "stderr": ""}
            return {"code": 0, "stdout": json.dumps(payload, ensure_ascii=False), "stderr": ""}
        return {"code": 0, "stdout": "{}", "stderr": ""}

    def handle_read(self, path):
        now_ts = int(time.time())
        if path == "/sys/class/thermal/thermal_zone0/temp":
            return "50000\n"
        if path == "/tmp/equipe-traffic-history.csv":
            return _build_traffic_history_csv(now_ts)
        if path == "/tmp/equipe-wan-daily.csv":
            return _build_wan_daily_csv(now_ts)
        if path == "/proc/net/arp":
            return _build_arp_table(self.fixture)
        if path == "/tmp/ark-doctor-last.json":
            doc = dict(self.fixture.get("doctor_status", {}), timestamp=now_ts, date=time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now_ts)))
            return json.dumps(doc, ensure_ascii=False)
        return ""

    def start(self):
        outer = self

        class Handler(SimpleHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def translate_path(self, path):
                clean = urlparse(path).path
                if clean.startswith("/luci-static/"):
                    return str(STATIC_ROOT / clean[len("/luci-static/"):])
                return super().translate_path(path)

            def _send_bytes(self, code, ctype, data):
                try:
                    self.send_response(code)
                    self.send_header("Content-Type", ctype)
                    self.send_header("Content-Length", str(len(data)))
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("Connection", "close")
                    self.end_headers()
                    self.wfile.write(data)
                except (BrokenPipeError, ConnectionResetError):
                    pass

            def end_headers(self):
                if not any(b"connection:" in h.lower() for h in getattr(self, "_headers_buffer", [])):
                    self.send_header("Connection", "close")
                super().end_headers()

            def do_GET(self):
                parsed = urlparse(self.path)
                clean = parsed.path
                if clean == "/__ark_mock__/luci-shim.js":
                    self._send_bytes(200, "application/javascript; charset=utf-8", LUCI_RUNTIME_SHIM_JS.encode("utf-8"))
                    return
                if clean == "/__ark_mock__/read":
                    q = parse_qs(parsed.query)
                    fpath = (q.get("path") or [""])[0]
                    txt = outer.handle_read(fpath)
                    self._send_bytes(200, "text/plain; charset=utf-8", txt.encode("utf-8"))
                    return
                if clean.startswith("/cgi-bin/luci/"):
                    html = _render_shell_html(clean[len("/cgi-bin/luci"):], outer.ark_version, outer.lang)
                    self._send_bytes(200, "text/html; charset=utf-8", html.encode("utf-8"))
                    return
                if clean.startswith("/luci-static/"):
                    return super().do_GET()
                self._send_bytes(404, "text/plain; charset=utf-8", b"Not found")

            def do_POST(self):
                clean = urlparse(self.path).path
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw = self.rfile.read(length) if length > 0 else b"{}"
                try:
                    body = json.loads(raw.decode("utf-8") or "{}")
                except Exception:
                    body = {}
                if clean == "/__ark_mock__/rpc":
                    out = outer.handle_rpc(body.get("object", ""), body.get("method", ""), body.get("params", {}))
                    self._send_bytes(200, "application/json; charset=utf-8", json.dumps(out, ensure_ascii=False).encode("utf-8"))
                    return
                if clean == "/__ark_mock__/exec":
                    out = outer.handle_exec(body.get("cmd", ""), body.get("args", []))
                    self._send_bytes(200, "application/json; charset=utf-8", json.dumps(out, ensure_ascii=False).encode("utf-8"))
                    return
                self._send_bytes(404, "application/json", b"{}")

            def log_message(self, format, *args):
                pass

        class HighBacklogHTTPServer(ThreadingHTTPServer):
            request_queue_size = 128
            allow_reuse_address = True

        self._server = HighBacklogHTTPServer(("127.0.0.1", 0), Handler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        return f"http://127.0.0.1:{self._server.server_address[1]}"

    def stop(self):
        if self._server:
            self._server.shutdown()
            self._server.server_close()


def _apply_pii_mask(page):
    page.evaluate("""() => {
      if (document.getElementById('ark-visual-pii-mask')) return;
      const st = document.createElement('style');
      st.id = 'ark-visual-pii-mask';
      st.textContent = '.ex-device-mac,.mac,[data-sensitive],input[type="password"]{filter:blur(6px)!important;}';
      document.head.appendChild(st);
    }""")


def _collect_page_metrics(page):
    return page.evaluate("""() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const brokenImgs = imgs.filter(img => img.complete && img.naturalWidth === 0).map(img => img.src);
      return {
        url: location.href,
        title: document.title,
        overflow_px: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        scroll_height: document.documentElement.scrollHeight,
        broken_images: brokenImgs,
        has_hero: !!document.querySelector('.ex-hero'),
        has_v2_sidebar: !!document.querySelector('.ex-v2-sidebar'),
        has_health_bar: !!document.querySelector('.ex-health-card, #ex-cpu'),
        has_download_metric: !!document.querySelector('#ex-download'),
        download_text: (document.querySelector('#ex-download') || {}).textContent || '',
        has_feature_guide: !!document.querySelector('#ark-feature-guide'),
        body_classes: document.body ? document.body.className : ''
      };
    }""")


def _login_if_needed(page, user, password):
    pw_input = page.query_selector('input[name="luci_password"]')
    if not pw_input:
        return False
    if not password:
        raise RuntimeError("Tela de login LuCI detectada, mas nenhuma senha foi fornecida (--password ou ARK_ROUTER_TEST_PASSWORD).")
    user_input = page.query_selector('input[name="luci_username"]')
    if user_input:
        user_input.fill(user)
    pw_input.fill(password)
    page.keyboard.press("Enter")
    page.wait_for_load_state("domcontentloaded", timeout=20000)
    page.wait_for_timeout(1500)
    return True


def _wait_dashboard_ready(page):
    page.wait_for_selector(".ex-hero, #ex-download", timeout=25000)
    page.wait_for_timeout(1200)


def _capture_shot(page, out_dir, name, shots_log, full_page=False, mask_pii=False):
    if mask_pii:
        _apply_pii_mask(page)
    page.wait_for_timeout(300)
    png_path = out_dir / f"{name}.png"
    page.screenshot(path=str(png_path), full_page=full_page)
    metrics = _collect_page_metrics(page)
    metrics["name"] = name
    metrics["file"] = str(png_path)
    metrics["full_page"] = full_page
    shots_log.append(metrics)
    print(f"  [SHOT] {png_path.name} | overflow={metrics['overflow_px']}px | scroll_h={metrics['scroll_height']}px")
    return metrics


def run_capture(args):
    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    viewports = [v.strip() for v in args.viewports.split(",") if v.strip()]
    panels = [p.strip() for p in args.panels.split(",") if p.strip()]
    modals = [m.strip() for m in args.modals.split(",") if m.strip()]

    server = None
    if args.mode == "offline":
        server = RealOfflineLuciServer(args.fixture, lang=args.lang)
        base_root = server.start()
        base_luci = f"{base_root}/cgi-bin/luci"
    else:
        if not args.url:
            raise ValueError("--url é obrigatório no modo --mode live")
        clean_url = args.url.rstrip("/")
        base_luci = clean_url if clean_url.endswith("/cgi-bin/luci") else f"{clean_url}/cgi-bin/luci"

    password = args.password or os.environ.get("ARK_ROUTER_TEST_PASSWORD", "")
    mask_pii = args.mask_pii if args.mask_pii is not None else (args.mode == "live")

    report = {
        "mode": args.mode,
        "base_luci": base_luci,
        "lang": args.lang,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "console_errors": [],
        "page_errors": [],
        "shots": [],
    }

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            for vp_name in viewports:
                vp = VIEWPORT_PRESETS.get(vp_name)
                if not vp:
                    raise ValueError(f"Viewport desconhecido: {vp_name}")
                ctx = browser.new_context(
                    viewport={"width": vp["width"], "height": vp["height"]},
                    device_scale_factor=vp["device_scale_factor"],
                    is_mobile=vp["is_mobile"],
                    has_touch=vp["has_touch"],
                    ignore_https_errors=True,
                )
                page = ctx.new_page()
                page.on("pageerror", lambda err, vp_n=vp_name: report["page_errors"].append(f"[{vp_n}] {err}"))
                page.on(
                    "console",
                    lambda msg, vp_n=vp_name: report["console_errors"].append(f"[{vp_n}] {msg.text}")
                    if msg.type == "error"
                    else None,
                )

                dash_url = f"{base_luci}/admin/equipe-dashboard"
                print(f"\n[{vp_name.upper()} {vp['width']}x{vp['height']} @{vp['device_scale_factor']}x] {dash_url}")
                page.goto(dash_url, wait_until="domcontentloaded", timeout=30000)
                if args.mode == "live":
                    if _login_if_needed(page, args.user, password) and "equipe-dashboard" not in page.url:
                        page.goto(dash_url, wait_until="domcontentloaded", timeout=30000)
                _wait_dashboard_ready(page)

                for panel in panels:
                    sel = PANEL_NAV_SELECTORS.get(panel)
                    if panel != "cockpit" and sel:
                        btn = page.query_selector(sel)
                        if btn:
                            if vp["is_mobile"]:
                                btn.evaluate("el => el.click()")
                            else:
                                btn.click()
                            page.wait_for_timeout(450)
                        else:
                            print(f"  [SKIP] Painel '{panel}' não encontrado ({sel})")
                            continue
                    elif panel == "cockpit":
                        btn = page.query_selector("#ex-v2-nav-cockpit")
                        if btn:
                            btn.evaluate("el => el.click()")
                            page.wait_for_timeout(350)

                    page.evaluate("window.scrollTo(0, 0)")
                    _capture_shot(page, out_dir, f"{vp_name}_{panel}", report["shots"], full_page=args.full_page, mask_pii=mask_pii)
                    if panel == "cockpit" and not args.full_page and vp_name == "desktop":
                        _capture_shot(page, out_dir, f"{vp_name}_{panel}_full", report["shots"], full_page=True, mask_pii=mask_pii)

                if vp_name == "mobile":
                    btn_cockpit = page.query_selector("#ex-v2-nav-cockpit")
                    if btn_cockpit:
                        btn_cockpit.evaluate("el => el.click()")
                        page.wait_for_timeout(250)
                    toggle = page.query_selector(".ex-v2-mobile-menu-btn") or page.query_selector("#ark-menu-toggle")
                    if toggle and toggle.is_visible():
                        toggle.click()
                        page.wait_for_timeout(400)
                        _capture_shot(page, out_dir, "mobile_drawer_open", report["shots"], full_page=False, mask_pii=mask_pii)
                        page.keyboard.press("Escape")
                        page.wait_for_timeout(200)

                if vp_name == "desktop" and modals:
                    btn_cockpit = page.query_selector("#ex-v2-nav-cockpit")
                    if btn_cockpit:
                        btn_cockpit.evaluate("el => el.click()")
                        page.wait_for_timeout(250)
                    for modal_name in modals:
                        clicked = False
                        if modal_name == "resources":
                            clicked = page.evaluate("""() => {
                              const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Recursos');
                              if (btn) { btn.click(); return true; }
                              return false;
                            }""")
                        elif modal_name == "doctor":
                            clicked = page.evaluate("""() => {
                              const btn = Array.from(document.querySelectorAll('button')).find(b => /Ark Doctor/i.test(b.textContent || ''));
                              if (btn) { btn.click(); return true; }
                              return false;
                            }""")
                        elif modal_name == "hardware":
                            clicked = page.evaluate("""() => {
                              const btn = Array.from(document.querySelectorAll('button')).find(b => /Especifica|Hardware & Sil/i.test(b.textContent || ''));
                              if (btn) { btn.click(); return true; }
                              return false;
                            }""")
                        if clicked:
                            page.wait_for_timeout(650)
                            _capture_shot(page, out_dir, f"desktop_modal_{modal_name}", report["shots"], full_page=False, mask_pii=mask_pii)
                            page.keyboard.press("Escape")
                            page.wait_for_timeout(250)

                if args.include_luci_native:
                    page.evaluate("""() => {
                      if (window._arkViewInstance && window._arkViewInstance.refreshTimer) {
                        clearTimeout(window._arkViewInstance.refreshTimer);
                        window._arkViewInstance.refreshTimer = null;
                      }
                    }""")
                    page.wait_for_timeout(300)
                    fw_url = f"{base_luci}/admin/network/firewall"
                    page.goto(fw_url, wait_until="domcontentloaded", timeout=30000)
                    page.wait_for_timeout(900)
                    page.evaluate("var g = document.getElementById('ark-feature-guide'); if (g) g.open = true;")
                    page.wait_for_timeout(200)
                    _capture_shot(page, out_dir, f"{vp_name}_luci_firewall", report["shots"], full_page=False, mask_pii=mask_pii)

                page.evaluate("""() => {
                  if (window._arkViewInstance && window._arkViewInstance.refreshTimer) {
                    clearTimeout(window._arkViewInstance.refreshTimer);
                    window._arkViewInstance.refreshTimer = null;
                  }
                }""")
                ctx.close()
            browser.close()
    finally:
        if server:
            server.stop()

    report_path = out_dir / "report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n[OK] Captura concluída: {len(report['shots'])} screenshot(s) em {out_dir}")
    print(f"     Relatório JSON: {report_path}")
    print(f"     Console errors: {len(report['console_errors'])} | Page errors: {len(report['page_errors'])}")

    if args.strict:
        failures = []
        if report["console_errors"]:
            failures.append(f"console_errors={report['console_errors']}")
        if report["page_errors"]:
            failures.append(f"page_errors={report['page_errors']}")
        for shot in report["shots"]:
            if shot["overflow_px"] > 0:
                failures.append(f"{shot['name']}: horizontal overflow {shot['overflow_px']}px")
            if shot["broken_images"]:
                failures.append(f"{shot['name']}: broken_images={shot['broken_images']}")
            if "luci_" not in shot["name"] and not shot["has_hero"]:
                failures.append(f"{shot['name']}: .ex-hero ausente (overview.js não montou)")
        if failures:
            print("[FAIL] Auditoria estrita encontrou problemas:\n  - " + "\n  - ".join(failures), file=sys.stderr)
            return 1
    return 0


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="ARK Router Real Visual Capture & UI Audit")
    ap.add_argument("--mode", choices=("offline", "live"), default="offline", help="offline (overview.js real + fixture) ou live (VM/roteador read-only)")
    ap.add_argument("--url", default="", help="URL base do LuCI para --mode live (ex.: https://192.168.73.1)")
    ap.add_argument("--user", default="root", help="Usuário LuCI (--mode live)")
    ap.add_argument("--password", default="", help="Senha LuCI (--mode live; padrão: env ARK_ROUTER_TEST_PASSWORD)")
    ap.add_argument("--fixture", default=str(DEFAULT_FIXTURE), help="Snapshot JSON para --mode offline")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="Diretório de saída dos PNGs e report.json")
    ap.add_argument("--viewports", default="desktop,mobile", help="Lista de viewports: desktop,mobile,tablet")
    ap.add_argument("--panels", default="cockpit,wan,wifi,devices,sqm_perf", help="Painéis V2 a capturar")
    ap.add_argument("--modals", default="resources,doctor,hardware", help="Modais a capturar no desktop")
    ap.add_argument("--lang", choices=("pt-br", "en", "es"), default="pt-br", help="Idioma no modo offline")
    ap.add_argument("--full-page", action="store_true", help="Captura full_page em todos os painéis")
    ap.add_argument("--include-luci-native", action="store_true", default=True, help="Inclui página nativa do LuCI (Firewall) com tema ARK")
    ap.add_argument("--no-luci-native", dest="include_luci_native", action="store_false")
    ap.add_argument("--mask-pii", dest="mask_pii", action="store_true", default=None, help="Mascara MACs/senhas antes dos prints")
    ap.add_argument("--no-mask-pii", dest="mask_pii", action="store_false")
    ap.add_argument("--strict", action="store_true", help="Falha com exit!=0 em erros de console, overflow > 0 ou falha de montagem")
    return ap.parse_args(argv)


if __name__ == "__main__":
    sys.exit(run_capture(parse_args()))
