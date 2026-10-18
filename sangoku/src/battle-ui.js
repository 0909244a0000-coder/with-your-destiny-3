// 天下三分：マス戦闘の画面（地図の上に全画面で重ねる）
// SG.battleUI.open(s, { save, onEnd(report) })：s.battle の戦を表示し、決着したら finish して onEnd を呼ぶ
var SG = typeof SG !== 'undefined' ? SG : {};
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const R = 32, W = Math.sqrt(3) * R;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let s, T, opt, sel = null, mode = 'move', root;

  const center = i => { const c = SG.tactics.colOf(T, i), r = SG.tactics.rowOf(T, i); return [W * (c + 0.5 * (r & 1)) + W / 2, R * 1.5 * r + R]; };
  const hexPts = ([x, y]) => [0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 180 * (60 * k - 30); return `${(x + R * Math.cos(a)).toFixed(1)},${(y + R * Math.sin(a)).toFixed(1)}`; }).join(' ');
  function el(tag, attrs, parent, text) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; parent.appendChild(e); return e; }
  const colorOf = side => { const f = side === 'atk' ? T.B.atkForce : T.B.defForce; return f ? s.forces[f].color : '#777'; };
  const mine = u => u && u.side === T.playerSide;
  const myTurn = () => !T.over && T.playerSide && T.phase === T.playerSide;
  const selected = () => sel && SG.tactics.byUid(T, sel);

  function open(state, options) {
    s = state; T = s.battle; opt = options; sel = null; mode = 'move';
    root = document.getElementById('battle');
    root.hidden = false;
    root.innerHTML = `<div id="b-top"></div><div id="b-main"><div id="b-field"><svg id="b-svg"></svg></div><aside id="b-side"></aside></div>`;
    const svg = document.getElementById('b-svg');
    const w = W * (T.cols + 0.5) + 4, h = R * 1.5 * (T.rows - 1) + R * 2 + 4;
    svg.setAttribute('viewBox', `-2 -2 ${w} ${h}`);
    svg.addEventListener('click', e => { const g = e.target.closest('[data-i]'); if (g) clickHex(+g.dataset.i); });
    if (!T.started && T.playerSide === 'def') return intro();
    if (!T.started) SG.tactics.advance(s, T);
    draw();
  }

  // 攻められたとき：迎え撃つか、まかせるか
  function intro() {
    const B = T.B, sum = side => B[side].reduce((a, u) => a + u.troops, 0);
    draw();
    document.getElementById('b-side').innerHTML = `<h2>敵襲！</h2><p>${esc(SG.forceName(s, B.atkForce))}が${esc(B.to)}へ攻めてきた。</p>
      <p class="sub">攻め手：${B.atk.map(u => esc(SG.tactics.nameOf(u))).join('・')}（兵${sum('atk')}）<br>守り手：${B.def.map(u => esc(SG.tactics.nameOf(u))).join('・') || 'なし'}（兵${sum('def')}）</p>
      <div class="b-acts"><button id="b-go" class="primary">迎撃する（指揮）</button><button id="b-auto">委任（自動で戦う）</button></div>`;
    document.getElementById('b-go').onclick = () => { SG.tactics.advance(s, T); opt.save(); draw(); };
    document.getElementById('b-auto').onclick = () => { SG.tactics.auto(s, T); opt.save(); draw(); };
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
    if (r) { if (!r.ok) flash(r.msg); else afterAct(); }
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
      const t = terr[T.tiles[i]], c = center(i);
      const g = el('g', { 'data-i': i, class: 'hex' }, svg);
      el('polygon', { points: hexPts(c), fill: t.color, class: 't-' + T.tiles[i] }, g);
      if (t.glyph) el('text', { x: c[0], y: c[1] + 7, class: 'glyph' }, g, t.glyph);
      if (T.gates[i] !== undefined) {
        const max = SG.data.tactics.gate.base + s.cities[T.B.to].def * SG.data.tactics.gate.perDef;
        el('rect', { x: c[0] - 18, y: c[1] + 14, width: 36, height: 4, fill: '#000' }, g);
        el('rect', { x: c[0] - 18, y: c[1] + 14, width: 36 * Math.max(0, T.gates[i]) / max, height: 4, fill: '#e0b050' }, g);
      }
      if (reach.has(i) && i !== u.pos) el('polygon', { points: hexPts(c), class: 'reach' }, g);
      if (mode === 'gate' && tg.has(String(i))) el('polygon', { points: hexPts(c), class: 'aim' }, g);
    }
    for (const x of SG.tactics.alive(T)) {
      const c = center(x.pos), id = SG.tactics.uid(x);
      const g = el('g', { 'data-i': x.pos, class: 'unit ' + (T.playerSide && x.side !== T.playerSide ? 'foe' : 'ally') + (x.acted && x.side === T.phase ? ' done' : '') + (id === sel ? ' sel' : '') + (tg.has(id) ? ' aim' : '') }, svg);
      el('circle', { cx: c[0], cy: c[1], r: 24, fill: colorOf(x.side), class: 'tok' }, g);
      if (x.commander) el('circle', { cx: c[0], cy: c[1], r: 27, class: 'cmdr' }, g);
      el('text', { x: c[0], y: c[1] + 2, class: 'uname' }, g, SG.tactics.nameOf(x).slice(0, 3));
      el('rect', { x: c[0] - 20, y: c[1] + 9, width: 40, height: 5, fill: '#000' }, g);
      el('rect', { x: c[0] - 20, y: c[1] + 9, width: 40 * Math.min(1, x.troops / x.start), height: 5, fill: x.side === T.playerSide ? '#7fd18b' : '#ef7d6d' }, g);
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
    let h = `<div class="b-phase">${myTurn() ? 'あなたの番：部隊をクリック → 青いマスへ移動 → 行動' : '相手の番'}</div>`;
    if (u) {
      const o = u.officer && s.officers[u.officer], t = SG.data.tactics.terrain[T.tiles[u.pos]];
      const n = k => SG.tactics.targets(s, T, u, k).length;
      const btn = (k, label, extra) => `<button data-k="${k}" class="${mode === k ? 'on' : ''}" ${n(k) ? '' : 'disabled'}>${label}${extra || ''}</button>`;
      const fireTarget = SG.tactics.targets(s, T, u, 'fire')[0];
      h += `<h3>${esc(SG.tactics.nameOf(u))}隊${u.commander ? '（総大将）' : ''}</h3>
        <div class="sub">兵 ${u.troops}／${u.start}　${o ? `統${o.lead} 武${o.war} 知${o.int}` : ''}<br>地形：${t.name}（守り×${SG.tactics.guard(s, T, u).toFixed(2)}）　移動力 ${SG.tactics.moveOf(s, u)}</div>
        <div class="b-acts">${btn('attack', '攻撃')}${btn('bow', '弓')}${btn('fire', '火計', fireTarget ? ` ${Math.round(SG.tactics.fireChance(s, T, u, SG.tactics.byUid(T, fireTarget)) * 100)}%` : '')}${btn('duel', '一騎打ち')}${btn('gate', '城門')}
        <button data-k="wait">待機</button>${T.undo && T.undo.id === sel ? '<button data-k="undo">移動を戻す</button>' : ''}</div>
        <div class="sub">攻撃・一騎打ち・城門は隣、弓・火計は2マス先まで。敵をクリックで実行</div>`;
    }
    h += `<div class="msg" id="b-msg"></div>`;
    const list = side2 => B[side2].map(x => `<tr class="${x.troops > 0 && mine(x) && !x.acted && myTurn() ? 'pick' : ''} ${SG.tactics.uid(x) === sel ? 'on' : ''}" data-u="${SG.tactics.uid(x)}"><td>${x.commander ? '★' : ''}${esc(SG.tactics.nameOf(x))}</td><td>${x.troops > 0 ? x.troops : '敗走'}</td><td>${x.troops > 0 && x.side === T.phase && x.acted ? '済' : ''}</td></tr>`).join('');
    h += `<h3>攻め手</h3><table>${list('atk')}</table><h3>守り手</h3><table>${list('def')}</table>`;
    h += `<div class="report b-log">${B.lines.slice(-14).map(l => `<div>${esc(l)}</div>`).join('')}</div>`;
    h += `<div class="b-acts">${myTurn() ? '<button id="b-end" class="primary">ターン終了</button>' : ''}<button id="b-auto">委任（自動）</button>${T.playerSide === 'atk' ? '<button id="b-retreat">撤退</button>' : ''}</div>`;
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
    if (end) end.onclick = () => { sel = null; mode = 'move'; SG.tactics.endTurn(s, T); opt.save(); draw(); };
    document.getElementById('b-auto').onclick = () => { if (confirm('残りの戦いをAIにまかせますか？')) { SG.tactics.auto(s, T); opt.save(); draw(); } };
    const ret = document.getElementById('b-retreat');
    if (ret) ret.onclick = () => { if (confirm('兵を引きますか？（この戦いは負けになる）')) { SG.tactics.retreat(s, T); opt.save(); draw(); } };
  }

  function result(side) {
    const B = T.B, mineWin = T.playerSide ? (T.playerSide === 'atk') === T.win : (B.atkForce === s.player) === T.win;
    side.innerHTML = `<div class="result ${mineWin ? 'win' : 'lose'}">${mineWin ? '勝利！' : '敗北……'}</div>
      <p>${T.win ? `${esc(B.to)}は落ちた。` : `${esc(B.to)}は守られた。`}（${T.day}日目）</p>
      <div class="report b-log">${B.lines.slice(-14).map(l => `<div>${esc(l)}</div>`).join('')}</div>
      <div class="b-acts"><button id="b-close" class="primary">戦を終える</button></div>`;
    document.getElementById('b-close').onclick = () => {
      const report = SG.tactics.finish(s, T);
      root.hidden = true; root.innerHTML = '';
      opt.save();
      opt.onEnd(report);
    };
  }

  SG.battleUI = { open };
})();
