/* ═══════════════════════════════════════════════════════════
   LOOK STUDIO · 修图引擎（纯浏览器 Canvas，本地处理）
   原则：只优化，不失真 —— 所有修饰类参数有硬上限，
   皮肤柔化带边缘保护（五官/发丝/纹理保留），身形调整幅度锁死。
   ═══════════════════════════════════════════════════════════ */
window.Retouch = (() => {

  const MAX_LONG_EDGE = 1800;

  const DEFAULTS = { exp:0, con:0, temp:0, sat:.06, smooth:.32, sharp:.35, bokeh:0, slim:0, len:0, vig:.1, film:0 };
  const CAPS      = { exp:.5, con:.5, temp:.5, sat:.7, smooth:.7, sharp:1.2, bokeh:1, slim:.06, len:.08, vig:.55, film:1 };
  const clampP = p => { const o = {}; for (const k in DEFAULTS) o[k] = Math.min(CAPS[k], Math.max(-CAPS[k]||0, +p[k] || 0)); return o; };

  const PRESETS = {
    natural: { name:'自然还原',  en:'NATURAL',  p:{ sat:.05, smooth:.3,  sharp:.35, vig:.08 } },
    creamy:  { name:'奶油日系',  en:'CREAMY',   p:{ exp:.12, temp:.22, sat:-.05, film:.35, smooth:.45, sharp:.25, vig:.05 } },
    hongkong:{ name:'港风胶片',  en:'HONG KONG',p:{ con:.18, temp:.1,  sat:.15,  film:.8,  smooth:.3,  sharp:.45, vig:.3 } },
    cool:    { name:'冷调高级',  en:'COOL TONE',p:{ temp:-.2, sat:-.15, con:.1,  film:.15, smooth:.35, sharp:.4,  vig:.15 } },
    bright:  { name:'清透白皙',  en:'AIRY',     p:{ exp:.22, temp:.08, sat:.05,  smooth:.5, sharp:.3,  bokeh:.15 } },
    night:   { name:'氛围暗调',  en:'MOODY',    p:{ exp:-.12, con:.15, sat:-.05, film:.4,  smooth:.3,  sharp:.4,  vig:.4 } },
  };

  /* ── 载入（自动纠正 EXIF 方向）────────────────────── */
  async function loadImage(file){
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation:'from-image' }); }
    catch(e){ bmp = await createImageBitmap(file); }
    const scale = Math.min(1, MAX_LONG_EDGE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    return c;
  }

  /* ── 照片质检 ─────────────────────────────────────── */
  function analyze(canvas){
    const tw = 320, th = Math.max(1, Math.round(canvas.height / canvas.width * tw));
    const t = document.createElement('canvas'); t.width = tw; t.height = th;
    const tc = t.getContext('2d', { willReadFrequently:true });
    tc.drawImage(canvas, 0, 0, tw, th);
    const d = tc.getImageData(0, 0, tw, th).data;
    const n = tw * th;
    const gray = new Float32Array(n);
    let sum = 0, sr = 0, sb = 0, hi = 0, lo = 0;
    for (let i = 0; i < n; i++){
      const r = d[i*4], g = d[i*4+1], b = d[i*4+2];
      const y = .299*r + .587*g + .114*b;
      gray[i] = y; sum += y; sr += r; sb += b;
      if (r > 250 && g > 250 && b > 250) hi++;
      if (r < 5 && g < 5 && b < 5) lo++;
    }
    const mean = sum / n;
    // 拉普拉斯方差 = 清晰度
    let lsum = 0, lsum2 = 0, cnt = 0;
    for (let y = 1; y < th - 1; y++) for (let x = 1; x < tw - 1; x++){
      const i = y * tw + x;
      const l = 4*gray[i] - gray[i-1] - gray[i+1] - gray[i-tw] - gray[i+tw];
      lsum += l; lsum2 += l*l; cnt++;
    }
    const lmean = lsum / cnt;
    const sharpVar = lsum2 / cnt - lmean * lmean;

    const items = [];
    let quality = 'ok';
    const add = (lv, txt) => { items.push({ lv, txt }); if (lv === 'bad') quality = 'bad'; else if (lv === 'warn' && quality === 'ok') quality = 'warn'; };

    if (sharpVar < 15) add('bad', '画面整体偏糊——多半是手抖或没对上焦，这张修不出细节');
    else if (sharpVar < 45) add('warn', '清晰度一般，有轻微模糊——修图能救，但重拍更好');
    else add('ok', '画质清晰，细节保留得不错');

    if (mean < 62) add('bad', '整体欠曝（画面偏暗），暗部噪点会很明显');
    else if (mean > 192) add('bad', '整体过曝（画面发白），亮部细节已经丢失');
    else add('ok', '曝光正常，明暗分布健康');
    if (hi / n > .06) add('warn', `高光溢出 ${(hi/n*100).toFixed(1)}%——纯白区域细节没了（常见于白墙/天空背景）`);
    if (lo / n > .18) add('warn', `死黑偏多（${(lo/n*100).toFixed(1)}%）——背光拍了？下次面向光源站`);

    const wb = (sr - sb) / n;
    if (wb > 28) add('warn', '画面偏黄（暖光源下常见）——可以在修图里把色温往左拉');
    else if (wb < -15) add('warn', '画面偏蓝（阴天/冷光）——色温往右拉一点');

    if (Math.min(canvas.width, canvas.height) < 700) add('warn', '分辨率偏低，放大看会糊——发朋友圈够用，别印出来');

    const tips = [];
    if (quality !== 'ok') tips.push(
      '对焦：拍前点击屏幕上的人脸，出现对焦框再按快门',
      '稳定：手肘夹紧身体，或靠着墙/桌拍；开连拍多拍几张再挑',
      '光线：面向窗户或光源站，别背对光；正午躲进阴影边缘',
      '构图：人放画面中间，头顶留一拳、脚贴底边');
    return { items, quality, tips, sharpVar, mean, wb };
  }

  /* ── 盒式模糊（可分离两趟）────────────────────────── */
  function boxBlur(src, w, h, r, passes = 2){
    if (r < 1) return src.slice();
    let a = new Uint8ClampedArray(src), b = new Uint8ClampedArray(src.length);
    const div = r * 2 + 1;
    for (let p = 0; p < passes; p++){
      // 水平
      for (let y = 0; y < h; y++){
        const row = y * w * 4;
        let R=0,G=0,B=0,A=0;
        for (let x = -r; x <= r; x++){
          const xi = Math.min(w-1, Math.max(0, x)) * 4 + row;
          R += a[xi]; G += a[xi+1]; B += a[xi+2]; A += a[xi+3];
        }
        for (let x = 0; x < w; x++){
          const o = row + x*4;
          b[o] = R/div; b[o+1] = G/div; b[o+2] = B/div; b[o+3] = A/div;
          const addI = Math.min(w-1, x + r + 1) * 4 + row;
          const subI = Math.max(0, x - r) * 4 + row;
          R += a[addI] - a[subI]; G += a[addI+1] - a[subI+1];
          B += a[addI+2] - a[subI+2]; A += a[addI+3] - a[subI+3];
        }
      }
      // 垂直
      for (let x = 0; x < w; x++){
        const col = x * 4;
        let R=0,G=0,B=0,A=0;
        for (let y = -r; y <= r; y++){
          const yi = Math.min(h-1, Math.max(0, y)) * w * 4 + col;
          R += b[yi]; G += b[yi+1]; B += b[yi+2]; A += b[yi+3];
        }
        for (let y = 0; y < h; y++){
          const o = y * w * 4 + col;
          a[o] = R/div; a[o+1] = G/div; a[o+2] = B/div; a[o+3] = A/div;
          const addI = Math.min(h-1, y + r + 1) * w * 4 + col;
          const subI = Math.max(0, y - r) * w * 4 + col;
          R += b[addI] - b[subI]; G += b[addI+1] - b[subI+1];
          B += b[addI+2] - b[subI+2]; A += b[addI+3] - b[subI+3];
        }
      }
    }
    return a;
  }

  /* ── 身线调整（切片重采样，幅度锁死）──────────────── */
  function warp(src, slim, len){
    const w = src.width, h = src.height;
    const dst = document.createElement('canvas'); dst.width = w; dst.height = h;
    const dctx = dst.getContext('2d');
    dctx.drawImage(src, 0, 0);
    const N = 72, sh = h / N;
    const U = 0.5 * (1 + len); // 上半段源跨度（压缩上半身 → 腿变长）
    const smooth = t => t * t * (3 - 2 * t);
    for (let i = 0; i < N; i++){
      const t0 = i / N, t1 = (i + 1) / N;
      const s0 = t0 <= .5 ? t0 / .5 * U        : U + (t0 - .5) / .5 * (1 - U);
      const s1 = t1 <= .5 ? t1 / .5 * U        : U + (t1 - .5) / .5 * (1 - U);
      const sy = s0 * h, shh = Math.max(1, (s1 - s0) * h);
      // 收腰：胯与胸之间最窄，向两端羽化
      const mid = (t0 + t1) / 2;
      const band = smooth(Math.max(0, 1 - Math.abs(mid - .46) / .24));
      const k = slim * band;
      const dw = w * (1 - k), dx = (w - dw) / 2;
      dctx.drawImage(src, 0, sy, w, shh, dx, i * sh, dw, sh + .8);
      if (dx > 0){ // 两侧补边，避免露缝
        dctx.drawImage(src, 0, sy, 1, shh, 0, i * sh, dx + .8, sh + .8);
        dctx.drawImage(src, w-1, sy, 1, shh, dx + dw - .8, i * sh, dx + 1, sh + .8);
      }
    }
    return dst;
  }

  /* ── 主处理管线 ───────────────────────────────────── */
  function process(srcCanvas, params){
    const p = clampP(params);
    let work = (p.slim > .001 || p.len > .001) ? warp(srcCanvas, p.slim, p.len) : srcCanvas;
    const w = work.width, h = work.height;
    const ctx = work.getContext('2d', { willReadFrequently:true });
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;

    /* 1) 一次循环：曝光/对比/色温/饱和/胶片/暗角/颗粒 */
    const E = Math.pow(2, p.exp * .9), C = 1 + p.con * .6;
    const tg = 1 + p.temp * .1, tb = 1 - p.temp * .1;
    const S = Math.max(0, Math.min(1.7, 1 + p.sat));
    const F = p.film;
    let rs = 12345;
    const rnd = () => (rs = (rs * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - .5;
    for (let y = 0; y < h; y++){
      const ny = y / h;
      for (let x = 0; x < w; x++){
        const o = (y * w + x) * 4;
        let r = d[o] * tg * E, g = d[o+1] * E, b = d[o+2] * tb * E;
        r = (r - 128) * C + 128; g = (g - 128) * C + 128; b = (b - 128) * C + 128;
        const lum = .299*r + .587*g + .114*b;
        r = lum + (r - lum) * S; g = lum + (g - lum) * S; b = lum + (b - lum) * S;
        if (F > 0){
          let vr = r / 255, vg = g / 255, vb = b / 255;
          vr = vr + F * .6 * (vr - .5) * (1 - Math.abs(vr - .5) * 2);
          vg = vg + F * .6 * (vg - .5) * (1 - Math.abs(vg - .5) * 2);
          vb = vb + F * .6 * (vb - .5) * (1 - Math.abs(vb - .5) * 2);
          const fade = F * .09;
          vr = fade + vr * (1 - fade); vg = fade + vg * (1 - fade); vb = fade + vb * (1 - fade);
          const gn = rnd() * 9 * F;
          r = vr * 255 + gn; g = vg * 255 + gn; b = vb * 255 + gn;
        }
        if (p.vig > 0){
          const dxn = (x / w - .5) * 2, dyn = (ny - .5) * 2;
          const dist = Math.sqrt(dxn*dxn + dyn*dyn) / 1.414;
          if (dist > .45){
            let t = (dist - .45) / .6; t = t > 1 ? 1 : t;
            const f = 1 - p.vig * t * t * (3 - 2 * t);
            r *= f; g *= f; b *= f;
          }
        }
        d[o] = r; d[o+1] = g; d[o+2] = b;
      }
    }

    /* 2) 皮肤柔化：肤色掩膜 + 边缘保护（五官/发丝不动） */
    if (p.smooth > .02){
      const blurR = Math.max(2, Math.round(Math.min(w, h) * .004 * (1 + 3 * p.smooth)));
      const bl = boxBlur(d, w, h, blurR, 2);
      const mR = Math.max(1, Math.round(Math.min(w, h) * .01));
      // 掩膜
      const mask = new Float32Array(w * h);
      for (let i = 0, px = 0; i < d.length; i += 4, px++){
        const r = d[i], g = d[i+1], b = d[i+2];
        const cb = 128 - .168736*r - .331264*g + .5*b;
        const cr = 128 + .5*r - .418688*g - .081312*b;
        mask[px] = (r > 60 && g > 30 && b > 15 && r > b && r - g > 8 && cb > 78 && cb < 135 && cr > 133 && cr < 177) ? 1 : 0;
      }
      // 掩膜羽化（单通道盒模糊，用同一函数跑灰度伪装）
      const mb = new Uint8ClampedArray(w * h * 4);
      for (let px = 0; px < w * h; px++){ const v = mask[px] * 255; mb[px*4] = v; mb[px*4+1] = v; mb[px*4+2] = v; mb[px*4+3] = 255; }
      const mbf = boxBlur(mb, w, h, mR, 1);
      const a0 = p.smooth;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
        const px = y * w + x, o = px * 4;
        const m = mbf[o] / 255;
        if (m < .02) continue;
        const dl = Math.abs((.299*d[o] + .587*d[o+1] + .114*d[o+2]) - (.299*bl[o] + .587*bl[o+1] + .114*bl[o+2]));
        let keep = 1 - dl / 22; keep = keep < 0 ? 0 : keep; keep = keep * keep * (3 - 2 * keep);
        const a = a0 * m * keep;
        d[o]   += (bl[o]   - d[o])   * a;
        d[o+1] += (bl[o+1] - d[o+1]) * a;
        d[o+2] += (bl[o+2] - d[o+2]) * a;
      }
    }

    /* 3) 锐化（仅亮度通道的 USM） */
    if (p.sharp > .05){
      const bl = boxBlur(d, w, h, 2, 1);
      const amt = .8 * p.sharp;
      for (let i = 0; i < d.length; i += 4){
        const dl = .299*d[i] + .587*d[i+1] + .114*d[i+2];
        const sl = .299*bl[i] + .587*bl[i+1] + .114*bl[i+2];
        const delta = (dl - sl) * amt;
        d[i] += delta; d[i+1] += delta; d[i+2] += delta;
      }
    }

    /* 4) 氛围虚化：中心主体椭圆保护 + 外围模糊混合 */
    if (p.bokeh > .02){
      const r = Math.round(3 + 28 * p.bokeh);
      const bl = boxBlur(d, w, h, r, 2);
      const rx = .30, ry = .52, cx = .5, cy = .40;
      const fMax = p.bokeh * .85;
      for (let y = 0; y < h; y++){
        const ey = (y / h - cy) / ry;
        for (let x = 0; x < w; x++){
          const ex = (x / w - cx) / rx;
          const e = ex*ex + ey*ey;
          if (e < 1) continue;
          let t = (e - 1) / .9; t = t > 1 ? 1 : t;
          const f = fMax * t * t * (3 - 2 * t);
          const o = (y * w + x) * 4;
          d[o] += (bl[o] - d[o]) * f;
          d[o+1] += (bl[o+1] - d[o+1]) * f;
          d[o+2] += (bl[o+2] - d[o+2]) * f;
        }
      }
    }

    ctx.putImageData(img, 0, 0);
    return work;
  }

  /* ── 三版参数：轻度 / 中度 / 明显 ─────────────────── */
  function variantParams(base){
    const b = clampP(base);
    const mk = (m, ts) => clampP({
      exp: b.exp * ts, con: b.con * ts, temp: b.temp * ts, sat: b.sat * ts,
      smooth: b.smooth * m, sharp: b.sharp * m, bokeh: b.bokeh * m,
      slim: b.slim * m, len: b.len * m, vig: b.vig * m, film: b.film * m,
    });
    return [ mk(.55, .6), mk(1, 1), mk(1.5, 1.35) ];
  }

  function describe(p){
    const out = [];
    const pc = (v, digits = 0) => (v > 0 ? '+' : '') + (v * 100).toFixed(digits) + '%';
    if (Math.abs(p.exp) > .03) out.push(`曝光 ${pc(p.exp)}`);
    if (Math.abs(p.con) > .05) out.push(`对比 ${pc(p.con)}`);
    if (Math.abs(p.temp) > .04) out.push(p.temp > 0 ? '色温偏暖' : '色温偏冷');
    if (Math.abs(p.sat) > .05) out.push(p.sat > 0 ? `饱和 ${pc(p.sat)}` : `降饱和 ${pc(-p.sat)}`);
    if (p.smooth > .08) out.push(`皮肤柔化 ${(p.smooth*100)|0}%（肤色区域识别 · 五官纹理保留）`);
    if (p.sharp > .08) out.push(`清晰度 ${(p.sharp*100)|0}%`);
    if (p.bokeh > .08) out.push(`氛围虚化 ${(p.bokeh*100)|0}%（主体保护）`);
    if (p.slim > .008) out.push(`收腰 ${(p.slim*100).toFixed(1)}%`);
    if (p.len > .008) out.push(`拉长身线 ${(p.len*100).toFixed(1)}%`);
    if (p.vig > .08) out.push(`暗角 ${(p.vig*100)|0}%`);
    if (p.film > .1) out.push(`胶片调 ${(p.film*100)|0}%（含细颗粒）`);
    return out.length ? out.join(' · ') : '基础质感优化（无增强修饰）';
  }

  return { loadImage, analyze, process, variantParams, describe, DEFAULTS, CAPS, PRESETS };
})();
