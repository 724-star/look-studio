# -*- coding: utf-8 -*-
"""LOOK STUDIO 补充交互实测：对比线拖动 / 针对性微调 / 重新生成 / 刷新配置记忆"""
import os
from playwright.sync_api import sync_playwright

BASE = r"C:\Users\七七\.zcode\workspace\default\look-studio"
URL = "file:///" + BASE.replace("\\", "/") + "/index.html"
OUT = os.path.join(BASE, "shots")
os.makedirs(OUT, exist_ok=True)

errors = []
results = []

def check(name, ok):
    results.append((name, ok))

with sync_playwright() as p:
    try:
        browser = p.chromium.launch(channel="msedge", headless=True)
    except Exception:
        browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
    page = ctx.new_page()
    page.emulate_media(reduced_motion="reduce")
    page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))

    page.goto(URL)
    page.wait_for_timeout(1200)

    # ① 重新生成按钮：换一批方案
    page.click("#btnDemo")
    page.wait_for_timeout(900)
    t1 = page.inner_text("#planGrid")
    page.click("#btnRegen")
    page.wait_for_timeout(900)
    t2 = page.inner_text("#planGrid")
    check("重新生成后内容有变化", t1 != t2)

    # ② 手动添加一件 + 选颜色/品类
    page.click("#btnAddManual")
    page.wait_for_timeout(400)
    check("手动添加衣物卡出现", page.locator(".item-card").count() == 3)  # 示例2件+手动1件

    # ③ 配置记忆：刷新后 chips 状态保留
    page.reload()
    page.wait_for_timeout(1200)
    on_count = page.locator("#bodyChips .chip.on, #skinChips .chip.on, #styleChips .chip.on, #sceneChips .chip.on").count()
    check("刷新后定制单选择保留", on_count >= 4)  # 示例: 约会+小个子+黄皮+日系

    # ④ 全流程到阶段3
    page.click("#btnDemo")
    page.wait_for_timeout(800)
    page.click(".plan-card:nth-child(1) [data-plan]")
    page.wait_for_timeout(800)
    page.click("#btnToStage3")
    page.wait_for_timeout(500)
    page.set_input_files("#filePhoto", os.path.join(BASE, "test-photo.jpg"))
    page.wait_for_timeout(2000)
    page.click("#btnRetouch")
    page.wait_for_timeout(18000)

    box = page.locator(".result-card .imgbox").first
    cut_before = box.evaluate("el => el.style.getPropertyValue('--cut')")
    bb = box.bounding_box()

    # ⑤ 拖动对比分割线
    page.mouse.move(bb["x"] + bb["width"] * 0.55, bb["y"] + bb["height"] * 0.5)
    page.mouse.down()
    page.mouse.move(bb["x"] + bb["width"] * 0.2, bb["y"] + bb["height"] * 0.5, steps=8)
    page.mouse.up()
    cut_after = box.evaluate("el => el.style.getPropertyValue('--cut')")
    check("对比分割线可拖动", cut_before != cut_after)
    page.screenshot(path=os.path.join(OUT, "06-dragged.png"), full_page=False)

    # ⑥ 针对性微调：点“太黄” → 参数变化并重冲
    temp_before = page.evaluate("() => { const r = [...document.querySelectorAll('.slider-row')].find(x => x.textContent.includes('色温')); return r ? r.querySelector('input').value : null; }")
    page.click("#fbRow .chip:nth-child(2)")  # 太黄
    page.wait_for_timeout(18000)
    temp_after = page.evaluate("() => { const r = [...document.querySelectorAll('.slider-row')].find(x => x.textContent.includes('色温')); return r ? r.querySelector('input').value : null; }")
    check("「太黄」微调生效（色温滑杆变化）", temp_before != temp_after and float(temp_after) < float(temp_before))
    page.screenshot(path=os.path.join(OUT, "07-feedback.png"), full_page=False)

    ctx.close()
    browser.close()

print("─" * 40)
for name, ok in results:
    print(("PASS " if ok else "FAIL ") + name)
print("─" * 40)
print("CONSOLE ERRORS:", errors if errors else "none")
exit_code = 0 if all(ok for _, ok in results) and not errors else 1
raise SystemExit(exit_code)
