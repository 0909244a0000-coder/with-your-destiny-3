// 天下三分：マス戦闘のしくみ（画面に依存しない。node でも動く）
// 六角形のマス（横に並ぶ行が交互にずれる "odd-r"）。T（戦場）は s.battle に入る素のデータで、そのままセーブできる。
// 部隊は B（src/game.js の prepareBattle）の B.atk・B.def の要素に、位置などを足して使う
var SG = typeof SG !== 'undefined' ? SG : {};
(function () {
  const D = () => SG.data.tactics;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- 六角形のマス ----------
  const idxOf = (T, c, r) => r * T.cols + c;
  const colOf = (T, i) => i % T.cols, rowOf = (T, i) => Math.floor(i / T.cols);
  const DIRS = [[[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]], [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]]];
  function neighbors(T, i) {
    const c = colOf(T, i), r = rowOf(T, i), out = [];
    for (const [dc, dr] of DIRS[r & 1]) { const nc = c + dc, nr = r + dr; if (nc >= 0 && nr >= 0 && nc < T.cols && nr < T.rows) out.push(idxOf(T, nc, nr)); }
    return out;
  }
  function cube(T, i) { const c = colOf(T, i), r = rowOf(T, i), x = c - (r - (r & 1)) / 2; return [x, r, -x - r]; }
  function dist(T, a, b) { const p = cube(T, a), q = cube(T, b); return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); }
  const terr = (T, i) => D().terrain[T.tiles[i]];

  // ---------- 部隊 ----------
  const units = T => T.B.atk.concat(T.B.def);
  const alive = (T, side) => (side ? T.B[side] : units(T)).filter(u => u.troops > 0);
  const other = side => side === 'atk' ? 'def' : 'atk';
  const unitAt = (T, i) => units(T).find(u => u.troops > 0 && u.pos === i);
  const uid = u => u.side + ':' + u.n;
  const byUid = (T, id) => units(T).find(u => uid(u) === id);
  const nameOf = u => u.officer || '守備兵';
  const officer = (s, u) => u.officer ? s.officers[u.officer] : null;
  // 兵種（u.type）。決まっていなければ武将の能力でおまかせ
  function autoType(o) { return !o ? 'foot' : o.int > o.war ? 'bow' : o.war >= D().autoHorseWar ? 'horse' : 'foot'; }
  const typeOf = u => D().types[u.type] || D().types.foot;
  const moveOf = (s, u) => D().move.base + typeOf(u).move + ((officer(s, u) || { lead: 0 }).lead >= D().move.bonusLead ? 1 : 0);
  const stepCost = (T, u, j) => terr(T, j).cost + (['forest', 'mountain'].includes(T.tiles[j]) ? typeOf(u).rough : 0);
  const say = (T, text) => T.B.lines.push(`${T.day}日目：${text}`);

  // ---------- 戦場を作る ----------
  function nearRiver(cityId) {
    const c = SG.data.cities.find(x => x.id === cityId);
    let best = 1e9;
    for (const line of Object.values(SG.data.geo.rivers)) for (let k = 1; k < line.length; k++) {
      const [ax, ay] = line[k - 1], [bx, by] = line[k], dx = bx - ax, dy = by - ay;
      const t = clamp(((c.lon - ax) * dx + (c.lat - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      best = Math.min(best, Math.hypot(c.lon - ax - t * dx, c.lat - ay - t * dy));
    }
    return best < D().riverDist;
  }
  function makeField(s, T, cityId) {
    const d = D(), n = T.cols * T.rows;
    T.tiles = new Array(n).fill('plain');
    // 城：右側。本陣のまわり1マスが城内、2マス目が城壁で、西向きの2マスが城門
    T.keep = idxOf(T, T.cols - 3, Math.floor(T.rows / 2));
    const ring = [];
    for (let i = 0; i < n; i++) { const k = dist(T, i, T.keep); if (k === 1) T.tiles[i] = 'town'; if (k === 2) ring.push(i); }
    T.tiles[T.keep] = 'keep';
    for (const i of ring) T.tiles[i] = 'wall';
    ring.sort((a, b) => colOf(T, a) - colOf(T, b) || Math.abs(rowOf(T, a) - rowOf(T, T.keep)) - Math.abs(rowOf(T, b) - rowOf(T, T.keep)));
    T.gates = {};
    for (const i of ring.slice(0, 2)) { T.tiles[i] = 'gate'; T.gates[i] = d.gate.base + s.cities[cityId].def * d.gate.perDef; }
    // 城のまわりと、攻め手の陣（左の2列）は平地のまま
    const keepClear = i => dist(T, i, T.keep) <= 3 || colOf(T, i) <= 1;
    const prov = SG.data.cities.find(x => x.id === cityId).province;
    const hilly = d.hilly.includes(prov) ? 1 : 0;
    const grow = (type, rate) => {
      let left = Math.round(n * rate);
      while (left > 0) {
        let i = Math.floor(SG.rand(s) * n);
        for (let k = 0; k < 5 && left > 0; k++) {
          if (!keepClear(i) && T.tiles[i] === 'plain') { T.tiles[i] = type; left--; }
          const ns = neighbors(T, i); i = ns[Math.floor(SG.rand(s) * ns.length)];
        }
        left--;
      }
    };
    grow('forest', d.forestRate[hilly]);
    grow('mountain', d.mountainRate[hilly]);
    // 川：上から下へ蛇行し、橋を2つ
    if (nearRiver(cityId)) {
      let c = 6 + Math.floor(SG.rand(s) * 4);
      const path = [];
      for (let r = 0; r < T.rows; r++) { c = clamp(c + Math.floor(SG.rand(s) * 3) - 1, 4, T.cols - 8); const i = idxOf(T, c, r); T.tiles[i] = 'river'; path.push(i); }
      for (const k of [Math.floor(T.rows * 0.3), Math.floor(T.rows * 0.7)]) T.tiles[path[k]] = 'bridge';
    }
  }

  // ---------- 始める ----------
  // playerSide：プレイヤーが指揮する側（'atk' / 'def'）。null なら両軍AI
  function create(s, B, playerSide) {
    const T = { B, playerSide, cols: D().cols, rows: D().rows, day: 1, phase: 'atk', over: false, win: null, started: false };
    makeField(s, T, B.to);
    // 内応で城門が開いている
    if (B.gatesOpen) for (const g of Object.keys(T.gates)) { T.tiles[g] = 'broken'; delete T.gates[g]; }
    for (const u of B.atk.concat(B.def)) if (!D().types[u.type]) u.type = autoType(u.officer && s.officers[u.officer]);
    B.atk.forEach((u, n) => Object.assign(u, { n, commander: n === 0 }));
    B.def.forEach((u, n) => Object.assign(u, { n, commander: n === 0 }));
    // 攻め手は左の端、中ほどから。守り手は総大将が本陣、ほかは城門に近い城内から
    const mid = Math.floor(T.rows / 2);
    const start = [];
    for (let c = 0; c < 3; c++) for (let r = 0; r < T.rows; r++) start.push(idxOf(T, c, r));
    start.sort((a, b) => colOf(T, b) - colOf(T, a) + (Math.abs(rowOf(T, a) - mid) - Math.abs(rowOf(T, b) - mid)) * 3);
    const free = start.filter(i => terr(T, i).cost !== null && T.tiles[i] !== 'river');
    B.atk.forEach((u, k) => { u.pos = free[k]; });
    const inside = [];
    for (let i = 0; i < T.tiles.length; i++) if (T.tiles[i] === 'town') inside.push(i);
    inside.sort((a, b) => colOf(T, a) - colOf(T, b));
    B.def.forEach((u, k) => { u.pos = k === 0 ? T.keep : inside[k - 1]; });
    for (const u of units(T)) { u.moved = false; u.acted = false; }
    B.lines.push(`戦場：${B.to}の${T.tiles.includes('river') ? '川をはさむ野' : '野'}。${B.atk.length}部隊が${B.def.length}部隊の守る城へ。`);
    check(s, T);
    return T;
  }

  // ---------- 動ける場所 ----------
  // 動けるマス：Map(マス → 使った移動力)。敵の隣に入ったらそこで止まる。味方は通り抜けられる
  function passable(T, i, side) {
    const t = terr(T, i);
    if (t.cost === null) return false;
    if (T.tiles[i] === 'gate' && side === 'atk') return false;
    return true;
  }
  function reachable(s, T, u) {
    const mp = u.moved ? 0 : moveOf(s, u);
    const enemyNear = i => neighbors(T, i).some(j => { const e = unitAt(T, j); return e && e.side !== u.side; });
    const best = new Map([[u.pos, 0]]), q = [u.pos];
    while (q.length) {
      q.sort((a, b) => best.get(a) - best.get(b));
      const i = q.shift();
      if (i !== u.pos && enemyNear(i)) continue;
      for (const j of neighbors(T, i)) {
        if (!passable(T, j, u.side)) continue;
        const e = unitAt(T, j); if (e && e.side !== u.side) continue;
        const cost = best.get(i) + stepCost(T, u, j);
        if (cost > mp || (best.has(j) && best.get(j) <= cost)) continue;
        best.set(j, cost); q.push(j);
      }
    }
    for (const i of [...best.keys()]) { const e = unitAt(T, i); if (e && e !== u) best.delete(i); }
    return best;
  }

  // 行動できる相手。kind：attack（隣）・bow（2マス）・fire（2マス）・duel（隣の武将）・gate（隣の城門）
  function targets(s, T, u, kind) {
    if (kind === 'gate') return u.side === 'atk' ? neighbors(T, u.pos).filter(i => T.tiles[i] === 'gate') : [];
    if (kind === 'bow' && !typeOf(u).bow) return [];
    const range = kind === 'bow' ? typeOf(u).bow.range : kind === 'fire' ? D().fire.range : 1;
    if ((kind === 'fire' || kind === 'duel') && !u.officer) return [];
    return alive(T, other(u.side)).filter(e => dist(T, u.pos, e.pos) <= range && (kind !== 'duel' || e.officer)).map(uid);
  }

  // ---------- 行動 ----------
  const ok = (msg, x) => Object.assign({ ok: true, msg }, x || {}), ng = msg => ({ ok: false, msg });
  function canAct(T, u) {
    if (T.over) return 'もう決着した';
    if (!u || u.troops <= 0) return '部隊がいない';
    if (u.side !== T.phase) return 'いまは相手の番';
    if (u.acted) return 'もう行動した';
    return null;
  }
  function move(s, T, id, to) {
    const u = byUid(T, id), e = canAct(T, u); if (e) return ng(e);
    if (u.moved) return ng('もう移動した');
    if (!reachable(s, T, u).has(to)) return ng('そこへは行けない');
    T.undo = { id, from: u.pos };
    u.pos = to; u.moved = true;
    check(s, T);
    return ok(`${nameOf(u)}隊が移動`);
  }
  function undoMove(T) {
    const x = T.undo; if (!x) return ng('戻せない');
    const u = byUid(T, x.id); if (u.acted) return ng('戻せない');
    u.pos = x.from; u.moved = false; T.undo = null;
    return ok('移動を取り消した');
  }
  const strength = (s, T, u) => SG.unitPower(s, u, u.side === 'atk' ? T.B.atkTrain : T.B.defTrain) * typeOf(u).atk;
  function guard(s, T, u) {
    const t = terr(T, u.pos);
    return t.def * typeOf(u).def * (t.wall && u.side === 'def' ? 1 + s.cities[T.B.to].def / D().wallDefPer : 1);
  }
  // 損害を与える。画面の演出のため、何が起きたかを T.fx に残す
  function hurt(s, T, u, loss, why, kind) {
    loss = Math.max(1, Math.round(Math.min(loss, u.troops)));
    const pos = u.pos;
    u.troops -= loss;
    const f = { type: kind || 'hit', id: uid(u), pos, loss };
    if (u.troops <= 0) { SG.routUnit(s, T.B, u, why); delete u.pos; f.routed = true; f.captured = !!u.captured; }
    if (T.fx) T.fx.push(f);
    return loss;
  }
  function act(s, T, id, kind, target) {
    const u = byUid(T, id), e = canAct(T, u); if (e) return ng(e);
    const d = D(), r = (a, b) => SG.range(s, a, b);
    const fx = T.fx = [], fromPos = u.pos;
    if (kind === 'wait') { u.acted = true; u.moved = true; T.undo = null; return ok(`${nameOf(u)}隊は待機`); }
    if (kind === 'gate') {
      if (!targets(s, T, u, 'gate').includes(target)) return ng('城門が隣にない');
      const dmg = Math.round(strength(s, T, u) / typeOf(u).atk * typeOf(u).gate * d.attackK * d.gate.k * r(0.85, 1.15));
      T.gates[target] -= dmg;
      fx.push({ type: 'gate', pos: target, loss: dmg, broken: T.gates[target] <= 0 });
      if (T.gates[target] <= 0) { T.tiles[target] = 'broken'; delete T.gates[target]; say(T, `${nameOf(u)}隊が城門を打ち破った！`); }
      else say(T, `${nameOf(u)}隊が城門を攻撃（-${dmg}、残り${Math.round(T.gates[target])}）`);
    } else {
      if (!targets(s, T, u, kind).includes(target)) return ng('届かない');
      const t = byUid(T, target);
      if (kind === 'attack') {
        // 騎兵の突撃：この日に移動してから攻撃すると強い
        const charge = typeOf(u).charge && T.undo && T.undo.id === id && T.undo.from !== u.pos ? typeOf(u).charge : 1;
        if (charge > 1 && T.fx) T.fx.push({ type: 'charge', pos: u.pos });
        const dmg = hurt(s, T, t, strength(s, T, u) * charge * d.attackK * terr(T, u.pos).atk * r(0.85, 1.15) / guard(s, T, t));
        let msg = `${nameOf(u)}隊が${charge > 1 ? '突撃！ ' : ''}${nameOf(t)}隊を攻撃 -${dmg}`;
        if (t.troops > 0) msg += `／反撃 -${hurt(s, T, u, strength(s, T, t) * d.attackK * d.counter * r(0.85, 1.15) / guard(s, T, u), null, 'counter')}`;
        say(T, msg);
      } else if (kind === 'bow') {
        say(T, `${nameOf(u)}隊の弓 → ${nameOf(t)}隊 -${hurt(s, T, t, strength(s, T, u) / typeOf(u).atk * d.attackK * typeOf(u).bow.k * r(0.85, 1.15) / guard(s, T, t))}`);
      } else if (kind === 'fire') {
        const a = officer(s, u), b = officer(s, t), wit = b ? b.int : 30;
        const p = fireChance(s, T, u, t);
        if (SG.rand(s) < p) say(T, `${a.id}の火計！ ${nameOf(t)}隊 -${hurt(s, T, t, t.troops * r(d.fire.loss[0], d.fire.loss[1]), '火に包まれ壊滅', 'fire')}`);
        else fx.push({ type: 'miss', id: uid(t), pos: t.pos }), say(T, `${a.id}の火計は${b ? b.id : '守備兵'}に見破られた（知力${a.int}対${wit}）`);
      } else if (kind === 'duel') {
        const a = officer(s, u), b = officer(s, t);
        if (b.war < a.war && SG.rand(s) < d.duelRefuse) fx.push({ type: 'refuse', id: uid(t), pos: t.pos }), say(T, `${a.id}が一騎打ちを挑んだが、${b.id}は応じなかった。`);
        else {
          const res = SG.duel(s, a, b);
          say(T, `一騎打ち！ ${a.id}（武力${a.war}） 対 ${b.id}（武力${b.war}）`);
          T.B.lines.push(...res.lines);
          fx.push({ type: 'duel', a: fromPos, b: t.pos, winner: res.winner ? res.winner.id : null });
          if (res.winner) hurt(s, T, res.winner === a ? t : u, 1e9, '一騎打ちに敗れて総崩れ');
        }
      } else return ng('命令がちがう');
    }
    if (u.troops > 0) { u.acted = true; u.moved = true; }
    T.undo = null;
    T.lastAct = { kind, target, from: fromPos, fx };
    T.fx = null;
    check(s, T);
    return ok('');
  }
  function fireChance(s, T, u, t) {
    const a = officer(s, u), b = officer(s, t), wit = b ? b.int : 30;
    return clamp(a.int / (a.int + wit) * terr(T, t.pos).fire, D().fire.min, D().fire.max);
  }

  // ---------- 決着 ----------
  function check(s, T) {
    if (T.over) return;
    const { B } = T;
    const end = (win, why) => { T.over = true; T.win = win; B.lines.push(why); };
    if (!alive(T, 'atk').length || B.atk[0].troops <= 0) return end(false, `${B.atk[0].troops <= 0 ? '総大将が崩れ、' : ''}攻め手は総崩れとなった。`);
    if (!alive(T, 'def').length) return end(true, '守り手はすべて崩れた。');
    if (B.def[0].troops <= 0) return end(true, '守りの総大将が崩れ、城は落ちた。');
    if (alive(T, 'atk').some(u => u.pos === T.keep)) return end(true, '本陣を奪った！');
  }

  // 番を進める（攻め手 → 守り手 → 次の日）。AI の番は自動で動かし、プレイヤーの番かおしまいで止まる
  function endPhase(s, T) {
    if (T.over) return;
    if (T.phase === 'atk') T.phase = 'def';
    else {
      T.phase = 'atk'; T.day++;
      if (T.day > D().maxDays) { T.day = D().maxDays; T.over = true; T.win = false; T.B.lines.push(`${D().maxDays}日たっても落とせず、攻め手は兵を引いた。`); return; }
    }
    for (const u of alive(T, T.phase)) { u.moved = false; u.acted = false; }
    T.undo = null;
  }
  // AI を1部隊ぶんだけ動かす（画面で1手ずつ見せるため）。
  // 返り値：{ id, from, to, act, lines }（部隊が動いた）／{ phaseEnd: true }（番が終わった）／null（プレイヤーの番か、決着）
  function stepAI(s, T) {
    T.started = true;
    if (T.over || (T.playerSide && T.phase === T.playerSide)) return null;
    if (!T.aiQueue) T.aiQueue = alive(T, T.phase).sort((a, b) => b.troops - a.troops).map(uid);
    while (T.aiQueue.length) {
      const u = byUid(T, T.aiQueue.shift());
      if (!u || u.troops <= 0 || u.acted) continue;
      const from = u.pos, n = T.B.lines.length;
      T.lastAct = null;
      aiUnit(s, T, u);
      return { id: uid(u), from, to: u.pos, act: T.lastAct, lines: T.B.lines.slice(n) };
    }
    T.aiQueue = null;
    endPhase(s, T);
    return { phaseEnd: true };
  }
  // AI の番を一気に進める（プレイヤーの番か、決着まで）
  function advance(s, T) {
    let guardLoop = 0;
    T.started = true;
    while (stepAI(s, T) && guardLoop++ < 100000);
  }
  // プレイヤーが番を終える。endTurn は相手の番まで一気に、endMyPhase は番を渡すだけ（あとは stepAI で1手ずつ）
  function endMyPhase(s, T) { if (T.over || T.phase !== T.playerSide) return; endPhase(s, T); }
  function endTurn(s, T) { endMyPhase(s, T); advance(s, T); }
  // AI にまかせる（delegate）／指揮に戻る（command）。auto は決着まで一気に
  function delegate(T) { if (T.playerSide) T.mySide = T.playerSide; T.playerSide = null; }
  function command(T) { if (!T.mySide) return; T.playerSide = T.mySide; T.aiQueue = null; }
  function auto(s, T) { delegate(T); advance(s, T); }
  // 攻め手が兵を引く
  function retreat(s, T) { if (T.over || T.playerSide !== 'atk') return ng('撤退できない'); T.over = true; T.win = false; T.B.lines.push('兵を引いた。'); return ok(''); }
  // 結果を国に反映する
  function finish(s, T) {
    const B = T.B;
    for (const u of units(T)) for (const k of ['n', 'pos', 'moved', 'acted', 'commander']) delete u[k];
    B.day = T.day; B.win = !!T.win; B.tactical = true;
    s.battle = null;
    return SG.finishBattle(s, B);
  }

  // ---------- AI ----------
  // 地形だけを見た、目標までの道のり（移動力の合計）
  function field(T, goals, side) {
    const best = new Array(T.tiles.length).fill(Infinity), q = [];
    for (const g of goals) { best[g] = 0; q.push(g); }
    while (q.length) {
      q.sort((a, b) => best[a] - best[b]);
      const i = q.shift();
      for (const j of neighbors(T, i)) {
        if (!passable(T, j, side) && !goals.includes(j)) continue;
        const c = best[i] + terr(T, i).cost;
        if (c < best[j]) { best[j] = c; q.push(j); }
      }
    }
    return best;
  }
  function aiUnit(s, T, u) {
    const d = D(), ai = d.ai, me = officer(s, u), id = uid(u);
    const foes = alive(T, other(u.side));
    if (!foes.length) return;
    const tryAct = (kind, t) => act(s, T, id, kind, t).ok;
    // 一騎打ち（武力でかなり上回るとき）・火計（知力が高いとき）
    if (me) {
      const weak = targets(s, T, u, 'duel').map(x => byUid(T, x)).find(t => me.war - officer(s, t).war >= ai.duelGap);
      if (weak && SG.rand(s) < ai.duelChance && tryAct('duel', uid(weak))) return;
      if (me.int >= ai.fireInt) {
        const f = targets(s, T, u, 'fire').map(x => byUid(T, x)).sort((a, b) => fireChance(s, T, u, b) * b.troops - fireChance(s, T, u, a) * a.troops)[0];
        if (f && fireChance(s, T, u, f) >= ai.fireChance && tryAct('fire', uid(f))) return;
      }
    }
    // 目標を決めて動く
    const reach = reachable(s, T, u);
    const inCastle = i => d.terrain[T.tiles[i]].wall || T.tiles[i] === 'broken';
    let dest = u.pos;
    const near = foes.filter(f => dist(T, u.pos, f.pos) <= ai.engage).sort((a, b) => a.troops - b.troops);
    if (u.side === 'def') {
      // 守り手：城から出ない。総大将は本陣を動かない。近くの敵の隣へ
      if (!u.commander) {
        const opts = [...reach.keys()].filter(inCastle);
        const tgt = near[0];
        if (tgt) dest = opts.sort((a, b) => dist(T, a, tgt.pos) - dist(T, b, tgt.pos) || d.terrain[T.tiles[b]].def - d.terrain[T.tiles[a]].def)[0] || u.pos;
      }
    } else {
      // 攻め手：近くの（たどり着ける）敵に当たる。いなければ本陣へ、城門が閉じていれば城門へ
      const gates = Object.keys(T.gates).map(Number);
      const goals = [
        ...near.map(f => () => field(T, neighbors(T, f.pos).filter(i => passable(T, i, 'atk')), 'atk')),
        () => field(T, [T.keep], 'atk'),
        () => field(T, gates.flatMap(g => neighbors(T, g)).filter(i => passable(T, i, 'atk')), 'atk'),
      ];
      let goal = null;
      for (const g of goals) { const f = g(); if (f[u.pos] < Infinity) { goal = f; break; } }
      // 総大将は敵の隣に出ない（崩れたら負けなので、後ろから弓で支える）
      const safe = i => !u.commander || !foes.some(f => dist(T, i, f.pos) <= 1);
      const opts = [...reach.keys()].filter(safe);
      if (goal && opts.length) dest = opts.sort((a, b) => goal[a] - goal[b] || d.terrain[T.tiles[b]].def - d.terrain[T.tiles[a]].def)[0];
    }
    if (dest !== u.pos) move(s, T, id, dest);
    if (T.over || u.troops <= 0) return;
    // 行動：隣の敵（弱い順・総大将を優先）→ 城門 → 弓 → 火計 → 待機
    const pickT = list => list.map(x => byUid(T, x)).sort((a, b) => (b.commander - a.commander) || a.troops - b.troops)[0];
    const adjFoe = !(u.commander && u.side === 'atk') && pickT(targets(s, T, u, 'attack'));
    if (adjFoe && tryAct('attack', uid(adjFoe))) return;
    const gate = targets(s, T, u, 'gate')[0];
    if (gate !== undefined && tryAct('gate', gate)) return;
    const shoot = pickT(targets(s, T, u, 'bow'));
    if (shoot && tryAct('bow', uid(shoot))) return;
    const f = me && pickT(targets(s, T, u, 'fire'));
    if (f && tryAct('fire', uid(f))) return;
    act(s, T, id, 'wait');
  }

  SG.tactics = { autoType, typeOf, create, reachable, targets, move, undoMove, act, endTurn, endMyPhase, stepAI, delegate, command, advance, auto, retreat, finish, check, neighbors, dist, unitAt, byUid, uid, units, alive, nameOf, moveOf, fireChance, colOf, rowOf, guard };
})();
if (typeof module !== 'undefined') module.exports = SG;
