// 天下三分：画面（地図・都市の情報・命令の窓）
(function () {
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const G = SG.data.geo, K = G.size / G.bounds.span;
  const px = lon => (lon - G.bounds.lon0) * K;
  const py = lat => (G.bounds.lat1 - lat) * K;
  const man = n => n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n);
  const STAT = { lead: '統率', war: '武力', int: '知力', pol: '政治', cha: '魅力' };
  const A = SG.data.art;
  // 武将の顔の絵の場所（顔がなければ、型の絵。それもなければ null）
  SG.faceOf = o => {
    if (!o) return null;
    if (A.faces.includes(o.id)) return A.face + o.id + '.webp';
    if (!A.mobFaces) return null;
    const type = o.war >= 60 && o.war >= o.int ? 'war' : o.int >= o.pol ? 'int' : 'pol';
    const special = type === 'war' ? o.war >= 90 : type === 'int' ? o.int >= 90 : o.cha < 40;
    const age = (SG.ui && SG.ui.state ? SG.ui.state.year : 194) - o.born;
    return `${A.face}mob_${type}_${special ? 3 : age < 25 ? 0 : age < 45 ? 1 : 2}.webp`;
  };
  const face = (o, cls) => { const f = SG.faceOf(o); return f ? `<img class="${cls || 'face'}" src="${f}" alt="" onerror="this.remove()">` : ''; };
  // アイコン（読み込めなければ alt の文字に置きかわる）
  const icon = (path, cls, alt) => `<img class="${cls || 'ico'}" src="${A[path.split('/')[0]]}${path.split('/')[1]}.webp" alt="${alt || ''}" onerror="this.replaceWith(this.alt)">`;
  const lineIcon = text => { const m = A.logIcons.find(([re]) => re.test(text)); return m ? icon(m[1]) : ''; };
  let s = null, sel = null, targets = [], view = null;
  const posOf = {}; // 都市の地図での位置

  // ---------- セーブ ----------
  function save() { try { localStorage.setItem(SG.data.rules.saveKey, JSON.stringify(s)); } catch (e) { /* 保存できなくても遊べる */ } }
  function load() { try { const t = localStorage.getItem(SG.data.rules.saveKey); return t ? JSON.parse(t) : null; } catch (e) { return null; } }

  // ---------- 地図 ----------
  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function drawMap() {
    const svg = $('map'); svg.innerHTML = '';
    const g = SG.data.geo;
    svg.setAttribute('viewBox', `0 0 ${g.size} ${g.size}`);
    el('rect', { class: 'sea', width: g.size, height: g.size }, svg);
    el('polygon', { class: 'land', points: g.coast.map(([a, b]) => px(a) + ',' + py(b)).join(' ') }, svg);
    for (const pts of Object.values(g.rivers)) el('polyline', { class: 'river', points: pts.map(([a, b]) => px(a) + ',' + py(b)).join(' ') }, svg);
    // 描いた地図の絵（読み込めなければ、下の図形の地図のまま）
    const img = el('image', { href: g.image, width: g.size, height: g.size, preserveAspectRatio: 'none' }, svg);
    img.addEventListener('error', () => img.remove());
    for (const [name, pts] of Object.entries(g.rivers)) {
      const m = pts[Math.floor(pts.length * 0.3)];
      const t = el('text', { class: 'rname', 'data-x': px(m[0]), 'data-y': py(m[1]) - 8 }, svg); t.textContent = name;
    }
    const pos = posOf; for (const c of SG.data.cities) pos[c.id] = [px(c.lon), py(c.lat)];
    const h = A.castleSize / 2;
    const mask = el('mask', { id: 'flagmask', maskContentUnits: 'userSpaceOnUse' }, el('defs', {}, svg));
    el('image', { href: A.flag, x: h * 0.2, y: -h * 1.3, width: h * 0.8, height: h * 0.8 }, mask);
    const roads = el('g', {}, svg);
    for (const [a, b] of SG.data.roads) el('line', { class: 'road', 'data-a': a, 'data-b': b, x1: pos[a][0], y1: pos[a][1], x2: pos[b][0], y2: pos[b][1] }, roads);
    for (const c of SG.data.cities) {
      const gr = el('g', { class: 'city', 'data-id': c.id, 'data-x': pos[c.id][0], 'data-y': pos[c.id][1] }, svg);
      const z = A.castleSize, h = z / 2;
      el('circle', { class: 'ring', r: h + 3 }, gr);
      el('ellipse', { class: 'base', cy: h * 0.55, rx: h * 0.95, ry: h * 0.42 }, gr);
      // 絵がないときの四角
      el('rect', { class: 'mark', x: -11, y: -11, width: 22, height: 22, rx: 3 }, gr);
      const castle = el('image', { class: 'castle', x: -h, y: -h, width: z, height: z }, gr);
      castle.addEventListener('error', () => gr.classList.add('noimg'));
      // 旗：白い旗の形で勢力の色を切り抜き、その上に旗の絵を乗算で重ねて陰影を残す
      const fl = el('g', { class: 'flag' }, gr);
      el('rect', { class: 'cloth', x: h * 0.2, y: -h * 1.3, width: h * 0.8, height: h * 0.8, mask: 'url(#flagmask)' }, fl);
      el('image', { href: A.flag, x: h * 0.2, y: -h * 1.3, width: h * 0.8, height: h * 0.8 }, fl);
      el('image', { class: 'capital', href: A.capital, x: -h * 1.05, y: -h * 1.05, width: h * 0.7, height: h * 0.7, visibility: 'hidden' }, gr);
      gr.addEventListener('click', () => clickCity(c.id));
    }
    // 地名の札（暗い札に明るい字）。となりの城に隠れないよう、全部の城より上に描く
    const labels = el('g', { class: 'labels' }, svg);
    for (const c of SG.data.cities) {
      const lg = el('g', { class: 'label', 'data-id': c.id, 'data-x': pos[c.id][0], 'data-y': pos[c.id][1] }, labels);
      el('rect', { class: 'plate', y: h + 1, height: 29, rx: 4 }, lg);
      el('text', { class: 'name', y: h + 15 }, lg).textContent = c.id;
      el('text', { class: 'small', y: h + 27 }, lg);
    }
  }
  function refreshMap() {
    const caps = new Set(Object.values(s.forces).filter(f => f.alive).map(f => s.officers[f.ruler].city));
    for (const g of $('map').querySelectorAll('.city')) {
      const c = s.cities[g.dataset.id];
      const color = c.owner ? s.forces[c.owner].color : '#777';
      const base = SG.data.cities.find(x => x.id === c.id).pop;
      const tier = !c.owner ? 'ruin' : base >= A.castleTier.l ? 'l' : base >= A.castleTier.m ? 'm' : 's';
      const castle = g.querySelector('.castle');
      if (castle.getAttribute('href') !== A.castle[tier]) castle.setAttribute('href', A.castle[tier]);
      g.querySelector('rect.mark').setAttribute('fill', color);
      g.querySelector('.base').setAttribute('fill', color);
      g.querySelector('.cloth').setAttribute('fill', color);
      g.querySelector('.flag').setAttribute('visibility', c.owner ? 'visible' : 'hidden');
      g.querySelector('.capital').setAttribute('visibility', caps.has(c.id) ? 'visible' : 'hidden');
      const troops = c.troops ? '兵' + man(c.troops) : '';
      const label = $('map').querySelector(`.label[data-id="${c.id}"]`);
      label.classList.toggle('sel', c.id === sel);
      const small = label.querySelector('.small');
      if (label.dataset.t !== troops) {
        label.dataset.t = troops;
        small.textContent = troops;
        const w = Math.max(c.id.length * 15, troops.length * 7.5) + 10;
        const plate = label.querySelector('.plate');
        plate.setAttribute('x', -w / 2); plate.setAttribute('width', w); plate.setAttribute('height', troops ? 29 : 18);
      }
      g.classList.toggle('sel', c.id === sel);
      g.classList.toggle('target', targets.includes(c.id));
    }
    for (const l of $('map').querySelectorAll('.road')) l.classList.toggle('hot', !!sel && (l.dataset.a === sel || l.dataset.b === sel));
    refreshMinimap();
  }
  function clickCity(id) { sel = id; targets = []; render(); }

  // ---------- 拡大とミニマップ ----------
  function drawMinimap() {
    const m = $('minimap'), g = SG.data.geo;
    el('rect', { width: g.size, height: g.size, fill: '#1d3550' }, m);
    const img = el('image', { href: g.image, width: g.size, height: g.size, preserveAspectRatio: 'none' }, m);
    img.addEventListener('error', () => { img.remove(); el('polygon', { points: g.coast.map(([a, b]) => px(a) + ',' + py(b)).join(' '), fill: '#4b5a3a' }, m); });
    for (const c of SG.data.cities) el('circle', { class: 'dot', 'data-id': c.id, cx: posOf[c.id][0], cy: posOf[c.id][1], r: A.minimapDot / 2 }, m);
    el('rect', { id: 'mini-view' }, m);
    // クリック・ドラッグでその場所へ
    let down = false;
    const go = e => { const r = m.getBoundingClientRect(); view.centerOn((e.clientX - r.left) / r.width * g.size, (e.clientY - r.top) / r.height * g.size); };
    m.addEventListener('pointerdown', e => { down = true; m.setPointerCapture(e.pointerId); go(e); });
    m.addEventListener('pointermove', e => { if (down) go(e); });
    m.addEventListener('pointerup', () => { down = false; });
  }
  function refreshMinimap() {
    for (const d of $('minimap').querySelectorAll('.dot')) {
      const c = s.cities[d.dataset.id];
      d.setAttribute('fill', c.owner ? s.forces[c.owner].color : '#777');
      d.classList.toggle('sel', c.id === sel);
    }
  }
  function onView(v) {
    const r = $('mini-view'); if (!r) return;
    const g = SG.data.geo.size;
    const x = Math.max(0, v.x), y = Math.max(0, v.y);
    r.setAttribute('x', x); r.setAttribute('y', y);
    r.setAttribute('width', Math.min(g, v.x + v.w) - x); r.setAttribute('height', Math.min(g, v.y + v.h) - y);
    $('map-wrap').classList.toggle('zoomed', view && view.zoom > 1.01);
  }
  // その都市が見えるように地図を動かす（拡大していなければ少し拡大）
  function focusCity(id, zoom) { if (view && posOf[id]) view.centerOn(posOf[id][0], posOf[id][1], zoom || Math.max(view.zoom, A.view.startZoom)); }
  const capitalOf = () => s.officers[s.forces[s.player].ruler].city;

  // ---------- 画面全体 ----------
  function render() {
    $('date').textContent = SG.dateText(s);
    const f = s.forces[s.player];
    const sum = SG.forceSummary(s, s.player);
    $('me').innerHTML = `<span class="chip" style="background:${f.color}"></span>${esc(SG.forceName(s, s.player))}　都市${sum.cities}　武将${sum.officers}　兵${man(sum.troops)}`;
    refreshMap();
    renderCity();
    renderLog();
    $('btn-end').disabled = !!s.over;
    $('btn-captives').hidden = !s.captives.length;
    $('btn-captives').innerHTML = `${icon('cmd/captives')}捕虜（${s.captives.length}）`;
  }
  function renderLog() {
    $('log').innerHTML = s.log.slice(-60).map(l => `<div class="l-${l.kind}">${lineIcon(l.text)}${esc(l.date)} ${esc(l.text)}</div>`).join('');
    $('log').scrollTop = 1e9;
  }
  function statsTable(list, opts) {
    opts = opts || {};
    const rows = list.map(o => {
      const isRuler = o.force && s.forces[o.force] && s.forces[o.force].ruler === o.id;
      const cls = [o.acted && opts.showActed ? 'done' : '', opts.pick ? 'pick' : '', opts.on && opts.on.includes(o.id) ? 'on' : ''].join(' ');
      return `<tr class="${cls}" data-id="${esc(o.id)}"><td class="${isRuler ? 'ruler' : ''}">${face(o)}${esc(o.id)}</td>${['lead', 'war', 'int', 'pol', 'cha'].map(k => `<td class="${opts.hi === k ? 'hi' : ''}">${o[k]}</td>`).join('')}<td>${o.status === 'serve' && !isRuler ? o.loyalty : o.status === 'free' ? '在野' : '－'}</td>${opts.extra ? `<td>${opts.extra(o)}</td>` : ''}</tr>`;
    }).join('');
    const th = (k, t) => `<th title="${STAT[k] || '忠誠'}">${icon('stat/' + k)}${t}</th>`;
    return `<table><tr><th>武将</th>${th('lead', '統')}${th('war', '武')}${th('int', '知')}${th('pol', '政')}${th('cha', '魅')}${th('loyalty', '忠')}${opts.extraHead ? `<th>${opts.extraHead}</th>` : ''}</tr>${rows || '<tr><td colspan="8" class="sub">いない</td></tr>'}</table>`;
  }
  function stat(id, label, v, max) { return `<div><span>${icon('stat/' + id)}${label}</span>${v}${max ? '/' + max : ''}${max ? `<div class="bar"><i style="width:${Math.min(100, v / max * 100)}%"></i></div>` : ''}</div>`; }

  function renderCity() {
    const box = $('city');
    if (!sel) { box.innerHTML = '<p class="sub">地図の都市をクリックすると、情報と命令が出ます。</p>'; return; }
    const c = s.cities[sel];
    const mine = c.owner === s.player;
    const offs = SG.officersIn(s, c.id, c.owner).sort((a, b) => (s.forces[c.owner] && s.forces[c.owner].ruler === a.id ? -1 : 0) - (s.forces[c.owner] && s.forces[c.owner].ruler === b.id ? -1 : 0));
    const free = SG.freeIn(s, c.id).filter(o => o.found);
    const color = c.owner ? s.forces[c.owner].color : '#777';
    let h = `<h2><span class="chip" style="background:${color}"></span>${esc(c.id)}<span class="sub">${esc(SG.data.cities.find(x => x.id === c.id).province)}・${esc(SG.forceName(s, c.owner))}</span></h2>`;
    h += `<div class="stats">${stat('pop', '人口', man(c.pop))}${stat('gold', '金', c.gold)}${stat('food', '兵糧', c.food)}${stat('troops', '兵士', c.troops)}${stat('training', '訓練', c.training, 100)}${stat('order', '治安', c.order, 100)}${stat('agri', '農業', c.agri, c.agriMax)}${stat('comm', '商業', c.comm, c.commMax)}${stat('def', '城壁', c.def, c.defMax)}</div>`;
    h += `<div class="sub">隣：${SG.adj(c.id).map(id => esc(id)).join('・')}</div>`;
    if (mine && !s.over) {
      const idle = offs.filter(o => !o.acted).length;
      const b = (cmd, label, need = true) => `<button data-cmd="${cmd}" ${need && !idle ? 'disabled' : ''}>${icon('cmd/' + cmd, 'cico')}${label}</button>`;
      h += `<h3>命令（行動できる武将 ${idle}人）</h3><div class="cmds">
        <div class="group">内政</div>${b('agri', '開墾')}${b('comm', '商業')}${b('def', '城壁')}${b('order', '治安')}
        <div class="group">軍事</div>${b('recruit', '徴兵')}${b('train', '訓練')}${b('attack', '出陣')}${b('move', '移動', false)}
        <div class="group">人事・その他</div>${b('search', '探索')}${b('employ', '登用')}${b('reward', '褒美', false)}${b('trade', '売買', false)}
      </div><label class="toggle"><input type="checkbox" id="delegate" ${c.delegate ? 'checked' : ''}>${icon('cmd/delegate')}委任（月の終わりにAIが内政・軍事を行う）</label>`;
    }
    h += `<h3>武将（${offs.length}人）</h3>` + statsTable(offs, { showActed: mine, extraHead: mine ? '行動' : '', extra: mine ? o => o.acted ? icon('stat/acted', 'ico', '済') : '' : null });
    if (free.length) h += `<h3>在野（見つけた人物）</h3>` + statsTable(free);
    box.innerHTML = h;
    for (const btn of box.querySelectorAll('[data-cmd]')) btn.addEventListener('click', () => openCommand(btn.dataset.cmd));
    const d = $('delegate'); if (d) d.addEventListener('change', () => { c.delegate = d.checked; save(); });
  }

  // ---------- 窓 ----------
  function modal(html, onOpen) {
    $('modal-box').innerHTML = html; $('modal').hidden = false;
    for (const b of $('modal-box').querySelectorAll('[data-close]')) b.addEventListener('click', closeModal);
    if (onOpen) onOpen($('modal-box'));
  }
  function closeModal() { $('modal').hidden = true; targets = []; render(); nextQueued(); }
  // 窓を順番に出す（戦争の報告 → 捕虜 → 終わり）
  const queue = [];
  let endShown = false;
  function afterAction(r) {
    save();
    render();
    if (r && r.report) queue.push(() => showReport(r.report));
    if (s.captives.length) queue.push(showCaptives);
    nextQueued();
  }
  function nextQueued() {
    if (!$('modal').hidden || !s) return;
    const f = queue.shift();
    if (f) f();
    else if (s.over && !endShown) { endShown = true; showEnd(); }
  }

  // 武将を1人選んで実行する命令
  function pickOfficer(title, cityId, hi, run, extraHtml, onOpen) {
    const list = SG.officersIn(s, cityId, s.player).filter(o => !o.acted).sort((a, b) => b[hi] - a[hi]);
    modal(`<h2>${title}</h2>${extraHtml || ''}<p class="sub">実行する武将を選ぶ（${STAT[hi]}が効く）</p>${statsTable(list, { pick: true, hi })}<div class="msg" id="msg"></div><div class="actions"><button data-close>閉じる</button></div>`, box => {
      if (onOpen) onOpen(box);
      for (const tr of box.querySelectorAll('tr.pick')) tr.addEventListener('click', () => {
        const r = run(tr.dataset.id, box);
        if (!r.ok) { $('msg').textContent = r.msg; return; }
        closeModal(); afterAction(r);
      });
    });
  }

  function openCommand(cmd) {
    const c = s.cities[sel], R = SG.data.rules;
    if (['agri', 'comm', 'def', 'order'].includes(cmd)) {
      const conf = { agri: ['開墾', 'pol', R.devCost], comm: ['商業', 'pol', R.devCost], def: ['城壁修復', 'lead', R.devCost], order: ['治安', 'war', R.orderCost] }[cmd];
      return pickOfficer(`${conf[0]}（金${conf[2]}）`, c.id, conf[1], id => SG.exec(s, 'develop', { city: c.id, officer: id, kind: cmd }));
    }
    if (cmd === 'train') return pickOfficer('訓練', c.id, 'lead', id => SG.exec(s, 'train', { city: c.id, officer: id }));
    if (cmd === 'search') return pickOfficer('探索（人材・財宝を探す）', c.id, 'int', id => SG.exec(s, 'search', { city: c.id, officer: id }));
    if (cmd === 'recruit') {
      const per = R.goldPer100Troops;
      return pickOfficer('徴兵', c.id, 'cha', (id, box) => SG.exec(s, 'recruit', { city: c.id, officer: id, amount: +box.querySelector('#amt').value }),
        `<div class="row"><label>集める兵</label><input type="number" id="amt" min="100" step="100" value="${Math.min(3000, Math.floor(c.gold / per) * 100)}"><span class="sub">100人ごとに金${per}。上限は 魅力×${R.recruitPerCha}＋${R.recruitBase}。治安が下がる</span></div>`);
    }
    if (cmd === 'employ') return openEmploy(c);
    if (cmd === 'reward') return openReward(c);
    if (cmd === 'trade') return openTrade(c);
    if (cmd === 'move') return openMove(c);
    if (cmd === 'attack') return openAttack(c);
  }

  function openEmploy(c) {
    const free = SG.freeIn(s, c.id).filter(o => o.found);
    const enemy = SG.adj(c.id).flatMap(id => SG.officersIn(s, id).filter(o => o.force !== s.player && s.forces[o.force].ruler !== o.id));
    modal(`<h2>登用</h2><p class="sub">在野の人物（この都市で見つけた人）か、隣の都市の他勢力の武将（引き抜き・忠誠が低いほど成功しやすい）</p>
      <h3>在野</h3>${statsTable(free, { pick: true })}<h3>引き抜き</h3>${statsTable(enemy, { pick: true, extraHead: '所属', extra: o => esc(SG.forceName(s, o.force)) + '・' + esc(o.city) })}
      <div class="actions"><button data-close>閉じる</button></div>`, box => {
      for (const tr of box.querySelectorAll('tr.pick')) tr.addEventListener('click', () => {
        const target = tr.dataset.id;
        pickOfficer(`${esc(target)}を登用`, c.id, 'cha', id => SG.exec(s, 'employ', { city: c.id, officer: id, target }));
      });
    });
  }
  function openReward(c) {
    const list = SG.officersIn(s, c.id, s.player).filter(o => s.forces[s.player].ruler !== o.id).sort((a, b) => a.loyalty - b.loyalty);
    modal(`<h2>褒美</h2><div class="row"><label>金</label><input type="number" id="amt" value="100" min="10" step="10"><span class="sub">金${c.gold}。金10ごとに忠誠およそ+1</span></div>${statsTable(list, { pick: true })}<div class="msg" id="msg"></div><div class="actions"><button data-close>閉じる</button></div>`, box => {
      for (const tr of box.querySelectorAll('tr.pick')) tr.addEventListener('click', () => {
        const r = SG.exec(s, 'reward', { city: c.id, target: tr.dataset.id, gold: +$('amt').value });
        $('msg').textContent = r.msg; save();
        if (r.ok) { box.querySelector(`tr[data-id="${tr.dataset.id}"] td:nth-child(7)`).textContent = s.officers[tr.dataset.id].loyalty; }
      });
    });
  }
  function openTrade(c) {
    const R = SG.data.rules;
    modal(`<h2>売買</h2><p class="sub">買う：金1で兵糧${R.buyFoodPerGold}／売る：兵糧${R.sellFoodPerGold}で金1。いま 金${c.gold}・兵糧${c.food}</p>
      <div class="row"><label>金の額</label><input type="number" id="amt" value="100" min="1" step="10"><button id="buy">兵糧を買う</button><button id="sell">兵糧を売る</button></div><div class="msg" id="msg"></div><div class="actions"><button data-close>閉じる</button></div>`, () => {
      const go = mode => { const r = SG.exec(s, 'trade', { city: c.id, mode, amount: +$('amt').value }); $('msg').textContent = r.msg; save(); render(); };
      $('buy').addEventListener('click', () => go('buy')); $('sell').addEventListener('click', () => go('sell'));
    });
  }

  // 行き先 → 武将（複数）→ 兵などの量
  function chooseDest(title, c, filter, next) {
    const list = SG.adj(c.id).filter(id => filter(s.cities[id]));
    targets = list; refreshMap();
    if (!list.length) { modal(`<h2>${title}</h2><p>行ける都市がない。</p><div class="actions"><button data-close>閉じる</button></div>`); return; }
    modal(`<h2>${title}：行き先</h2><div class="row">${list.map(id => `<button data-to="${esc(id)}"><span class="chip" style="background:${s.cities[id].owner ? s.forces[s.cities[id].owner].color : '#777'}"></span> ${esc(id)}（${esc(SG.forceName(s, s.cities[id].owner))}・兵${man(s.cities[id].troops)}）</button>`).join('')}</div><div class="actions"><button data-close>閉じる</button></div>`, box => {
      for (const b of box.querySelectorAll('[data-to]')) b.addEventListener('click', () => next(b.dataset.to));
    });
  }
  function openMove(c) {
    chooseDest('移動・輸送', c, d => !d.owner || d.owner === s.player, to => {
      const list = SG.officersIn(s, c.id, s.player).filter(o => !o.acted);
      const chosen = [];
      modal(`<h2>${esc(c.id)} → ${esc(to)}</h2><p class="sub">連れて行く武将をクリックで選ぶ（${s.cities[to].owner ? '輸送だけなら選ばなくてよい' : '空白地は1人以上で占領'}）</p>${statsTable(list, { pick: true, hi: 'lead' })}
        <div class="row"><label>兵</label><input type="number" id="tr" value="0" min="0" max="${c.troops}" step="100"><label>金</label><input type="number" id="gd" value="0" min="0" max="${c.gold}" step="10"><label>兵糧</label><input type="number" id="fd" value="0" min="0" max="${c.food}" step="100"></div>
        <div class="sub">いま 兵${c.troops}・金${c.gold}・兵糧${c.food}</div><div class="msg" id="msg"></div><div class="actions"><button data-close>やめる</button><button id="go" class="primary">移動する</button></div>`, box => {
        for (const tr of box.querySelectorAll('tr.pick')) tr.addEventListener('click', () => { const i = chosen.indexOf(tr.dataset.id); if (i < 0) chosen.push(tr.dataset.id); else chosen.splice(i, 1); tr.classList.toggle('on', i < 0); });
        $('go').addEventListener('click', () => {
          const r = SG.exec(s, 'move', { city: c.id, to, officers: chosen, troops: +$('tr').value, gold: +$('gd').value, food: +$('fd').value });
          if (!r.ok) { $('msg').textContent = r.msg; return; }
          closeModal(); afterAction(r);
        });
      });
    });
  }
  function openAttack(c) {
    const R = SG.data.rules;
    chooseDest('出陣', c, d => d.owner !== s.player, to => {
      const d = s.cities[to];
      const list = SG.officersIn(s, c.id, s.player).filter(o => !o.acted).sort((a, b) => b.lead - a.lead);
      const chosen = list.slice(0, Math.min(R.maxUnits, list.length)).map(o => o.id);
      const defOffs = SG.officersIn(s, to, d.owner);
      modal(`<h2>${esc(c.id)} → ${esc(to)} 出陣</h2>
        <p class="sub">相手：${esc(SG.forceName(s, d.owner))}　兵${d.troops}・城壁${d.def}・訓練${d.training}・武将${defOffs.length}人（${defOffs.slice(0, 5).map(o => esc(o.id)).join('・')}）</p>
        <p class="sub">出陣する武将（最大${R.maxUnits}人、クリックで選ぶ）。兵は統率の比で分ける</p>${statsTable(list, { pick: true, hi: 'lead', on: chosen })}
        <div class="row"><label>兵</label><input type="range" id="tr" min="0" max="${c.troops}" step="100" value="${Math.floor(c.troops * 0.8 / 100) * 100}"><span id="trv"></span></div>
        <div class="sub" id="split"></div><div class="msg" id="msg"></div><div class="actions"><button data-close>やめる</button><button id="go-auto">自動で出陣</button><button id="go" class="primary">指揮して出陣</button></div>
        <p class="sub">指揮：マスの戦場で部隊を動かして戦う／自動：AIが戦うのを見る（途中で「指揮に戻る」もできる）</p>`, box => {
        const units = () => { const sum = chosen.reduce((a, id) => a + s.officers[id].lead, 0); const n = +$('tr').value; return chosen.map(id => ({ officer: id, troops: Math.floor(n * s.officers[id].lead / sum / 100) * 100 })); };
        const upd = () => { $('trv').textContent = $('tr').value + '人　兵糧' + Math.ceil($('tr').value * R.foodPerTroop * R.march.foodMonths) + 'を使う'; $('split').textContent = units().map(u => `${u.officer} ${u.troops}`).join('　'); };
        for (const tr of box.querySelectorAll('tr.pick')) tr.addEventListener('click', () => {
          const i = chosen.indexOf(tr.dataset.id);
          if (i >= 0) chosen.splice(i, 1); else if (chosen.length < R.maxUnits) chosen.push(tr.dataset.id); else return;
          tr.classList.toggle('on', i < 0); upd();
        });
        $('tr').addEventListener('input', upd); upd();
        const go = (mode, watch) => {
          if (!chosen.length) { $('msg').textContent = '武将を選んでください'; return; }
          // 総大将（崩れたら負け）は選んだ順の1人目
          const r = SG.exec(s, 'attack', { city: c.id, to, units: units(), mode });
          if (!r.ok) { $('msg').textContent = r.msg; return; }
          closeModal();
          // 自動：マスの戦場で、AI が戦うのを1手ずつ見せる
          if (r.tactics && watch) SG.tactics.delegate(s.battle);
          if (r.tactics) openBattle(); else afterAction(r);
        };
        $('go').addEventListener('click', () => go('tactics'));
        $('go-auto').addEventListener('click', () => go('tactics', true));
      });
    });
  }

  // ---------- 戦争の報告・捕虜・終わり ----------
  function showReport(rep) {
    const mineAtk = rep.atkForce === s.player;
    const won = mineAtk ? rep.win : !rep.win;
    const head = mineAtk ? `${esc(rep.from)}から${esc(rep.to)}へ出陣` : `${esc(SG.forceName(s, rep.atkForce))}が${esc(rep.to)}へ攻めてきた！`;
    const lines = rep.lines.map(l => `<div class="${/一騎打ち|合目|勝負|の勝ち/.test(l) ? 'duel' : /火計/.test(l) ? 'fire' : ''}">${lineIcon(l)}${esc(l)}</div>`).join('');
    const big = rep.win ? 'event/fall' : mineAtk ? 'event/rout' : 'event/hold';
    modal(`<h2>${esc(rep.date)} ${head}</h2><div class="result ${won ? 'win' : 'lose'}">${icon(big, 'big')}${mineAtk ? (rep.win ? '落城させた！' : '攻略失敗') : (rep.win ? `${esc(rep.to)}を奪われた……` : '守りきった！')}</div><div class="report">${lines}</div><div class="actions"><button data-close class="primary">閉じる</button></div>`);
  }
  function showCaptives() {
    const list = s.captives.map(id => s.officers[id]);
    modal(`<h2>${icon('event/capture', 'hico')}捕虜の処遇</h2><p class="sub">登用は断られることがある（断られたら解放）。決めずに月を終えると解放する</p>${statsTable(list, { extraHead: '処遇', extra: o => `<button data-act="employ" data-id="${esc(o.id)}">登用 ${Math.round(SG.captiveChance(s, o) * 100)}%</button> <button data-act="release" data-id="${esc(o.id)}">解放</button> <button data-act="execute" data-id="${esc(o.id)}">処断</button>` })}<div class="msg" id="msg"></div><div class="actions"><button data-close>あとで</button></div>`, box => {
      for (const b of box.querySelectorAll('[data-act]')) b.addEventListener('click', () => {
        const r = SG.decideCaptive(s, b.dataset.id, b.dataset.act); save();
        $('modal').hidden = true; render();
        if (s.captives.length) { showCaptives(); $('msg').textContent = r.msg; } else nextQueued();
      });
    });
  }
  function showEnd() {
    modal(`<h2>${s.over === 'win' ? '天下統一' : '滅亡'}</h2><div class="result ${s.over === 'win' ? 'win' : 'lose'}">${s.over === 'win' ? `${esc(SG.forceName(s, s.player))}が天下を統一した！（${SG.dateText(s)}）` : `${esc(s.forces[s.player].ruler)}軍は滅亡した……（${SG.dateText(s)}）`}</div><div class="actions"><button data-close>地図を見る</button><button id="again" class="primary">最初から</button></div>`, () => {
      $('again').addEventListener('click', reset);
    });
  }

  // ---------- 一覧 ----------
  function showForces() {
    const fs = Object.values(s.forces).filter(f => f.alive).map(f => ({ f, sum: SG.forceSummary(s, f.id) })).sort((a, b) => b.sum.cities - a.sum.cities);
    modal(`<h2>勢力一覧</h2><table><tr><th>勢力</th><th>君主の能力（統武知政魅）</th><th>都市</th><th>武将</th><th>兵</th><th>金</th></tr>${fs.map(({ f, sum }) => { const r = s.officers[f.ruler]; return `<tr><td><span class="chip" style="background:${f.color}"></span> ${esc(f.ruler)}軍${f.id === s.player ? '（自軍）' : ''}</td><td>${r.lead}・${r.war}・${r.int}・${r.pol}・${r.cha}</td><td>${sum.cities}</td><td>${sum.officers}</td><td>${man(sum.troops)}</td><td>${sum.gold}</td></tr>`; }).join('')}</table><div class="actions"><button data-close>閉じる</button></div>`);
  }
  function showOfficers() {
    const list = SG.membersOf(s, s.player).sort((a, b) => (a.city > b.city ? 1 : a.city < b.city ? -1 : 0));
    modal(`<h2>武将一覧（${list.length}人）</h2>${statsTable(list, { pick: true, showActed: true, extraHead: '都市', extra: o => esc(o.city) + (o.acted ? '・済' : '') })}<div class="actions"><button data-close>閉じる</button></div>`, box => {
      for (const tr of box.querySelectorAll('tr.pick')) tr.addEventListener('click', () => { sel = s.officers[tr.dataset.id].city; closeModal(); focusCity(sel); });
    });
  }
  function showLog() { modal(`<h2>記録</h2><div class="report">${s.log.slice().reverse().map(l => `<div class="l-${l.kind}">${esc(l.date)} ${esc(l.text)}</div>`).join('')}</div><div class="actions"><button data-close>閉じる</button></div>`); }

  // ---------- 月を終える ----------
  // 月の終わり。AI に攻められたら止まってマス戦闘になり、決着したらつづきから進める
  function endTurn() {
    if (s.over || s.battle) return;
    s.reports = [];
    SG.startEndTurn(s);
    continueTurn();
  }
  function continueTurn() {
    const res = SG.runEndTurn(s);
    save();
    render();
    if (res === 'battle') return openBattle();
    // マス戦闘はその場で見たので、計算で決着した戦だけ報告する
    for (const rep of s.reports.splice(0).filter(r => !r.tactical)) queue.push(() => showReport(rep));
    if (s.captives.length) queue.push(showCaptives);
    nextQueued();
  }
  function openBattle() {
    SG.battleUI.open(s, {
      save,
      onEnd: () => {
        s.reports = s.reports.filter(r => !r.tactical);
        render();
        if (s.turnQueue) return continueTurn();
        if (s.captives.length) queue.push(showCaptives);
        nextQueued();
      },
    });
  }

  // ---------- 始め方 ----------
  function startScreen() {
    const sc = SG.data.scenarios[0];
    const preview = SG.newGame(sc.id, null, 1);
    const fs = Object.values(preview.forces).map(f => ({ f, sum: SG.forceSummary(preview, f.id), r: preview.officers[f.ruler] })).sort((a, b) => b.sum.cities - a.sum.cities || b.sum.officers - a.sum.officers);
    modal(`<h2>天下三分　${esc(sc.title)}</h2><p>${esc(sc.text)}</p><p class="sub">君主を選んでください。</p><div class="forces">${fs.map(({ f, sum, r }) => `<div class="force-card" data-f="${esc(f.id)}">${face(r, 'face-l')}<span class="chip" style="background:${f.color}"></span> <b>${esc(f.ruler)}</b><div class="sub">統${r.lead} 武${r.war} 知${r.int} 政${r.pol} 魅${r.cha}</div><div class="sub">都市${sum.cities}・武将${sum.officers}・兵${man(sum.troops)}</div></div>`).join('')}</div>
      <p class="note">歴史シミュレーションの名作をお手本にした、個人で遊ぶためのファン制作ゲームです。人物は史書・演義の人物で、能力値・絵・文章はこのゲーム独自のものです。</p>`, box => {
      for (const card of box.querySelectorAll('.force-card')) card.addEventListener('click', () => {
        s = SG.newGame(sc.id, card.dataset.f);
        s.interactive = true; // 攻められたらマス戦闘で迎え撃つ
        sel = s.officers[card.dataset.f].city;
        focusCity(sel, A.view.startZoom);
        save(); $('modal').hidden = true; render();
      });
    });
  }
  function reset() {
    if (s && !s.over && !confirm('いまのゲームを消して最初から始めますか？')) return;
    try { localStorage.removeItem(SG.data.rules.saveKey); } catch (e) { /* なにもしない */ }
    s = null; sel = null; queue.length = 0; endShown = false; $('modal').hidden = true;
    startScreen();
  }

  function init() {
    drawMap();
    view = SG.mapView($('map'), { ...A.view, size: SG.data.geo.size, onChange: onView });
    drawMinimap();
    view.apply();
    $('zoom-in').addEventListener('click', () => view.zoomBy(1.4));
    $('zoom-out').addEventListener('click', () => view.zoomBy(1 / 1.4));
    $('zoom-all').addEventListener('click', () => view.centerOn(SG.data.geo.size / 2, SG.data.geo.size / 2, 1));
    $('zoom-home').addEventListener('click', () => s && focusCity(capitalOf()));
    $('btn-end').addEventListener('click', endTurn);
    for (const [id, ic] of [['btn-forces', 'cmd/forces'], ['btn-officers', 'cmd/officers']]) $(id).insertAdjacentHTML('afterbegin', icon(ic));
    $('btn-forces').addEventListener('click', () => s && showForces());
    $('btn-officers').addEventListener('click', () => s && showOfficers());
    $('btn-log').addEventListener('click', () => s && showLog());
    $('btn-reset').addEventListener('click', reset);
    $('btn-captives').addEventListener('click', () => s && s.captives.length && showCaptives());
    $('modal').addEventListener('click', e => { if (e.target === $('modal') && s) closeModal(); });
    const saved = load();
    if (saved && saved.version === 1 && saved.forces[saved.player]) {
      s = saved; s.interactive = true; sel = capitalOf(); render(); focusCity(sel, A.view.startZoom);
      // 戦の途中・月の終わりの途中でやめていたら、つづきから
      if (s.battle) openBattle();
      else if (s.turnQueue) continueTurn();
      else if (s.captives.length) showCaptives();
    }
    else startScreen();
  }
  SG.ui = { get state() { return s; }, render, endTurn, startScreen };
  init();
})();
