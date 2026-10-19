// 天下三分：マス戦闘の画面（地図の上に全画面で重ねる）
// SG.battleUI.open(s, { save, onEnd(report) })：s.battle の戦を表示し、決着したら finish して onEnd を呼ぶ
var SG = typeof SG !== 'undefined' ? SG : {};
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const R = 32, W = Math.sqrt(3) * R;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let s, T, opt, sel = null, mode = 'move', root;
  // AI の手を1つずつ見せる：playing＝再生中、last＝いま見せている手、speed＝速さ（data/tactics.js の play）
  let playing = false, timer = null, last = null, speed = SG.data.tactics.play.speeds[1];

  const center = i => { const c = SG.tactics.colOf(T, i), r = SG.tactics.rowOf(T, i); return [W * (c + 0.5 * (r & 1)) + W / 2, R * 1.5 * r + R]; };
  const hexPts = ([x, y]) => [0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 180 * (60 * k - 30); return `${(x + R * Math.cos(a)).toFixed(1)},${(y + R * Math.sin(a)).toFixed(1)}`; }).join(' ');
  function el(tag, attrs, parent, text) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; parent.appendChild(e); return e; }
  const colorOf = side => { const f = side === 'atk' ? T.B.atkForce : T.B.defForce; return f ? s.forces[f].color : '#777'; };
  const mine = u => u && u.side === T.playerSide;
  const myTurn = () => !T.over && T.playerSide && T.phase === T.playerSide;
  const selected = () => sel && SG.tactics.byUid(T, sel);
  const unitLook = u => u.type || 'foot';
  const face = (u, cls) => { const f = u.officer && SG.faceOf && SG.faceOf(s.officers[u.officer]); return f ? `<img class="${cls}" src="${f}" alt="" onerror="this.remove()">` : ''; };

  function open(state, options) {
    s = state; T = s.battle; opt = options; sel = null; mode = 'move';
    root = document.getElementById('battle');
    root.hidden = false;
    stop();
    root.innerHTML = `<div id="b-top"></div><div id="b-main"><div id="b-field"><svg id="b-svg"></svg><svg id="b-fx"></svg><div id="b-banner" hidden></div><div id="b-duel" hidden></div></div><aside id="b-side"></aside></div>`;
    const svg = document.getElementById('b-svg');
    const w = W * (T.cols + 0.5) + 4, h = R * 1.5 * (T.rows - 1) + R * 2 + 4;
    svg.setAttribute('viewBox', `-2 -2 ${w} ${h}`);
    document.getElementById('b-fx').setAttribute('viewBox', `-2 -2 ${w} ${h}`);
    svg.addEventListener('click', e => { const g = e.target.closest('[data-i]'); if (g) clickHex(+g.dataset.i); });
    if (!T.started && T.playerSide === 'def') return intro();
    draw();
    play();
  }

  // ---------- 1手ずつ再生 ----------
  function play() { if (playing || T.over) return; playing = true; tick(); }
  function stop() { playing = false; clearTimeout(timer); timer = null; }
  function tick() {
    if (!playing || !s.battle) return;
    const P = SG.data.tactics.play;
    const r = SG.tactics.stepAI(s, T);
    if (!r) { stop(); last = null; opt.save(); draw(); return; }
    if (r.phaseEnd) { last = null; opt.save(); draw(); dayBanner(); timer = setTimeout(tick, P.phaseMs / speed); return; }
    last = r;
    draw();
    animate(r);
    if (r.act) setTimeout(() => effects(r.act), r.from !== r.to ? P.slideMs / speed : 0);
    const dt = duelTime(r);
    timer = setTimeout(tick, (dt ? dt + P.slideMs : r.act ? P.actMs : P.moveMs) / speed);
  }
  // ---------- 演出（数字・火・矢・一騎打ち・敗走） ----------
  // 戦場の上に重ねた #b-fx に描き、決まった時間で消す。draw() で描き直しても消えない
  function fxEl(tag, attrs, text, ms) {
    const layer = document.getElementById('b-fx'); if (!layer) return null;
    const e = el(tag, attrs, layer, text);
    const dur = ms / Math.sqrt(speed);
    e.style.animationDuration = dur + 'ms';
    setTimeout(() => e.remove(), dur);
    return e;
  }
  const A = () => SG.data.art;
  function num(pos, text, cls, dy) { if (pos === undefined) return; const [x, y] = center(pos); fxEl('text', { x, y: y - 20 + (dy || 0), class: 'fx-num ' + cls }, text, 1300); }
  function burst(pos, cls) { if (pos === undefined) return; const [x, y] = center(pos); fxEl('circle', { cx: x, cy: y - 5, r: 24, class: 'fx-burst ' + cls }, undefined, 600); }
  function pic(pos, path, size, ms) { if (pos === undefined) return; const [x, y] = Array.isArray(pos) ? pos : center(pos); const [d, n] = path.split('/'); fxEl('image', { href: A()[d] + n + '.webp', x: x - size / 2, y: y - size / 2 - 5, width: size, height: size, class: 'fx-pic' }, undefined, ms || 1100); }
  function words(pos, text, cls, ms) { const [x, y] = Array.isArray(pos) ? pos : center(pos); fxEl('text', { x, y, class: 'fx-words ' + (cls || '') }, text, ms || 1400); }
  function arrow(from, to) {
    if (from === undefined || to === undefined) return;
    const [x1, y1] = center(from), [x2, y2] = center(to);
    const e = fxEl('line', { x1, y1: y1 - 8, x2, y2: y2 - 8, class: 'fx-arrow' }, undefined, 500);
    if (e) e.style.strokeDasharray = e.style.strokeDashoffset = Math.hypot(x2 - x1, y2 - y1);
  }
  function effects(a) {
    if (!a || !a.fx) return;
    const late = (f, ms) => setTimeout(f, ms / Math.sqrt(speed));
    for (const f of a.fx) {
      if (f.type === 'hit') {
        if (a.kind === 'bow') { arrow(a.from, f.pos); late(() => { burst(f.pos, 'white'); num(f.pos, '-' + f.loss, 'dmg'); }, 300); }
        else { burst(f.pos, 'white'); num(f.pos, '-' + f.loss, 'dmg'); }
      } else if (f.type === 'counter') late(() => num(f.pos, '反撃 -' + f.loss, 'ctr', 14), 250);
      else if (f.type === 'fire') { pic(f.pos, 'event/fire', 64); burst(f.pos, 'fire'); num(f.pos, '-' + f.loss, 'dmg'); }
      else if (f.type === 'miss') { pic(f.pos, 'event/fire', 40, 500); words(f.pos, '見破られた', 'gray'); }
      else if (f.type === 'refuse') words(f.pos, '応じず', 'gray');
      else if (f.type === 'charge') words([center(f.pos)[0], center(f.pos)[1] - 40], '突撃！', 'gold', 900);
      else if (f.type === 'duel') duelScreen(f);
      else if (f.type === 'gate') {
        burst(f.pos, 'fire'); num(f.pos, '-' + f.loss, 'dmg');
        if (f.broken) { pic(f.pos, 'event/fall', 80, 1600); words(f.pos, '城門突破！', 'big'); }
      }
      if (f.routed) late(() => { pic(f.pos, f.captured ? 'event/capture' : 'event/rout', 56, 1400); words([center(f.pos)[0], center(f.pos)[1] + 34], f.captured ? '捕縛' : '敗走', 'red'); }, 450);
    }
  }
  // 一騎打ちの画面：2人の顔と体力の棒、1合ずつ
  function duelScreen(f) {
    const box = document.getElementById('b-duel'); if (!box || !f.rounds) return;
    const P = SG.data.tactics.play, A = s.officers[f.ida], B2 = s.officers[f.idb];
    const side = (o, k) => `<div class="d-side d-${k}">${o && SG.faceOf(o) ? `<img src="${SG.faceOf(o)}" alt="">` : ''}<b>${esc(o.id)}</b><span>武力 ${o.war}${SG.hasSkill(o, 'hero') ? '（勇将+10）' : ''}</span><div class="d-hp"><i id="d-hp-${k}" style="width:100%"></i></div></div>`;
    box.innerHTML = `<div class="d-title">一騎打ち！</div><div class="d-row">${side(A, 'a')}<div class="d-vs">VS</div>${side(B2, 'b')}</div><div class="d-msg" id="d-msg">　</div>`;
    box.hidden = false;
    clearTimeout(box._t);
    let k = 0;
    const step = () => {
      const r = f.rounds[k];
      if (!r) {
        document.getElementById('d-msg').innerHTML = `<span class="d-win">${f.winner ? esc(f.winner) + 'の勝ち！' : '勝負つかず'}</span>`;
        box._t = setTimeout(() => { box.hidden = true; }, P.duelEndMs / speed);
        return;
      }
      document.getElementById('d-hp-a').style.width = r.ha + '%';
      document.getElementById('d-hp-b').style.width = r.hb + '%';
      const hitter = r.hit === 'a' ? A : B2, target = r.hit === 'a' ? 'b' : 'a';
      const el2 = box.querySelector('.d-' + target); el2.classList.remove('shake'); void el2.offsetWidth; el2.classList.add('shake');
      document.getElementById('d-msg').textContent = `${k + 1}合目：${hitter.id}の一撃！ -${r.dmg}`;
      k++;
      box._t = setTimeout(step, P.duelRoundMs / speed);
    };
    box._t = setTimeout(step, P.duelRoundMs / speed);
  }
  // 一騎打ちを見せるのにかかる時間
  const duelTime = r => { const f = r.act && r.act.fx && r.act.fx.find(x => x.type === 'duel'); const P = SG.data.tactics.play; return f ? (f.rounds.length + 1) * P.duelRoundMs + P.duelEndMs : 0; };
  function dayBanner() {
    if (T.over) return;
    const svg = document.getElementById('b-fx'), vb = svg.viewBox.baseVal;
    words([vb.x + vb.width / 2, vb.y + vb.height / 2], T.phase === 'atk' ? `${T.day}日目` : '守り手の番', T.phase === 'atk' ? 'day' : 'phase', 1000);
  }

  // 結果まで（指揮していればプレイヤーの番まで）一気に進める
  function skip() { stop(); SG.tactics.advance(s, T); last = null; opt.save(); draw(); }
  // 動いた駒を、元のマスからすべらせる
  function animate(r) {
    if (r.from === r.to || r.to === undefined) return;
    const g = document.querySelector(`#b-svg .unit[data-u="${r.id}"]`); if (!g) return;
    const [fx, fy] = center(r.from), [tx, ty] = center(r.to);
    g.style.transition = 'none';
    g.style.transform = `translate(${fx - tx}px,${fy - ty}px)`;
    g.getBoundingClientRect();
    requestAnimationFrame(() => { g.style.transition = `transform ${SG.data.tactics.play.slideMs / speed}ms ease-out`; g.style.transform = 'translate(0px,0px)'; });
  }

  // 攻められたとき：迎え撃つか、まかせるか
  function intro() {
    const B = T.B, sum = side => B[side].reduce((a, u) => a + u.troops, 0);
    draw();
    document.getElementById('b-side').innerHTML = `<h2>敵襲！</h2><p>${esc(SG.forceName(s, B.atkForce))}が${esc(B.to)}へ攻めてきた。</p>
      <p class="sub">攻め手：${B.atk.map(u => esc(SG.tactics.nameOf(u))).join('・')}（兵${sum('atk')}）<br>守り手：${B.def.map(u => esc(SG.tactics.nameOf(u))).join('・') || 'なし'}（兵${sum('def')}）</p>
      <div class="b-acts"><button id="b-go" class="primary">迎撃する（指揮）</button><button id="b-auto">委任（自動で戦う）</button></div>`;
    document.getElementById('b-go').onclick = () => { draw(); play(); };
    document.getElementById('b-auto').onclick = () => { SG.tactics.delegate(T); draw(); play(); };
  }

  function clickHex(i) {
    if (!myTurn()) return;
    const u = selected(), at = SG.tactics.unitAt(T, i);
    if (at && mine(at) && !at.acted && at !== u) { sel = SG.tactics.uid(at); mode = 'move'; return draw(); }
    if (!u) return;
    let r = null;
    if (mode !== 'move') {
      const target = mode === 'gate' ? i : at && SG.tactics.uid(at);
      if (target !== null && target !== undefined) r = SG.tactics.act(s, T, sel, mode, target);
    } else if (at && !mine(at) && SG.tactics.targets(s, T, u, 'attack').includes(SG.tactics.uid(at))) r = SG.tactics.act(s, T, sel, 'attack', SG.tactics.uid(at));
    else if (!at && !u.moved) r = SG.tactics.move(s, T, sel, i);
    // act は msg が空で返る（move は「〜が移動」）。行動のときだけ演出を出す
    if (r) { if (!r.ok) flash(r.msg); else { const acted = r.msg === ''; afterAct(); if (acted) effects(T.lastAct); } }
  }
  function afterAct() {
    const u = selected();
    if (!u || u.troops <= 0 || u.acted) { sel = null; mode = 'move'; }
    opt.save(); draw();
  }
  function flash(msg) { const m = document.getElementById('b-msg'); if (m) m.textContent = msg; }

  function draw() {
    const svg = document.getElementById('b-svg'); svg.innerHTML = '';
    const u = selected(), terr = SG.data.tactics.terrain;
    const reach = u && myTurn() && !u.moved && mode === 'move' ? SG.tactics.reachable(s, T, u) : new Map();
    const tg = new Set(u && myTurn() ? (mode === 'move' ? SG.tactics.targets(s, T, u, 'attack') : SG.tactics.targets(s, T, u, mode)).map(String) : []);
    for (let i = 0; i < T.tiles.length; i++) {
      const t = terr[T.tiles[i]], c = center(i), A = SG.data.art;
      const g = el('g', { 'data-i': i, class: 'hex' }, svg);
      el('polygon', { points: hexPts(c), fill: t.color, class: 't-' + T.tiles[i] }, g);
      // 地形の絵（六角形・透明背景の正方形）。読めなければ色と字のまま
      if (A.battleTiles.includes(T.tiles[i])) {
        const flip = A.flipTiles.includes(T.tiles[i]) && (i * 7 + (i >> 3)) % 3 === 0;
        const img = el('image', { href: A.battle + T.tiles[i] + '.webp', x: c[0] - R, y: c[1] - R, width: 2 * R, height: 2 * R, transform: flip ? `translate(${2 * c[0]},0) scale(-1,1)` : '' }, g);
        img.addEventListener('error', () => img.remove());
      } else if (t.glyph) el('text', { x: c[0], y: c[1] + 7, class: 'glyph' }, g, t.glyph);
      el('polygon', { points: hexPts(c), class: 'edge' }, g);
      if (T.gates[i] !== undefined) {
        const max = SG.data.tactics.gate.base + s.cities[T.B.to].def * SG.data.tactics.gate.perDef;
        el('rect', { x: c[0] - 18, y: c[1] + 14, width: 36, height: 4, fill: '#000' }, g);
        el('rect', { x: c[0] - 18, y: c[1] + 14, width: 36 * Math.max(0, T.gates[i]) / max, height: 4, fill: '#e0b050' }, g);
      }
      if (reach.has(i) && i !== u.pos) el('polygon', { points: hexPts(c), class: 'reach' }, g);
      if (mode === 'gate' && tg.has(String(i))) el('polygon', { points: hexPts(c), class: 'aim' }, g);
    }
    // いま見せている手：動いた道筋と、狙った城門
    if (last) {
      if (last.to !== undefined && last.from !== last.to) { const [fx, fy] = center(last.from), [tx, ty] = center(last.to); el('line', { x1: fx, y1: fy, x2: tx, y2: ty, class: 'trail' }, svg); }
      if (last.act && typeof last.act.target === 'number') el('polygon', { points: hexPts(center(last.act.target)), class: 'gatehit' }, svg);
    }
    const banner = document.getElementById('b-banner');
    if (banner) { banner.hidden = !last || !last.lines.length; if (last) banner.innerHTML = last.lines.slice(-4).map(l => `<div>${esc(l.replace(/^\d+日目：/, ''))}</div>`).join(''); }
    for (const x of SG.tactics.alive(T)) {
      const c = center(x.pos), id = SG.tactics.uid(x);
      const side0 = T.playerSide || T.mySide;
      const g = el('g', { 'data-i': x.pos, 'data-u': id, class: 'unit ' + (side0 && x.side !== side0 ? 'foe' : 'ally') + (last && last.id === id ? ' acting' : '') + (last && last.act && last.act.target === id ? ' hit' : '') + (x.acted && x.side === T.phase ? ' done' : '') + (id === sel ? ' sel' : '') + (tg.has(id) ? ' aim' : '') }, svg);
      // 駒：勢力の色の円に兵の絵（総大将・弓・騎兵・歩兵は武将の能力で見た目だけ変える）、下に名前の札と兵の棒
      const cy = c[1] - 5;
      el('circle', { cx: c[0], cy, r: 23, fill: colorOf(x.side), class: 'tok' }, g);
      // 武将の顔を円く切り抜いて駒にする（顔がない守備兵などは兵の絵）
      const faceUrl = x.officer && SG.faceOf && SG.faceOf(s.officers[x.officer]);
      const clip = 'clip-' + id.replace(':', '-');
      el('circle', { cx: c[0], cy, r: 21 }, el('clipPath', { id: clip }, g));
      const img = el('image', { href: faceUrl || SG.data.art.battle + 'unit_' + unitLook(x) + '.webp', x: c[0] - 21, y: cy - 21, width: 42, height: 42, class: 'tokimg', 'clip-path': `url(#${clip})`, preserveAspectRatio: 'xMidYMid slice' }, g);
      img.addEventListener('error', () => img.setAttribute('href', SG.data.art.battle + 'unit_' + unitLook(x) + '.webp'));
      el('circle', { cx: c[0], cy, r: 23, class: 'ring', stroke: colorOf(x.side) }, g);
      if (x.commander) el('circle', { cx: c[0], cy, r: 27, class: 'cmdr' }, g);
      // 兵種の印（右上の小さな丸に 歩・騎・弓）
      el('circle', { cx: c[0] + 18, cy: cy - 17, r: 9, class: 'tbadge t-' + unitLook(x) }, g);
      el('text', { x: c[0] + 18, y: cy - 13, class: 'tname' }, g, SG.tactics.typeOf(x).name[0]);
      el('rect', { x: c[0] - 24, y: c[1] + 14, width: 48, height: 15, rx: 3, class: 'uplate' }, g);
      el('text', { x: c[0], y: c[1] + 26, class: 'uname' }, g, SG.tactics.nameOf(x).slice(0, 3));
      el('rect', { x: c[0] - 20, y: c[1] + 29, width: 40, height: 4, fill: '#000' }, g);
      el('rect', { x: c[0] - 20, y: c[1] + 29, width: 40 * Math.min(1, x.troops / x.start), height: 4, fill: x.side === T.playerSide ? '#7fd18b' : '#ef7d6d' }, g);
    }
    drawTop(); drawSide();
  }

  function drawTop() {
    const B = T.B;
    document.getElementById('b-top').innerHTML = `<b>${esc(B.to)}の戦い</b>　${T.day}日目／${SG.data.tactics.maxDays}日
      <span class="chip" style="background:${colorOf('atk')}"></span>攻め手 ${esc(SG.forceName(s, B.atkForce))} 兵${SG.tactics.alive(T, 'atk').reduce((a, u) => a + u.troops, 0)}
      <span class="chip" style="background:${colorOf('def')}"></span>守り手 ${esc(SG.forceName(s, B.defForce))} 兵${SG.tactics.alive(T, 'def').reduce((a, u) => a + u.troops, 0)}
      ${Object.keys(T.gates).length ? '' : '　<span class="l-war">城門突破</span>'}`;
  }

  function drawSide() {
    const side = document.getElementById('b-side');
    if (T.over) return result(side);
    const u = selected(), B = T.B;
    const who = side => side === 'atk' ? '攻め手' : '守り手';
    let h = `<div class="b-phase">${myTurn() ? 'あなたの番：部隊をクリック → 青いマスへ移動 → 行動' : !T.playerSide ? `委任中：${who(T.phase)}の番` : `相手（${who(T.phase)}）の番`}</div>`;
    if (!myTurn()) {
      const P = SG.data.tactics.play;
      h += `<div class="b-acts b-play">${P.speeds.map((v, k) => `<button data-speed="${v}" class="${v === speed ? 'on' : ''}">${['ゆっくり', 'ふつう', '速い'][k] || '×' + v}</button>`).join('')}
        ${playing ? '<button id="b-pause">一時停止</button>' : '<button id="b-play" class="primary">再生</button>'}<button id="b-skip">${T.playerSide ? '自分の番まで飛ばす' : '結果まで飛ばす'}</button>
        ${!T.playerSide && T.mySide ? '<button id="b-command">指揮に戻る</button>' : ''}</div>`;
    }
    if (u) {
      const o = u.officer && s.officers[u.officer], t = SG.data.tactics.terrain[T.tiles[u.pos]];
      const n = k => SG.tactics.targets(s, T, u, k).length;
      const btn = (k, label, extra) => `<button data-k="${k}" class="${mode === k ? 'on' : ''}" ${n(k) ? '' : 'disabled'}>${label}${extra || ''}</button>`;
      const fireTarget = SG.tactics.targets(s, T, u, 'fire')[0];
      h += `<h3>${face(u, 'face-l')}${esc(SG.tactics.nameOf(u))}隊${u.commander ? '（総大将）' : ''}</h3>
        ${o && SG.data.skills.of[o.id] ? `<div class="skills">${SG.data.skills.of[o.id].map(k => `<span class="skill" title="${SG.data.skills.list[k].text}">${SG.data.skills.list[k].name}</span>`).join('')}</div>` : ''}
        <div class="sub">${SG.tactics.typeOf(u).name}　兵 ${u.troops}／${u.start}　${o ? `統${o.lead} 武${o.war} 知${o.int}` : ''}<br>地形：${t.name}（守り×${SG.tactics.guard(s, T, u).toFixed(2)}）　移動力 ${SG.tactics.moveOf(s, u)}</div>
        <div class="b-acts">${btn('attack', '攻撃')}${btn('bow', '弓')}${btn('fire', '火計', fireTarget ? ` ${Math.round(SG.tactics.fireChance(s, T, u, SG.tactics.byUid(T, fireTarget)) * 100)}%` : '')}${btn('duel', '一騎打ち')}${btn('gate', '城門')}
        <button data-k="wait">待機</button>${T.undo && T.undo.id === sel ? '<button data-k="undo">移動を戻す</button>' : ''}</div>
        <div class="sub">攻撃・一騎打ち・城門は隣、弓は${SG.tactics.typeOf(u).bow ? SG.tactics.typeOf(u).bow.range + 'マス先まで' : '撃てない（騎兵）'}、火計は2マス先まで。敵をクリックで実行${SG.tactics.typeOf(u).charge ? '。移動してから攻撃すると突撃' : ''}</div>`;
    }
    h += `<div class="msg" id="b-msg"></div>`;
    const list = side2 => B[side2].map(x => `<tr class="${x.troops > 0 && mine(x) && !x.acted && myTurn() ? 'pick' : ''} ${SG.tactics.uid(x) === sel ? 'on' : ''}" data-u="${SG.tactics.uid(x)}"><td>${face(x, 'face')}${x.commander ? '★' : ''}${esc(SG.tactics.nameOf(x))}</td><td>${x.troops > 0 ? x.troops : '敗走'}</td><td>${x.troops > 0 && x.side === T.phase && x.acted ? '済' : ''}</td></tr>`).join('');
    h += `<h3>攻め手</h3><table>${list('atk')}</table><h3>守り手</h3><table>${list('def')}</table>`;
    h += `<div class="report b-log">${B.lines.slice(-14).map(l => `<div>${esc(l)}</div>`).join('')}</div>`;
    if (myTurn()) h += `<div class="b-acts"><button id="b-end" class="primary">ターン終了</button><button id="b-auto">委任（自動）</button>${T.playerSide === 'atk' ? '<button id="b-retreat">撤退</button>' : ''}</div>`;
    side.innerHTML = h;
    const log = side.querySelector('.b-log'); log.scrollTop = 1e9;
    for (const b of side.querySelectorAll('[data-k]')) b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'wait') { SG.tactics.act(s, T, sel, 'wait'); return afterAct(); }
      if (k === 'undo') { SG.tactics.undoMove(T); mode = 'move'; opt.save(); return draw(); }
      mode = mode === k ? 'move' : k; draw();
    };
    for (const tr of side.querySelectorAll('tr.pick')) tr.onclick = () => { sel = tr.dataset.u; mode = 'move'; draw(); };
    const end = document.getElementById('b-end');
    if (end) end.onclick = () => { sel = null; mode = 'move'; SG.tactics.endMyPhase(s, T); opt.save(); draw(); play(); };
    const auto = document.getElementById('b-auto');
    if (auto) auto.onclick = () => { sel = null; mode = 'move'; SG.tactics.delegate(T); draw(); play(); };
    const on = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = f; };
    on('b-play', () => { play(); draw(); });
    on('b-pause', () => { stop(); draw(); });
    on('b-skip', skip);
    on('b-command', () => { SG.tactics.command(T); draw(); });
    for (const b of side.querySelectorAll('[data-speed]')) b.onclick = () => { speed = +b.dataset.speed; draw(); };
    const ret = document.getElementById('b-retreat');
    if (ret) ret.onclick = () => { if (confirm('兵を引きますか？（この戦いは負けになる）')) { SG.tactics.retreat(s, T); opt.save(); draw(); } };
  }

  function result(side) {
    const B = T.B, me = T.playerSide || T.mySide, mineWin = me ? (me === 'atk') === T.win : (B.atkForce === s.player) === T.win;
    side.innerHTML = `<div class="result ${mineWin ? 'win' : 'lose'}">${mineWin ? '勝利！' : '敗北……'}</div>
      <p>${T.win ? `${esc(B.to)}は落ちた。` : `${esc(B.to)}は守られた。`}（${T.day}日目）</p>
      <div class="report b-log">${B.lines.slice(-14).map(l => `<div>${esc(l)}</div>`).join('')}</div>
      <div class="b-acts"><button id="b-close" class="primary">戦を終える</button></div>`;
    document.getElementById('b-close').onclick = () => {
      stop(); last = null;
      const report = SG.tactics.finish(s, T);
      root.hidden = true; root.innerHTML = '';
      opt.save();
      opt.onEnd(report);
    };
  }

  SG.battleUI = { open };
})();
