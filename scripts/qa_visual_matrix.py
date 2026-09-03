import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.common.by import By

ROUTER_URL = "https://192.168.73.1/cgi-bin/luci/"
SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "qa_screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

MATRIX = [
    # 1. Desktop Full HD (Chrome)
    {
        "browser": "chrome",
        "name": "Chrome - Desktop Full HD (1920x1080)",
        "width": 1920,
        "height": 1080,
        "is_mobile": False,
        "filename": "chrome_desktop_1920x1080.png"
    },
    # 2. Desktop Laptop (Chrome)
    {
        "browser": "chrome",
        "name": "Chrome - Laptop (1366x768)",
        "width": 1366,
        "height": 768,
        "is_mobile": False,
        "filename": "chrome_laptop_1366x768.png"
    },
    # 3. Desktop Full HD (Firefox / Gecko)
    {
        "browser": "firefox",
        "name": "Firefox - Desktop Full HD (1920x1080)",
        "width": 1920,
        "height": 1080,
        "is_mobile": False,
        "filename": "firefox_desktop_1920x1080.png"
    },
    # 4. Desktop Full HD (Edge)
    {
        "browser": "edge",
        "name": "Edge - Desktop Full HD (1920x1080)",
        "width": 1920,
        "height": 1080,
        "is_mobile": False,
        "filename": "edge_desktop_1920x1080.png"
    },
    # 5. Mobile iPhone 14/15/16 (390x844)
    {
        "browser": "chrome",
        "name": "Chrome Mobile - iPhone Viewport (390x844)",
        "width": 390,
        "height": 844,
        "is_mobile": True,
        "mobile_profile": {
            "deviceMetrics": { "width": 390, "height": 844, "pixelRatio": 3.0, "touch": True },
            "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
        },
        "filename": "chrome_iphone_390x844.png"
    },
    # 6. Mobile Android / Galaxy (412x915)
    {
        "browser": "chrome",
        "name": "Chrome Mobile - Android Galaxy (412x915)",
        "width": 412,
        "height": 915,
        "is_mobile": True,
        "mobile_profile": {
            "deviceMetrics": { "width": 412, "height": 915, "pixelRatio": 2.625, "touch": True },
            "userAgent": "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36"
        },
        "filename": "chrome_android_412x915.png"
    },
    # 7. Compact Mobile (360x740)
    {
        "browser": "chrome",
        "name": "Chrome Mobile - Compact (360x740)",
        "width": 360,
        "height": 740,
        "is_mobile": True,
        "mobile_profile": {
            "deviceMetrics": { "width": 360, "height": 740, "pixelRatio": 2.0, "touch": True },
            "userAgent": "Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36"
        },
        "filename": "chrome_compact_360x740.png"
    },
    # 8. Tablet (768x1024)
    {
        "browser": "chrome",
        "name": "Chrome - iPad / Tablet (768x1024)",
        "width": 768,
        "height": 1024,
        "is_mobile": False,
        "filename": "chrome_tablet_768x1024.png"
    }
]

def create_driver(cfg):
    b = cfg["browser"]
    if b == "chrome":
        opts = ChromeOptions()
        opts.add_argument("--headless=new")
        opts.add_argument("--disable-gpu")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--ignore-certificate-errors")
        opts.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        if cfg.get("is_mobile") and cfg.get("mobile_profile"):
            opts.add_experimental_option("mobileEmulation", cfg["mobile_profile"])
        driver = webdriver.Chrome(options=opts)
        driver.set_window_size(cfg["width"], cfg["height"])
        return driver

    elif b == "edge":
        opts = EdgeOptions()
        opts.add_argument("--headless=new")
        opts.add_argument("--disable-gpu")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--ignore-certificate-errors")
        opts.binary_location = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        driver = webdriver.Edge(options=opts)
        driver.set_window_size(cfg["width"], cfg["height"])
        return driver

    elif b == "firefox":
        opts = FirefoxOptions()
        opts.add_argument("--headless")
        opts.set_preference("network.stricttransportsecurity.preloadlist", False)
        opts.set_preference("security.cert_pinning.enforcement_level", 0)
        opts.accept_insecure_certs = True
        opts.binary_location = r"C:\Program Files\Mozilla Firefox\firefox.exe"
        driver = webdriver.Firefox(options=opts)
        driver.set_window_size(cfg["width"], cfg["height"])
        return driver

    raise ValueError(f"Unknown browser: {b}")

def login_if_needed(driver):
    pw_inputs = driver.find_elements(By.NAME, "luci_password")
    if pw_inputs:
        pw_inputs[0].send_keys("admin0100")
        submit_btn = driver.find_elements(By.CSS_SELECTOR, "form button[type='submit'], form input[type='submit'], .cbi-button-apply")
        if submit_btn:
            driver.execute_script("arguments[0].click();", submit_btn[0])
        else:
            driver.find_element(By.TAG_NAME, "form").submit()
        time.sleep(2.5)

def run_tests():
    print("=======================================================================")
    print("ARK ROUTER - MULTI-BROWSER & MULTI-RESOLUTION QA SUITE")
    print(f"Target: {ROUTER_URL}")
    print(f"Saving screenshots to: {SCREENSHOT_DIR}")
    print("=======================================================================\n")

    results = []

    for i, cfg in enumerate(MATRIX, 1):
        print(f"[{i}/{len(MATRIX)}] Testing {cfg['name']}...")
        driver = None
        status = "PASSED"
        details = []

        try:
            driver = create_driver(cfg)
            driver.get(ROUTER_URL)
            time.sleep(2)
            login_if_needed(driver)

            # Wait for dashboard to render
            time.sleep(1.5)

            # 1. Check title
            title = driver.title
            if "ARK Router" not in title and "OpenWrt" not in title:
                raise AssertionError(f"Unexpected title: {title}")

            # 2. Check Horizontal Overflow (Overscroll bug detection)
            overflow_check = driver.execute_script("""
                const mr = document.querySelector('.main-right');
                const docWidth = document.documentElement.scrollWidth;
                const winWidth = window.innerWidth;
                const mrScrollWidth = mr ? mr.scrollWidth : 0;
                const mrClientWidth = mr ? mr.clientWidth : 0;
                return {
                    docScrollWidth: docWidth,
                    winInnerWidth: winWidth,
                    hasDocOverflow: docWidth > winWidth + 1,
                    mrScrollWidth: mrScrollWidth,
                    mrClientWidth: mrClientWidth,
                    hasMrOverflow: mrScrollWidth > mrClientWidth + 1
                };
            """)
            if overflow_check["hasDocOverflow"]:
                raise AssertionError(f"Horizontal leak on document! scrollWidth={overflow_check['docScrollWidth']} > innerWidth={overflow_check['winInnerWidth']}")
            if overflow_check["hasMrOverflow"]:
                raise AssertionError(f"Horizontal leak on main-right! scrollWidth={overflow_check['mrScrollWidth']} > clientWidth={overflow_check['mrClientWidth']}")
            details.append("No horizontal overflow")

            # 3. Check Cards & Containers clipping
            layout_check = driver.execute_script("""
                const cards = Array.from(document.querySelectorAll('.ex-card, .ex-hero, .ex-health-strip'));
                const broken = [];
                for (const c of cards) {
                    const rect = c.getBoundingClientRect();
                    if (rect.width > window.innerWidth + 2) {
                        broken.push({ tag: c.className, width: rect.width, win: window.innerWidth });
                    }
                }
                return { brokenCount: broken.length, broken: broken };
            """)
            if layout_check["brokenCount"] > 0:
                raise AssertionError(f"Cards wider than viewport: {layout_check['broken']}")
            details.append("All cards properly contained")

            # 4. Check Scrolling functionality
            driver.execute_script("""
                const mr = document.querySelector('.main-right');
                if (mr) mr.scrollTop = 450;
                else window.scrollTo(0, 450);
            """)
            time.sleep(0.3)
            scrolled_y = driver.execute_script("""
                const mr = document.querySelector('.main-right');
                return mr ? mr.scrollTop : window.pageYOffset;
            """)
            if scrolled_y <= 0:
                raise AssertionError("Page failed to scroll vertically!")
            details.append(f"Vertical scroll operational (offset={scrolled_y}px)")

            # 5. Mobile-specific: Test Submenu lock if mobile
            if cfg.get("is_mobile"):
                burger = driver.find_elements(By.CSS_SELECTOR, "a.showSide, header a.showSide")
                if burger:
                    driver.execute_script("arguments[0].click();", burger[0])
                    time.sleep(0.8)
                    mr_during_menu = driver.execute_script("return getComputedStyle(document.querySelector('.main-right')).overflowY;")
                    if mr_during_menu != "hidden":
                        raise AssertionError(f"Submenu failed to lock background! overflowY={mr_during_menu}")
                    
                    # Close submenu
                    driver.execute_script("document.querySelector('.darkMask').click();")
                    time.sleep(0.8)
                    mr_after_menu = driver.execute_script("return getComputedStyle(document.querySelector('.main-right')).overflowY;")
                    if mr_after_menu != "auto":
                        raise AssertionError(f"Submenu failed to unlock background! overflowY={mr_after_menu}")
                    details.append("Mobile side-menu lock & unlock validated")

            # 6. Save Screenshot
            screenshot_path = os.path.join(SCREENSHOT_DIR, cfg["filename"])
            driver.save_screenshot(screenshot_path)
            details.append(f"Saved: {cfg['filename']}")

            print(f"  -> SUCCESS: {', '.join(details)}")

        except Exception as e:
            status = "FAILED"
            print(f"  -> FAILED: {e}")
            details.append(str(e))

        finally:
            if driver:
                driver.quit()

        results.append({
            "name": cfg["name"],
            "browser": cfg["browser"],
            "resolution": f"{cfg['width']}x{cfg['height']}",
            "status": status,
            "details": details
        })

    # Summary table
    print("\n=======================================================================")
    print("FINAL QA RESULTS MATRIX")
    print("=======================================================================")
    all_passed = True
    for r in results:
        sym = "[PASS]" if r["status"] == "PASSED" else "[FAIL]"
        if r["status"] != "PASSED":
            all_passed = False
        print(f"{sym} {r['name']:<46} | Status: {r['status']}")
    print("=======================================================================")

    if all_passed:
        print("\nALL ENVIRONMENTS AND RESOLUTIONS PASSED WITH 100% SUCCESS!")
    else:
        print("\nWARNING: Some tests failed. Check log details above.")

    return all_passed

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
