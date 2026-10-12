#!/usr/bin/env python3
"""
ARK Router: Visual A/B Staging Comparator (Playwright CLI / Python)
Automates side-by-side screenshot comparisons between V1 (production) and V2 (staging)
across multiple responsive viewports (Mobile, Tablet, Desktop) and audits JS console errors.
"""

import os
import sys
import argparse
import time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DEFAULT_OUTPUT_DIR = os.path.join(REPO_DIR, "docs", "qa_screenshots", "v2_staging")

VIEWPORTS = {
    "mobile": {"width": 375, "height": 667, "name": "Mobile (375x667 - iPhone SE)"},
    "tablet": {"width": 768, "height": 1024, "name": "Tablet (768x1024 - iPad)"},
    "desktop": {"width": 1440, "height": 900, "name": "Desktop (1440x900 - MacBook/HD)"}
}

def stitch_images(img1_path, img2_path, out_path, title1="V1 (Oficial)", title2="V2 (Staging)"):
    if not (os.path.isfile(img1_path) and os.path.isfile(img2_path)):
        return False
    try:
        im1 = Image.open(img1_path)
        im2 = Image.open(img2_path)
        
        # Match height
        max_h = max(im1.height, im2.height)
        header_h = 40
        canvas_w = im1.width + im2.width + 20
        canvas_h = max_h + header_h
        
        combined = Image.new("RGB", (canvas_w, canvas_h), color=(15, 23, 42))
        combined.paste(im1, (0, header_h))
        combined.paste(im2, (im1.width + 20, header_h))
        
        draw = ImageDraw.Draw(combined)
        draw.text((20, 12), title1, fill=(255, 255, 255))
        draw.text((im1.width + 40, 12), title2, fill=(0, 210, 255))
        
        combined.save(out_path)
        return True
    except Exception as e:
        print(f"[WARN] Falha ao combinar imagens: {e}", file=sys.stderr)
        return False

def login_if_needed(page, base_url, password):
    # Navigate to base
    page.goto(base_url, timeout=30000)
    page.wait_for_load_state("domcontentloaded")
    time.sleep(1)
    
    # Check if login form is visible
    pw_input = page.query_selector("input[type='password'], input[name='luci_password']")
    if pw_input and pw_input.is_visible():
        if password:
            pw_input.fill(password)
        login_btn = page.query_selector("input[type='submit'], button[type='submit'], .cbi-button-apply")
        if login_btn:
            login_btn.click()
            page.wait_for_load_state("networkidle", timeout=15000)
            time.sleep(1.5)

def run_comparison(base_url, password, output_dir, viewports_to_test, targets):
    os.makedirs(output_dir, exist_ok=True)
    results = {"v1": {}, "v2": {}, "console_errors": []}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        for vp_key in viewports_to_test:
            vp = VIEWPORTS[vp_key]
            print(f"\n🔍 Executando testes no viewport: {vp['name']}...")
            
            for target in targets:
                path_route = "admin/equipe-dashboard" if target == "v1" else "admin/equipe-dashboard-v2"
                full_url = base_url.rstrip("/") + "/" + path_route
                
                context = browser.new_context(
                    viewport={"width": vp["width"], "height": vp["height"]},
                    ignore_https_errors=True
                )
                page = context.new_page()
                
                # Listen to console errors
                def handle_console(msg):
                    if msg.type == "error":
                        err_text = f"[{target.upper()}|{vp_key}] Console Error: {msg.text}"
                        results["console_errors"].append(err_text)
                
                page.on("console", handle_console)
                page.on("pageerror", lambda err: results["console_errors"].append(f"[{target.upper()}|{vp_key}] Page Error: {err}"))
                
                try:
                    login_if_needed(page, base_url, password)
                    print(f"   Acessando {target.upper()}: {full_url}")
                    page.goto(full_url, timeout=30000)
                    page.wait_for_load_state("networkidle", timeout=15000)
                    time.sleep(2) # Give animations / ubus calls time to stabilize
                    
                    filename = f"{target}_{vp_key}_{vp['width']}x{vp['height']}.png"
                    file_path = os.path.join(output_dir, filename)
                    page.screenshot(path=file_path, full_page=True)
                    results[target][vp_key] = file_path
                    print(f"   ✅ Screenshot salvo: {file_path}")
                except Exception as e:
                    print(f"   ❌ Erro ao capturar {target.upper()}: {e}", file=sys.stderr)
                finally:
                    context.close()
            
            # Stitch comparison if both v1 and v2 were taken
            if "v1" in results and "v2" in results and vp_key in results["v1"] and vp_key in results["v2"]:
                comp_filename = f"comparison_{vp_key}_{vp['width']}.png"
                comp_path = os.path.join(output_dir, comp_filename)
                if stitch_images(results["v1"][vp_key], results["v2"][vp_key], comp_path):
                    print(f"   🖼️  Comparativo lado a lado gerado: {comp_path}")
        
        browser.close()
        
    print("\n" + "="*50)
    print("📊 RESUMO DA AUDITORIA VISUAL")
    print("="*50)
    if results["console_errors"]:
        print(f"⚠️  Erros detectados no console ({len(results['console_errors'])}):")
        for err in results["console_errors"][:10]:
            print(f"   - {err}")
    else:
        print("✅ Zero erros de JavaScript detectados no console do navegador!")
    print(f"📁 Imagens disponíveis em: {output_dir}\n")

def main():
    parser = argparse.ArgumentParser(description="ARK Router Visual A/B Comparator")
    parser.add_argument("--url", default=os.environ.get("ARK_ROUTER_URL", "https://192.168.73.1/cgi-bin/luci/"), help="URL base do LuCI")
    parser.add_argument("--password", default=os.environ.get("ARK_ROUTER_TEST_PASSWORD") or os.environ.get("ARK_ROUTER_PASSWORD") or "", help="Senha de login")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_DIR, help="Diretório de saída dos prints")
    parser.add_argument("--viewport", choices=["mobile", "tablet", "desktop", "all"], default="all", help="Viewport a ser testado")
    parser.add_argument("--target", choices=["v1", "v2", "both"], default="both", help="Alvo do teste")
    args = parser.parse_args()

    vps = list(VIEWPORTS.keys()) if args.viewport == "all" else [args.viewport]
    targets = ["v1", "v2"] if args.target == "both" else [args.target]
    
    run_comparison(args.url, args.password, args.output, vps, targets)

if __name__ == "__main__":
    main()
