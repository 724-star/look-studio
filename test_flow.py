# -*- coding: utf-8 -*-
"""LOOK STUDIO 全流程自动化实测：截图 + 控制台错误收集"""
import os
from playwright.sync_api import sync_playwright

BASE = r"C:\Users\七七\.zcode\workspace\default\look-studio"
URL = "file:///" + BASE.replace("\\", "/") + "/index.html"
OUT = os.path.join(BASE, "shots")
os.makedirs(OUT, exist_ok=True)

errors = []
with sync_playwright() as p:
    try:
        browser = p.chromium.launch(channel="msedge", headless=True)
    except Exception:
        browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
    # 测试时用 reduced-motion，让 reveal 元素直接可见（正式体验仍有动效）
    page.emulate_media(reduced_motion="reduce")
    page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))

    page.goto(URL)
    page.wait_for_timeout(1500)
    page.screenshot(path=os.path.join(OUT, "01-hero.png"))

    page.click("#btnDemo")
    page.wait_for_timeout(1300)
    page.screenshot(path=os.path.join(OUT, "02-plans.png"), full_page=True)

    # 明确选 LOOK 01（第一张卡片）
    page.click(".plan-card:nth-child(1) [data-plan]")
    page.wait_for_timeout(1300)
    page.screenshot(path=os.path.join(OUT, "03-guide.png"), full_page=True)

    page.click("#btnToStage3")
    page.wait_for_timeout(900)
    page.set_input_files("#filePhoto", os.path.join(BASE, "test-photo.jpg"))
    page.wait_for_timeout(2200)
    page.screenshot(path=os.path.join(OUT, "04-analysis.png"), full_page=True)

    page.click("#kwRow .chip:nth-child(1)")   # 显瘦拉长
    page.click("#kwRow .chip:nth-child(2)")   # 皮肤优化
    page.click("#kwRow .chip:nth-child(4)")   # 胶片感
    page.click("#btnRetouch")
    page.wait_for_timeout(20000)
    page.screenshot(path=os.path.join(OUT, "05-results.png"), full_page=True)

    browser.close()

print("CONSOLE ERRORS:", errors if errors else "none")
print("DONE")
