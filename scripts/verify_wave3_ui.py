#!/usr/bin/env python3
"""Headless Chromium/Playwright visual and behavioral verification for Wave 3 UI changes."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import sys
import threading

from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parents[1]
STATIC_ROOT = REPO / "root" / "www" / "luci-static"
SCREENSHOT_DIR = REPO / "docs" / "screenshots"

THEME_HTML_BODY = """<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ARK Router — Visual Verification</title>
  <link rel="stylesheet" href="/luci-static/ark/cascade.css?v=2.2.14">
  <link rel="stylesheet" href="/luci-static/ark/mobile.css?v=2.2.14">
  <link rel="stylesheet" href="/luci-static/resources/view/equipe-dashboard/overview.css?v=2.2.14">
  <script src="/luci-static/ark/ark-theme.js?v=2.2.14"></script>
</head>
<body class="lang_pt ark-app-page ark-theme">
  <div class="main">
    <div class="ark-mobile-bar">
      <button type="button" class="ark-menu-toggle" id="ark-menu-toggle" aria-label="Menu">
        <span class="ark-burger-line"></span>
        <span class="ark-burger-line"></span>
        <span class="ark-burger-line"></span>
      </button>
      <a class="brand ark-brand" href="/cgi-bin/luci/admin/ark">
        <span class="ark-brand-icon">⚡</span>
        <span class="ark-brand-name">ARK <span class="ark-brand-accent">Router</span></span>
      </a>
      <div class="ark-mobile-spacer"></div>
    </div>

    <div class="ark-sidebar-backdrop" id="ark-sidebar-backdrop"></div>

    <aside class="ark-sidebar" id="ark-sidebar">
      <div class="ark-sidebar-header">
        <a class="brand ark-brand" href="/cgi-bin/luci/admin/ark">
          <span class="ark-brand-icon">⚡</span>
          <span class="ark-brand-name">ARK <span class="ark-brand-accent">Router</span></span>
        </a>
        <button type="button" class="ark-sidebar-close" id="ark-sidebar-close" aria-label="Fechar">&times;</button>
      </div>
      <div class="ark-sidebar-nav">
        <ul class="nav" id="topmenu">
          <li class="dropdown">
            <a class="menu" href="#">Status</a>
            <ul class="dropdown-menu">
              <li><a href="/cgi-bin/luci/admin/status/overview">Overview</a></li>
              <li><a href="/cgi-bin/luci/admin/status/syslog">System Log</a></li>
            </ul>
          </li>
          <li class="dropdown">
            <a class="menu" href="#">Rede</a>
            <ul class="dropdown-menu">
              <li><a href="/cgi-bin/luci/admin/network/network">Interfaces</a></li>
              <li><a href="/cgi-bin/luci/admin/network/firewall">Firewall</a></li>
            </ul>
          </li>
        </ul>
      </div>
      <div class="ark-sidebar-footer">
        <div id="indicators" class="ark-indicators"></div>
      </div>
    </aside>

    <div id="maincontent" class="container ark-main-container">
      <div id="view">
        <div class="cbi-map">
          <h2>Firewall — Regras de Zona e Redirecionamento</h2>
          <div class="cbi-section">
            <div class="cbi-section-node">
              <pre id="ark-test-log-pre">Sun Nov 24 10:00:00 2026 kern.info kernel: [12.34] ARK Wave 3 UI check</pre>
            </div>
          </div>
        </div>
      </div>
      <footer class="ark-footer">
        <div class="ark-footer-wrap">
          <span>ARK Router OS &bull; LuCI 24.10</span>
        </div>
      </footer>
    </div>
  </div>
  <div id="modal_overlay" style="display:block;">
    <div class="modal">
      <h4>Confirmar Ação</h4>
      <button type="button" class="cbi-button-neutral">Fechar</button>
    </div>
  </div>
  <script>
    window.__arkHideModalCount = 0;
    window.__arkPromptCount = 0;
    window.prompt = function() { window.__arkPromptCount += 1; return null; };
    window.L = {
      require: function() {},
      ui: {
        hideModal: function() {
          window.__arkHideModalCount += 1;
          var ov = document.getElementById('modal_overlay');
          if (ov) ov.style.display = 'none';
        }
      }
    };
  </script>
</body>
</html>
"""


class FixtureHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean = path.split("?", 1)[0]
        if clean.startswith("/luci-static/"):
            rel = clean[len("/luci-static/"):]
            return str(STATIC_ROOT / rel)
        return super().translate_path(path)

    def do_GET(self):
        clean = self.path.split("?", 1)[0]
        if clean.startswith("/cgi-bin/luci/"):
            payload = THEME_HTML_BODY.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if clean.startswith("/luci-static/"):
            return super().do_GET()
        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        pass


def main():
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    errors = []
    guide_requests = []
    non_guide_requests = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)

            # 1. Desktop (1280x800): non-guide route should NOT fetch ark-guides.js, dropdown & Escape must work
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            page = context.new_page()
            page.on("pageerror", lambda err: errors.append(f"pageerror: {err}"))
            page.on(
                "console",
                lambda msg: errors.append(f"console.error: {msg.text}") if msg.type == "error" else None,
            )
            page.on(
                "request",
                lambda req: non_guide_requests.append(req.url) if "ark-guides.js" in req.url else None,
            )

            page.goto(f"http://127.0.0.1:{port}/cgi-bin/luci/admin/ark", wait_until="networkidle")
            page.wait_for_timeout(300)

            assert not non_guide_requests, f"ark-guides.js eagerly loaded on non-guide route: {non_guide_requests}"

            # Test Escape closes modal via ArkTheme.initGlobalEscHandler
            page.keyboard.press("Escape")
            page.wait_for_timeout(150)
            hide_count = page.evaluate("window.__arkHideModalCount")
            assert hide_count == 1, f"Expected Escape to call L.ui.hideModal once, got {hide_count}"

            # Test dropdown accordion toggle consolidated into ArkTheme.initSidebarNavigation
            status_link = page.locator("#topmenu li.dropdown > a.menu").first
            status_li = page.locator("#topmenu li.dropdown").first
            status_link.click()
            assert "open" in (status_li.get_attribute("class") or ""), "Dropdown failed to open on click"
            status_link.click()
            assert "open" not in (status_li.get_attribute("class") or ""), "Dropdown failed to close on second click"

            # 2. Desktop (1280x800): guide route MUST lazy-load ark-guides.js and render #ark-feature-guide
            page.on(
                "request",
                lambda req: guide_requests.append(req.url) if "ark-guides.js" in req.url else None,
            )
            page.goto(f"http://127.0.0.1:{port}/cgi-bin/luci/admin/network/firewall", wait_until="networkidle")
            page.wait_for_selector("#ark-feature-guide", timeout=5000)

            # Expand guide summary & verify copy fallback uses zero window.prompt()
            guide_title = page.locator("#ark-feature-guide .ark-guide-title").inner_text()
            assert "Firewall" in guide_title, f"Unexpected guide title: {guide_title}"
            assert guide_requests, "ark-guides.js was not lazy-loaded on guide route"

            prompt_count = page.evaluate("window.__arkPromptCount")
            assert prompt_count == 0, f"Unexpected window.prompt calls: {prompt_count}"

            # Open #ark-feature-guide and hide modal overlay so screenshot clearly shows content & guide banner
            page.evaluate("""
                var g = document.getElementById('ark-feature-guide');
                if (g) g.open = true;
                var ov = document.getElementById('modal_overlay');
                if (ov) ov.style.display = 'none';
            """)
            page.wait_for_timeout(200)
            desktop_png = SCREENSHOT_DIR / "wave3_theme_desktop.png"
            page.screenshot(path=str(desktop_png), full_page=False)
            context.close()

            # 3. Mobile (390x844): verify no horizontal overflow and sidebar toggle works
            m_ctx = browser.new_context(viewport={"width": 390, "height": 844})
            m_page = m_ctx.new_page()
            m_page.on("pageerror", lambda err: errors.append(f"mobile pageerror: {err}"))
            m_page.on(
                "console",
                lambda msg: errors.append(f"mobile console.error: {msg.text}") if msg.type == "error" else None,
            )
            m_page.goto(f"http://127.0.0.1:{port}/cgi-bin/luci/admin/network/firewall", wait_until="networkidle")
            m_page.wait_for_selector("#ark-feature-guide", timeout=5000)
            m_page.evaluate("""
                var ov = document.getElementById('modal_overlay');
                if (ov) ov.style.display = 'none';
            """)
            overflow = m_page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            assert overflow <= 0, f"Mobile horizontal overflow detected: {overflow}px"

            # Toggle mobile drawer briefly to confirm no crash, then close before clean page screenshot
            m_page.click("#ark-menu-toggle")
            assert m_page.evaluate("document.body.classList.contains('ark-sidebar-open')"), "Mobile drawer failed to open"
            m_page.click("#ark-sidebar-close")
            assert not m_page.evaluate("document.body.classList.contains('ark-sidebar-open')"), "Mobile drawer failed to close"

            m_page.wait_for_timeout(200)
            mobile_png = SCREENSHOT_DIR / "wave3_theme_mobile.png"
            m_page.screenshot(path=str(mobile_png), full_page=False)
            m_ctx.close()
            browser.close()
    finally:
        server.shutdown()

    assert not errors, "Playwright console/page errors:\n" + "\n".join(errors)
    print(f"[OK] Playwright Wave 3 visual & behavioral verification passed (desktop + mobile).")
    print(f"     Screenshots: {SCREENSHOT_DIR / 'wave3_theme_desktop.png'}, {SCREENSHOT_DIR / 'wave3_theme_mobile.png'}")


if __name__ == "__main__":
    main()
