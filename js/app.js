/* ═══════════════════════════════════════════════════════════
   LOOK STUDIO · UI 逻辑（三阶段工作流串联）
   ═══════════════════════════════════════════════════════════ */
(() => {
  const $ = s => document.querySelector(s);
  const { COLORS, CATEGORIES, FITS, MATERIALS, KW, OPTIONS, generatePlans, generateGuide, framingSVG, parseManual, SAMPLE } = window.LOOK;
  const R = window.Retouch;

  /* ── 状态 ─────────────────────────────────────────── */
  const state = {
    items: [],                       // {id, img, cat, color, fit}
    ctx: { scene:null, season:null, bodies:[], skin:null, pref:null, notes:'' },
    plans: [], activePlan: -1, guide: null, seed: 0,
    photo: null, analysis: null,     // stage3
    params: { ...R.DEFAULTS },
    presetKey: 'natural', kws: new Set(),
    touched: false,
  };
  let uid = 1;

  /* ── 通用 ─────────────────────────────────────────── */
  let toastTimer;
  function toast(html, ms = 2600){
    const t = $('#toast');
    t.innerHTML = html; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }
  function flash(){
    const f = $('#flash');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }
  function save(){
    try { localStorage.setItem('lookstudio.v1', JSON.stringify({
      ctx: state.ctx, params: state.params, presetKey: state.presetKey, kws: [...state.kws],
    })); } catch(e){}
  }
  function restore(){
    try {
      const s = JSON.parse(localStorage.getItem('lookstudio.v1') || 'null');
      if (!s) return;
      if (s.ctx) state.ctx = { ...state.ctx, ...s.ctx, bodies: s.ctx.bodies || [] };
      if (s.params) state.params = { ...R.DEFAULTS, ...s.params };
      if (s.presetKey && R.PRESETS[s.presetKey]) state.presetKey = s.presetKey;
      if (Array.isArray(s.kws)) state.kws = new Set(s.kws);
      if (state.kws.size || state.presetKey !== 'natural') state.touched = true;
    } catch(e){}
  }

  /* ── 发布会式入场动效 ─────────────────────────────── */
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold:.1 }) : null;
  function animateIn(root){
    if (!root) return;
    root.querySelectorAll('[data-ani]').forEach((el, i) => {
      el.style.setProperty('--d', Math.min(i * 90, 620) + 'ms');
      if (io) io.observe(el); else el.classList.add('in');
    });
  }

  /* ── 阶段切换 & 流程轨 ────────────────────────────── */
  function gotoStage(n){
    [1,2,3].forEach(i => { const sec = $('#stage'+i); sec.hidden = i !== n; sec.classList.remove('enter'); });
    const cur = $('#stage'+n);
    void cur.offsetWidth;
    cur.classList.add('enter');
    document.querySelectorAll('.step').forEach(el => {
      const s = +el.dataset.step;
      el.classList.toggle('is-on', s === n);
      el.classList.toggle('is-done', (s===1 && state.plans.length) || (s===2 && state.guide) || (s===3 && $('#resultsWrap') && !$('#resultsWrap').hidden));
    });
    window.scrollTo({ top:0, behavior:'smooth' });
  }
  $('#stepsNav').addEventListener('click', e => {
    const btn = e.target.closest('.step'); if (!btn) return;
    const s = +btn.dataset.step;
    if (s === 2 && !state.plans.length) return toast('流程还没到这步：先在 <b>01 穿搭方案</b> 里生成并选一套');
    gotoStage(s);
  });

  /* ── Chips 构建器 ─────────────────────────────────── */
  function buildChips(container, opts, cfg){
    container.innerHTML = '';
    opts.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.key = o.key;
      b.innerHTML = o.name + (o.en ? `<span class="cn">${o.en}</span>` : '');
      const sync = () => b.classList.toggle('on', cfg.isOn(o.key));
      sync();
      b.addEventListener('click', () => { cfg.toggle(o.key); opts.forEach(x => { const el = container.querySelector(`[data-key="${x.key}"]`); el && el.classList.toggle('on', cfg.isOn(x.key)); }); state.touched = true; save(); cfg.after && cfg.after(); });
      container.appendChild(b);
    });
  }

  /* ── 定制单 ───────────────────────────────────────── */
  function initBrief(){
    buildChips($('#sceneChips'), OPTIONS.scenes, {
      isOn: k => state.ctx.scene === k,
      toggle: k => state.ctx.scene = state.ctx.scene === k ? null : k,
    });
    buildChips($('#seasonChips'), OPTIONS.seasons, {
      isOn: k => state.ctx.season === k,
      toggle: k => state.ctx.season = state.ctx.season === k ? null : k,
    });
    buildChips($('#bodyChips'), OPTIONS.bodies, {
      isOn: k => state.ctx.bodies.includes(k),
      toggle: k => { const i = state.ctx.bodies.indexOf(k); i > -1 ? state.ctx.bodies.splice(i,1) : state.ctx.bodies.push(k); },
    });
    buildChips($('#skinChips'), OPTIONS.skins, {
      isOn: k => state.ctx.skin === k,
      toggle: k => state.ctx.skin = state.ctx.skin === k ? null : k,
    });
    buildChips($('#styleChips'), OPTIONS.styles, {
      isOn: k => state.ctx.pref === k,
      toggle: k => state.ctx.pref = state.ctx.pref === k ? null : k,
    });
    $('#ctxNotes').value = state.ctx.notes || '';
    $('#ctxNotes').addEventListener('input', e => { state.ctx.notes = e.target.value; save(); });
  }

  /* ── 衣物管理 ─────────────────────────────────────── */
  function renderItem(it){
    const card = document.createElement('div');
    card.className = 'item-card'; card.dataset.id = it.id;
    const catOpts = CATEGORIES.map(c => `<option value="${c.key}" ${c.key===it.cat?'selected':''}>${c.name}</option>`).join('');
    const fitOpts = FITS.map(f => `<option value="${f.key}" ${f.key===it.fit?'selected':''}>${f.name}</option>`).join('');
    const matOpts = [`<option value="" ${!it.mat?'selected':''}>未标注</option>`]
      .concat(MATERIALS.map(m => `<option value="${m.key}" ${m.key===it.mat?'selected':''}>${m.name}</option>`)).join('');
    const sws = Object.keys(COLORS).map(k =>
      `<button type="button" class="swatch ${it.color===k?'on':''}" data-c="${k}" title="${COLORS[k].name}" style="background:${COLORS[k].sw||'#888'}"></button>`).join('');
    card.innerHTML = `
      <div class="item-thumb">${it.img ? `<img src="${it.img}" alt="衣物照片">` : '无图<br>单品'}</div>
      <div class="item-fields">
        <div class="item-field"><span>品类</span><select class="mini" data-f="cat">${catOpts}</select></div>
        <div class="item-field"><span>颜色</span><div class="swatches">${sws}</div></div>
        <div class="item-field"><span>版型</span><select class="mini" data-f="fit">${fitOpts}</select></div>
        <div class="item-field"><span>材质</span><select class="mini" data-f="mat">${matOpts}</select></div>
      </div>
      <button class="item-remove" title="移除">✕</button>`;
    return card;
  }
  function renderItems(){
    const list = $('#itemList');
    list.innerHTML = '';
    state.items.forEach(it => list.appendChild(renderItem(it)));
    if (!state.items.length) list.innerHTML = `<div class="empty"><b>衣杆上还空着</b>上传衣服照片，或点下面手动写一件——什么都不放也能生成通用方案</div>`;
  }
  function addItem(img){
    state.items.push({ id: uid++, img: img || null, cat:'tee', color:null, fit:'std', mat:null });
    renderItems();
  }
  $('#btnAddManual').addEventListener('click', () => { addItem(null); toast('已加一件“无图单品”——在卡片上选好品类/颜色/版型即可'); });
  $('#itemList').addEventListener('click', e => {
    const card = e.target.closest('.item-card'); if (!card) return;
    const it = state.items.find(x => x.id == card.dataset.id); if (!it) return;
    if (e.target.classList.contains('item-remove')){
      if (it.img) URL.revokeObjectURL(it.img);
      state.items = state.items.filter(x => x !== it); renderItems(); return;
    }
    if (e.target.classList.contains('swatch')){
      it.color = e.target.dataset.c;
      card.querySelectorAll('.swatch').forEach(s => s.classList.toggle('on', s === e.target));
    }
  });
  $('#itemList').addEventListener('change', e => {
    const card = e.target.closest('.item-card'); if (!card) return;
    const it = state.items.find(x => x.id == card.dataset.id); if (!it) return;
    if (e.target.dataset.f === 'cat') it.cat = e.target.value;
    if (e.target.dataset.f === 'fit') it.fit = e.target.value;
    if (e.target.dataset.f === 'mat') it.mat = e.target.value || null;
  });

  /* 上传（衣物） */
  const dropItems = $('#dropItems'), fileItems = $('#fileItems');
  dropItems.addEventListener('click', () => fileItems.click());
  dropItems.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); fileItems.click(); } });
  ['dragover','dragenter'].forEach(ev => dropItems.addEventListener(ev, e => { e.preventDefault(); dropItems.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => dropItems.addEventListener(ev, e => { e.preventDefault(); dropItems.classList.remove('over'); }));
  dropItems.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
  fileItems.addEventListener('change', e => { handleFiles(e.target.files); fileItems.value = ''; });
  function handleFiles(files){
    let n = 0;
    [...files].forEach(f => {
      if (!f.type.startsWith('image/')) return;
      addItem(URL.createObjectURL(f)); n++;
    });
    if (n) toast(`已挂上 ${n} 件——记得给每件贴上<b>品类 / 颜色 / 版型</b>标签`);
    else toast('没认出图片文件——换 JPG / PNG 试试');
  }

  /* ── 方案生成 & 渲染 ─────────────────────────────── */
  function logicBlock(title, en, arr){
    if (!arr || !arr.length) return '';
    return `<div><h4>${title}<s>${en}</s></h4><ul>${arr.map(t => `<li>${t}</li>`).join('')}</ul></div>`;
  }
  function renderPlans(){
    const grid = $('#planGrid');
    grid.innerHTML = '';
    state.plans.forEach((p, i) => {
      const card = document.createElement('article');
      card.className = 'plan-card'; card.setAttribute('data-ani','');
      card.innerHTML = `
        <span class="no">${p.no} · ${p.en}</span>
        <h3>${p.title}</h3>
        <p class="tagline">${p.tagline}</p>
        <div class="kw-row">${p.keywords.map(k => `<span class="kw">${k}</span>`).join('')}</div>
        <div class="pieces">${p.pieces.map(pc => `
          <div class="piece"><span class="mine ${pc.mine ? 'yours' : 'buy'}">${pc.mine ? '你的' : '建议补'}</span>
            <div><b>${pc.name}</b>${pc.note ? `<em> — ${pc.note}</em>` : ''}</div></div>`).join('')}</div>
        <div class="logic">
          ${logicBlock('色彩怎么说','COLOR', p.logic.color)}
          ${logicBlock('比例怎么调','RATIO', p.logic.ratio)}
          ${logicBlock('材质怎么用','TEXTURE', p.logic.texture)}
          ${logicBlock('身形怎么扬长避短','BODY', p.logic.body)}
          ${logicBlock('场景怎么贴合','SCENE', p.logic.scene)}
        </div>
        <div class="plan-go"><button class="btn primary" data-plan="${i}">选这套 · 出拍摄指导</button></div>`;
      grid.appendChild(card);
    });
    $('#plansSec').hidden = false;
    animateIn(grid);
  }
  $('#btnGenerate').addEventListener('click', () => {
    state.ctx.notes = $('#ctxNotes').value.trim();
    const missing = [];
    if (!state.ctx.scene) missing.push('场合');
    if (!state.ctx.bodies.length) missing.push('身形');
    if (!state.ctx.skin) missing.push('肤色');
    state.plans = generatePlans(state.items, state.ctx, state.seed);
    renderPlans();
    gotoStage(1);
    $('#plansSec').scrollIntoView({ behavior:'smooth', block:'start' });
    if (missing.length) toast(`先按<b>通用版</b>出了方案；补上「${missing.join(' / ')}」会更贴你——随时补，随时重新生成`);
    else toast('3 套方案出炉——点卡片最下面的按钮进棚');
    if (!state.items.length && !state.ctx.notes) toast('衣杆是空的：这是从零搭的通用方案，上传衣物后重新生成会围绕你的衣服来');
  });
  $('#btnRegen').addEventListener('click', () => {
    state.seed += 11;
    state.plans = generatePlans(state.items, state.ctx, state.seed);
    renderPlans();
    $('#plansSec').scrollIntoView({ behavior:'smooth', block:'start' });
    toast('换了一批思路——补充单品和配饰的方向都不一样了');
  });
  $('#planGrid').addEventListener('click', e => {
    const btn = e.target.closest('[data-plan]'); if (!btn) return;
    state.activePlan = +btn.dataset.plan;
    state.guide = generateGuide(state.plans[state.activePlan], state.ctx, state.seed + state.activePlan * 3);
    renderGuide();
    gotoStage(2);
  });

  /* ── 拍摄指导渲染 ─────────────────────────────────── */
  function renderGuide(){
    const p = state.plans[state.activePlan];
    const g = state.guide;
    const seasonName = (OPTIONS.seasons.find(s => s.key === state.ctx.season) || {}).name || '不限';
    const sceneName = g.scene.name;
    $('#planRecap').textContent = `${p.no} · ${p.title} ｜ 场景：${sceneName} · 季节：${seasonName}`;
    const stand = g.poses.stand, sit = g.poses.sit, close = g.poses.close;
    $('#guideWrap').innerHTML = `
      <div class="cs-block" data-ani style="border-top:none">
        <p style="font-size:14px;color:var(--paper-mut);max-width:640px"><b style="color:#B4531F">这场戏的基调：</b>${g.scene.tone}。下面所有机位、姿势、光线都围绕这个基调给的，照着做就能拍。</p>
      </div>
      <div class="cs-block" data-ani>
        <h3>三个景别 · 机位与要点<s>FRAMING × 3</s></h3>
        <div class="framing-grid">${g.framings.map(f => `
          <div class="framing-card">
            <div class="framing-fig">${framingSVG(f.fig)}</div>
            <h4>${f.name}<s>${f.en}</s></h4>
            <p class="cam">${f.cam}</p>
            <ul>${f.tips.map(t => `<li>${t}</li>`).join('')}</ul>
          </div>`).join('')}</div>
      </div>
      <div class="cs-block" data-ani>
        <h3>三组姿势 · 附发力技巧<s>POSE × 3</s></h3>
        <div class="pose-grid">
          ${[ ['站姿 · STAND', stand], ['坐姿 · SIT', sit], ['特写 · CLOSE-UP', close] ].map(([label, pose]) => `
          <div class="pose-card">
            <h4>${pose.name}<s>${pose.en}</s></h4>
            <p style="font-family:var(--mono);font-size:10px;letter-spacing:.2em;color:var(--paper-mut)">${label}</p>
            <ol>${pose.steps.map(s => `<li>${s}</li>`).join('')}</ol>
            <p class="pose-force"><b>发力要点</b> — ${pose.force}</p>
          </div>`).join('')}
        </div>
      </div>
      <div class="cs-block" data-ani>
        <h3>光线 & 背景<s>LIGHT & BACKGROUND</s></h3>
        <div class="duo-grid">
          <div class="info-card">
            <h4>光线怎么借<s>LIGHT</s></h4>
            <ul>
              <li><b>首选：</b>${g.light.best}</li>
              ${g.light.how.map(h => `<li>${h}</li>`).join('')}
            </ul>
          </div>
          <div class="info-card">
            <h4>背景去哪找<s>BACKDROP</s></h4>
            <ul>${g.bg.map(b => `<li>${b}</li>`).join('')}</ul>
          </div>
        </div>
      </div>
      <div class="cs-block" data-ani>
        <h3>三个避坑提醒<s>PITFALLS</s></h3>
        <div class="info-card pit-card">
          <ul>${g.pits.map((t, i) => `<li><span class="pit-num">0${i+1}</span>${t}</li>`).join('')}</ul>
        </div>
      </div>`;
    animateIn($('#guideWrap'));
  }
  $('#btnBackPlans').addEventListener('click', () => { gotoStage(1); $('#plansSec').scrollIntoView({ behavior:'smooth' }); });
  $('#btnToStage3').addEventListener('click', () => gotoStage(3));

  /* ── STAGE 3：底片 & 质检 ─────────────────────────── */
  const dropPhoto = $('#dropPhoto'), filePhoto = $('#filePhoto');
  dropPhoto.addEventListener('click', () => filePhoto.click());
  dropPhoto.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); filePhoto.click(); } });
  ['dragover','dragenter'].forEach(ev => dropPhoto.addEventListener(ev, e => { e.preventDefault(); dropPhoto.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => dropPhoto.addEventListener(ev, e => { e.preventDefault(); dropPhoto.classList.remove('over'); }));
  dropPhoto.addEventListener('drop', e => handlePhoto(e.dataTransfer.files[0]));
  filePhoto.addEventListener('change', e => { handlePhoto(e.target.files[0]); filePhoto.value = ''; });

  async function handlePhoto(file){
    if (!file || !file.type.startsWith('image/')) return toast('没认出图片文件——换 JPG / PNG 试试');
    toast('底片处理中……');
    try { state.photo = await R.loadImage(file); }
    catch(err){ return toast('这张图读不出来——换一张试试'); }
    state.analysis = R.analyze(state.photo);
    renderPhotoStrip(); renderAnalysis();
    $('#btnRetouch').disabled = false;
  }
  function renderPhotoStrip(){
    const el = $('#photoStrip');
    el.hidden = false;
    el.innerHTML = `
      <div class="film-frame">
        <div class="ff-inner"><img src="${state.photo.toDataURL('image/jpeg', .9)}" alt="原片"></div>
        <span class="ff-code">KODAK · LOOK STUDIO · 36EXP</span>
        <span class="ff-caption">原片 NEGATIVE · ${state.photo.width}×${state.photo.height}</span>
      </div>`;
  }
  function renderAnalysis(){
    const a = state.analysis;
    const badge = a.quality === 'ok' ? ['ok','质检通过 · PASS'] : a.quality === 'warn' ? ['warn','有小瑕疵 · CHECK'] : ['bad','底片质量差 · RESHOOT'];
    $('#analysisWrap').hidden = false;
    $('#analysisWrap').innerHTML = `
      <h3 data-ani>底片质检 <span class="qc ${badge[0]}">${badge[1]}</span></h3>
      <div class="qc-list" data-ani>${a.items.map(it => `<div class="qc-item"><i class="${it.lv}">${it.lv === 'ok' ? 'OK' : it.lv === 'warn' ? '注意' : '警报'}</i><span>${it.txt}</span></div>`).join('')}</div>
      ${a.quality === 'bad' ? `<div class="hint warn" data-ani><b>重拍建议（对照检查）：</b>${a.tips.join('；')}。——也可以直接冲印试试，但预期别太高，糊掉的照片修不出细节。</div>` : ''}`;
    animateIn($('#analysisWrap'));
  }

  /* ── 控制台：预设 / 关键词 / 滑杆 ─────────────────── */
  const SLIDERS = [
    { k:'exp',    name:'曝光',     min:-.5, max:.5,  step:.02,  fmt:v => (v > 0 ? '+' : '') + Math.round(v*100) },
    { k:'con',    name:'对比度',   min:-.5, max:.5,  step:.02,  fmt:v => (v > 0 ? '+' : '') + Math.round(v*100) },
    { k:'temp',   name:'色温',     min:-.5, max:.5,  step:.02,  fmt:v => v > .02 ? '暖 ' + Math.round(v*100) : v < -.02 ? '冷 ' + Math.round(-v*100) : '0' },
    { k:'sat',    name:'饱和度',   min:-.5, max:.6,  step:.02,  fmt:v => (v > 0 ? '+' : '') + Math.round(v*100) },
    { k:'smooth', name:'皮肤柔化', min:0,   max:.7,  step:.02,  fmt:v => Math.round(v/0.7*100) + '%', note:'识别肤色区域，五官边缘自动保护' },
    { k:'sharp',  name:'清晰度',   min:0,   max:1.2, step:.05,  fmt:v => Math.round(v/1.2*100) + '%' },
    { k:'bokeh',  name:'背景虚化', min:0,   max:1,   step:.05,  fmt:v => Math.round(v*100) + '%', note:'中心主体保护，越靠边虚得越多' },
    { k:'slim',   name:'收腰',     min:0,   max:.06, step:.005, fmt:v => (v*100).toFixed(1) + '%', note:'上限 6%——再高就假了' },
    { k:'len',    name:'拉长身线', min:0,   max:.08, step:.005, fmt:v => (v*100).toFixed(1) + '%', note:'上限 8%——再高就假了' },
    { k:'vig',    name:'暗角',     min:0,   max:.55, step:.05,  fmt:v => Math.round(v/0.55*100) + '%' },
  ];
  function renderPresets(){
    const box = $('#presetRow'); box.innerHTML = '';
    Object.keys(R.PRESETS).forEach(k => {
      const pr = R.PRESETS[k];
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip' + (state.presetKey === k ? ' on' : '');
      b.innerHTML = pr.name + `<span class="cn">${pr.en}</span>`;
      b.addEventListener('click', () => {
        state.presetKey = k; state.touched = true;
        recomputeParams(); renderPresets(); renderSliders(); save();
        toast(`风格切换到<b>${pr.name}</b>——滑杆已同步，可继续微调`);
      });
      box.appendChild(b);
    });
  }
  function renderKws(){
    const box = $('#kwRow'); box.innerHTML = '';
    KW.forEach(kw => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip' + (state.kws.has(kw.key) ? ' on' : '');
      b.textContent = kw.name;
      b.addEventListener('click', () => {
        state.kws.has(kw.key) ? state.kws.delete(kw.key) : state.kws.add(kw.key);
        state.touched = true;
        recomputeParams(); renderKws(); renderSliders(); save();
      });
      box.appendChild(b);
    });
  }
  function recomputeParams(){
    const p = { ...R.DEFAULTS, ...R.PRESETS[state.presetKey].p };
    state.kws.forEach(key => {
      const kw = KW.find(x => x.key === key); if (!kw) return;
      for (const k in kw.add) p[k] = (p[k] || 0) + kw.add[k];
    });
    state.params = p;
  }
  function renderSliders(){
    const box = $('#sliderBox'); box.innerHTML = '';
    SLIDERS.forEach(s => {
      const v = state.params[s.k];
      const row = document.createElement('div');
      row.className = 'slider-row';
      row.innerHTML = `
        <div class="sr-head"><span>${s.name}</span><b data-val>${s.fmt(v)}</b></div>
        <input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${v}" aria-label="${s.name}">
        ${s.note ? `<span class="sr-note">${s.note}</span>` : ''}`;
      const input = row.querySelector('input'), val = row.querySelector('[data-val]');
      const syncFill = () => input.style.setProperty('--fill', ((input.value - s.min) / (s.max - s.min) * 100) + '%');
      syncFill();
      input.addEventListener('input', () => {
        state.params[s.k] = +input.value; state.touched = true;
        val.textContent = s.fmt(+input.value); syncFill(); save();
      });
      box.appendChild(row);
    });
  }

  /* ── 冲印 & 结果 ──────────────────────────────────── */
  const VARIANTS = [
    { id:'01A', name:'轻度 · 接近原图', level:'light' },
    { id:'02B', name:'中度 · 推荐',     level:'mid' },
    { id:'03C', name:'明显 · 效果拉满', level:'strong' },
  ];
  $('#btnRetouch').addEventListener('click', async () => {
    if (!state.photo) return;
    if (!state.touched) toast('没说想怎么修——先按<b>自然还原</b>出一版；想要明确效果，点「修图需求」关键词再冲一次');
    flash();
    $('#resultsWrap').hidden = false;
    const grid = $('#resultGrid');
    grid.innerHTML = `<div class="processing"><span class="lamp"></span><b>暗房冲印中……</b><span>SKIN MASK → TONE → SHARPEN → BOKEH</span></div>`;
    $('#resultsWrap').scrollIntoView({ behavior:'smooth', block:'start' });
    const variants = R.variantParams(state.params);
    grid.innerHTML = '';
    for (let i = 0; i < 3; i++){
      const v = variants[i], meta = VARIANTS[i];
      const out = R.process(state.photo, v);
      grid.appendChild(buildResultCard(out, meta, v));
      await new Promise(r => setTimeout(r, 40));
    }
    animateIn(grid);
    document.querySelectorAll('.step').forEach(el => { if (el.dataset.step === '3') el.classList.add('is-done'); });
    toast('3 版冲好了——拖动成片上的蓝色分割线对比原片，满意就点下载');
  });

  function buildResultCard(canvas, meta, params){
    const card = document.createElement('div');
    card.className = 'result-card'; card.setAttribute('data-ani','');
    const before = state.photo.toDataURL('image/jpeg', .88);
    const after = canvas.toDataURL('image/jpeg', .92);
    card.innerHTML = `
      <div class="shot-frame">
        <div class="imgbox" style="--cut:55%">
          <img class="before" src="${before}" alt="原片">
          <img class="after" src="${after}" alt="修后">
          <span class="ba-line"></span>
          <span class="ba-tag l">原片</span><span class="ba-tag r">修后</span>
        </div>
      </div>
      <div class="result-meta">
        <div class="rm-head"><span class="rm-frame">FRAME ${meta.id}</span><span class="rm-name">${meta.name}</span></div>
        <p class="rm-desc">${R.describe(params)}</p>
        <button class="btn ghost" data-dl>下载这张</button>
      </div>`;
    // 对比分割线拖动
    const box = card.querySelector('.imgbox');
    const drag = e => {
      const r = box.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width, (e.touches ? e.touches[0].clientX : e.clientX) - r.left));
      box.style.setProperty('--cut', (x / r.width * 100).toFixed(1) + '%');
    };
    box.addEventListener('pointerdown', e => { box.setPointerCapture(e.pointerId); drag(e); const mv = ev => drag(ev); box.addEventListener('pointermove', mv); box.addEventListener('pointerup', () => box.removeEventListener('pointermove', mv), { once:true }); });
    // 下载
    card.querySelector('[data-dl]').addEventListener('click', () => {
      canvas.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `LookStudio_${meta.id}_${meta.name.split(' ')[0]}.jpg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
        toast(`已下载 <b>${meta.name}</b>`);
      }, 'image/jpeg', .92);
    });
    return card;
  }

  /* 不满意 → 针对性微调（不是盲目重做） */
  const FB = [
    { name:'太假 / 失真',   fn:p => { p.smooth = Math.max(0, p.smooth * .5); p.slim *= .5; p.len *= .5; p.film *= .6; } },
    { name:'太黄',          fn:p => { p.temp = Math.max(-.5, p.temp - .15); } },
    { name:'太暗',          fn:p => { p.exp = Math.min(.5, p.exp + .12); } },
    { name:'脸有点糊',      fn:p => { p.sharp = Math.min(1.2, p.sharp + .25); p.smooth *= .7; } },
    { name:'背景太乱',      fn:p => { p.bokeh = Math.min(1, p.bokeh + .2); } },
    { name:'腿还不够长',    fn:p => { p.len = Math.min(.08, p.len + .015); p.slim = Math.min(.06, p.slim + .01); } },
  ];
  function renderFb(){
    const box = $('#fbRow'); box.innerHTML = '';
    FB.forEach(fb => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = fb.name;
      b.addEventListener('click', () => {
        fb.fn(state.params); state.touched = true;
        renderSliders(); save();
        toast(`已针对「<b>${fb.name}</b>」调整参数，正在重冲 3 版……`);
        $('#btnRetouch').click();
      });
      box.appendChild(b);
    });
  }

  /* ── 示例 ─────────────────────────────────────────── */
  $('#btnDemo').addEventListener('click', () => {
    state.items = SAMPLE.items.map(it => ({ id: uid++, img:null, ...it }));
    state.ctx = { ...SAMPLE.ctx, notes:'' };
    renderItems(); initBrief(); save();
    state.plans = generatePlans(state.items, state.ctx, state.seed);
    renderPlans();
    $('#plansSec').scrollIntoView({ behavior:'smooth', block:'start' });
    toast('示例装好了：<b>奶白宽松针织 + 藏青裤</b>，小个子 · 黄皮 · 日系松弛，约会场景——往下看 3 套方案');
  });

  /* ── 启动 ─────────────────────────────────────────── */
  restore();
  initBrief();
  recomputeParams();
  renderPresets(); renderKws(); renderSliders(); renderFb(); renderItems();
  gotoStage(1);
  animateIn($('.hero'));
})();
