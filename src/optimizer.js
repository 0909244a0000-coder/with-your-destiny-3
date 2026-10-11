// おすすめ装備の窓（装備画面の「おすすめ装備」から開く）。目的（火力・防御・対人）ごとに、
// 手持ち（持ち物・今の装備・倉庫）から部位ごとに点数のいちばん高い装備を選んで「今 → おすすめ」と点数の差を出す。
// 「このおすすめに着替える」「着替えてビルドに保存（枠1〜8）」で、おすすめのとおりに着替える（apply）。点数は能力×重み（data/optimizer.js）＋特殊効果・ユニーク・セットの加点（data/items.js の autoEquip）。
// 宝石は外すのが無料なので、装備は宝石ぬきで選び、宝石は手元＋はめている全部を選んだ装備に配りなおす（plan）。
window.WYD = window.WYD || {};
WYD.optimizer = {
  opened: false,
  goal: "damage",

  init() {
    const $ = (id) => document.getElementById(id);
    this.$ = $;
    $("optimizer-close").onclick = () => this.close();
    $("optimizer-body").onclick = (e) => {
      const el = e.target.closest("[data-opt-goal]");
      if (el && this.goalDef(el.dataset.optGoal)) { this.goal = el.dataset.optGoal; this.render(); return; }
      const act = e.target.closest("[data-opt-act]");
      if (act) this.act(act.dataset.optAct, Number(act.dataset.build));
    };
  },

  goalDef(id) { return WYD.data.optimizer.goals.find((g) => g.id === id); },

  // 今のビルドの型：猛攻（しくみ hanuman か frenzy の変身）がONなら "frenzy"、ほかは "normal"
  profile(state) {
    const pl = state.player;
    return Object.keys(WYD.data.skills).some((id) => (pl.skills[id] || 0) > 0 && pl.skillEnabled[id] &&
      (WYD.classes.kindOf(id) === "hanuman" || WYD.data.skills[id].frenzy)) ? "frenzy" : "normal";
  },

  // 目的の重み：職業と型の実測（data/optimizer.js の byClass）、なければ全職業の中央値（weights）
  weightsFor(goalId, state = WYD.state) {
    const O = WYD.data.optimizer, c = O.byClass[WYD.classes.id];
    const w = c && c[this.profile(state)] && c[this.profile(state)][goalId];
    return w || O.weights[goalId];
  },

  // 外せる宝石（ルーンは外せないので装備の一部として数える）
  removable(item) { return ((item && item.sockets) || []).filter((k) => k && WYD.gems.info(k) && !WYD.gems.info(k).rune); },
  // 宝石を入れられる数（空き＋外せる宝石の入っている所）
  capacity(item) { return ((item && item.sockets) || []).filter((k) => !k || (WYD.gems.info(k) && !WYD.gems.info(k).rune)).length; },
  // 宝石1つの点数（その部位にはめたとき。混沌の宝石は能力値だけ数える）
  gemValue(key, slot, W) {
    const st = WYD.gems.statsFor(key, slot);
    let v = 0;
    for (const k in st) v += st[k] * (W[k] || 0);
    return v;
  },

  // 装備1つの点数と内訳。parts = { 能力名 or 加点の名前: 点 }。宝石は "gems" にまとめる
  // gems を渡すと、はまっている宝石のかわりにその宝石で数える（付け替えたとき）
  score(item, goalId, gems) {
    const out = { total: 0, parts: {} };
    if (!item) return out;
    const A = WYD.data.items.autoEquip, W = this.weightsFor(goalId), st = { ...WYD.loot.statTotals(item) };
    const own = this.removable(item);
    for (const key of own) { const g = WYD.gems.statsFor(key, item.slot); for (const k in g) st[k] -= g[k]; }
    const add = (key, v) => { if (!v) return; out.parts[key] = (out.parts[key] || 0) + v; out.total += v; };
    for (const k in st) add(k, st[k] * (W[k] || 0));
    add("effects", (item.effects || []).length * A.perEffect);
    if (item.rarity === "unique") add("unique", A.uniqueBonus);
    if (item.rarity === "set") add("set", A.setBonus);
    for (const key of gems || own) add("gems", this.gemValue(key, item.slot, W));
    return out;
  },

  partName(key) {
    const S = WYD.data.items.stats[key];
    return S ? S.name : { effects: "特殊効果", unique: "ユニーク", set: "セット", gems: "宝石" }[key] || key;
  },

  // 部位ごとのおすすめ。
  // ① 宝石ぬきの点数で、部位ごとにいちばん高い装備を選ぶ（今の装備が同点以上なら今の装備）
  // ② 手元の宝石と、持っている装備にはまっている宝石（外すのは無料）を集め、選んだ装備のソケットへ点数の高い順に配る。
  //    神の宝石は身につけた装備に1つまで（data/gems.js の決まりと同じ）
  plan(state, goalId) {
    const W = this.weightsFor(goalId), slots = Object.keys(WYD.data.items.slots);
    const pool = [
      ...Object.values(state.equipment || {}).filter(Boolean).map((item) => ({ item, from: "eq" })),
      ...(state.inventory || []).map((item) => ({ item, from: "inv" })),
      ...(state.stash || []).map((item) => ({ item, from: "stash" })),
    ];
    const pick = {}, held = this.completeSlots(state);
    for (const slot of slots) {
      const cur = state.equipment[slot] || null;
      let best = cur, bestBase = this.score(cur, goalId, []).total, from = "eq";
      const locked = held.has(slot);   // 全部そろったセットの部位は、同じセットの同じ部位にだけ替える（完成の力が消えないように）
      for (const c of pool) {
        if (c.item.slot !== slot || c.item === cur || (locked && !this.samePiece(c.item, cur))) continue;
        const b = this.score(c.item, goalId, []).total;
        if (b > bestBase) { best = c.item; bestBase = b; from = c.from; }
      }
      pick[slot] = { best, from, setHeld: locked && best === cur };
    }
    // 宝石を集める（手元＋持っている装備の外せる宝石）
    const gems = {};
    for (const [key, n] of Object.entries(state.gems || {})) if (n > 0 && WYD.gems.info(key) && !WYD.gems.info(key).rune) gems[key] = (gems[key] || 0) + n;
    for (const c of pool) for (const key of this.removable(c.item)) gems[key] = (gems[key] || 0) + 1;
    // 配る：（宝石, 部位）の組を点数の高い順に
    const room = {}, assigned = {};
    for (const slot of slots) { room[slot] = this.capacity(pick[slot].best); assigned[slot] = []; }
    const pairs = [];
    for (const key in gems) for (const slot of slots) if (room[slot] > 0) { const v = this.gemValue(key, slot, W); if (v > 0) pairs.push({ key, slot, v }); }
    pairs.sort((x, y) => y.v - x.v);
    let god = false;
    for (const p of pairs) {
      if (room[p.slot] <= 0 || !(gems[p.key] > 0)) continue;
      const isGod = WYD.gems.isGod(p.key);
      if (isGod && god) continue;
      assigned[p.slot].push(p.key); room[p.slot]--; gems[p.key]--; if (isGod) god = true;
    }
    // 余ったソケットには、その装備にもともとはまっていた宝石を残す（点数0の宝石を「外す」と出さないため）
    for (const slot of slots) for (const key of this.removable(pick[slot].best)) {
      if (room[slot] <= 0 || !(gems[key] > 0) || (WYD.gems.isGod(key) && god)) continue;
      assigned[slot].push(key); room[slot]--; gems[key]--; if (WYD.gems.isGod(key)) god = true;
    }
    const same = (a, b) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");
    const rows = slots.map((slot) => {
      const cur = state.equipment[slot] || null, { best, from, setHeld } = pick[slot];
      const curScore = this.score(cur, goalId), bestScore = best ? this.score(best, goalId, assigned[slot]) : curScore;
      const gemsNow = this.removable(cur), gemsNew = best ? assigned[slot] : [];
      const sameItem = best === cur, sameGems = same(gemsNow, gemsNew);
      const keep = sameItem && sameGems;
      return { slot, cur, best: best || cur, from, keep, setHeld: !!setHeld, gemsOnly: sameItem && !sameGems, gemsNow, gemsNew,
        curScore: curScore.total, bestScore: bestScore.total, diff: bestScore.total - curScore.total,
        gemDiff: (bestScore.parts.gems || 0) - (curScore.parts.gems || 0), reasons: keep ? [] : this.reasons(curScore, bestScore) };
    });
    const curTotal = rows.reduce((n, r) => n + r.curScore, 0), bestTotal = rows.reduce((n, r) => n + r.bestScore, 0);
    return { rows, curTotal, bestTotal, diff: bestTotal - curTotal, changes: rows.filter((r) => !r.keep).length };
  },

  // おすすめのとおりに着替える（宝石の付け替えもふくむ）。ロックした装備も外す（外した装備は持ち物か倉庫へ）。
  // 着替える前に身につけていた装備と、着替えた後の装備は全部ロックする（分解されないように）
  // 倉庫の装備は、外した装備と倉庫の中で入れかえるので、持ち物がいっぱいでも着替えられる。{ items: 着替えた数, gems: 動かした宝石の数 }
  apply(state, goalId) {
    const p = this.plan(state, goalId), G = WYD.gems;
    let items = 0, gems = 0;
    // 着替える前に身につけていた装備は全部ロックする（前の構成に戻せるように。持ち主の指示 2026-10-10）
    for (const it of Object.values(state.equipment)) if (it) it.locked = true;
    for (const r of p.rows) {
      if (r.keep || r.gemsOnly || !r.best || r.best === r.cur) continue;
      const cur = state.equipment[r.slot] || null;
      const inv = state.inventory.indexOf(r.best), st = (state.stash || []).indexOf(r.best);
      if (inv >= 0) { state.inventory.splice(inv, 1); if (cur) state.inventory.splice(inv, 0, cur); }
      else if (st >= 0) { state.stash.splice(st, 1); if (cur) state.stash.splice(st, 0, cur); }
      else continue;
      state.equipment[r.slot] = r.best;
      items++;
    }
    // 宝石：まず、身につけた装備から おすすめにない宝石を外す
    const want = {};
    for (const r of p.rows) if (state.equipment[r.slot]) want[r.slot] = [...r.gemsNew];
    for (const slot in want) {
      const item = state.equipment[slot], need = [...want[slot]];
      (item.sockets || []).forEach((key, i) => {
        if (!key || !G.info(key) || G.info(key).rune) return;
        const at = need.indexOf(key);
        if (at >= 0) need.splice(at, 1); else { G.unsocketAt(state, item, i); gems++; }
      });
      want[slot] = need;   // まだはめる必要がある宝石
    }
    // つぎに、足りない宝石を手元（なければ身につけていない装備から外して）からはめる
    const others = [...state.inventory, ...(state.stash || [])];
    for (const slot in want) for (const key of want[slot]) {
      if (!(state.gems[key] > 0)) {
        const from = others.find((it) => (it.sockets || []).includes(key));
        if (from) G.unsocketAt(state, from, from.sockets.indexOf(key));
      }
      if (G.socket(state, state.equipment[slot], key)) gems++;
    }
    // 着替えた後の装備も全部ロックする
    for (const it of Object.values(state.equipment)) if (it) it.locked = true;
    return { items, gems };
  },

  // ---- 育てる候補（下限）：強化 +10 と鍛造を、いちばん運が悪いときでも ----
  // 強化はランダムなし（+1ごとに能力 statPerLevel）。鍛造の「能力を上げる」は上げる能力を選べて、1回の量も決まっている（元の値の improvePercent%）。
  // ランダムなのは使う余地（improvePotential）と会心だけなので、下限は「毎回いちばん多く余地を使う・会心なし」の回数を、いちばん点の高い能力に使う。
  // 「能力を足す」は何が付くかランダムなので数えない。ソケットは、手元と持っている装備から外せる宝石で埋めたときの点数（持っていない宝石は数えない）
  gemPool(state) {
    const pool = {}, items = [...Object.values(state.equipment || {}).filter(Boolean), ...(state.inventory || []), ...(state.stash || [])];
    for (const [key, n] of Object.entries(state.gems || {})) if (n > 0 && WYD.gems.info(key) && !WYD.gems.info(key).rune) pool[key] = (pool[key] || 0) + n;
    for (const it of items) for (const key of this.removable(it)) pool[key] = (pool[key] || 0) + 1;
    return pool;
  },
  // その部位の n 個のソケットを、持っている宝石の点数の高い順で埋めた点数（神は1つまで）
  gemFill(pool, slot, n, W) {
    if (n <= 0) return 0;
    const vals = [];
    for (const [key, c] of Object.entries(pool)) { const v = this.gemValue(key, slot, W); if (v > 0) for (let i = 0; i < Math.min(c, n); i++) vals.push({ v, god: WYD.gems.isGod(key) }); }
    vals.sort((a, b) => b.v - a.v);
    let sum = 0, used = 0, god = false;
    for (const x of vals) { if (used >= n) break; if (x.god && god) continue; sum += x.v; used++; if (x.god) god = true; }
    return sum;
  },
  growth(item, goalId, pool) {
    if (!item) return { score: 0, cost: 0, plus: 0, improves: 0, stat: null };
    const E = WYD.data.crafting.enhance, F = WYD.data.crafting.forge, A = WYD.data.items.autoEquip, W = this.weightsFor(goalId);
    const mult = 1 + E.max * E.statPerLevel;
    const pot = item.forgePotential != null ? item.forgePotential : (F.potential[item.rarity] || 0);
    let score = 0, best = 0, bestStat = null;
    for (const line of item.stats || []) {
      score += line.value * mult * (W[line.stat] || 0);
      const gain = Math.abs(line.base != null ? line.base : line.value) * F.improvePercent / 100 * mult * (W[line.stat] || 0);
      if (gain > best) { best = gain; bestStat = line.stat; }
    }
    const rw = WYD.gems.runeword(item);
    if (rw) for (const k in rw.bonus.stats || {}) score += rw.bonus.stats[k] * (W[k] || 0);
    const improves = best > 0 ? Math.ceil(pot / F.improvePotential[1]) : 0;
    score += improves * best;
    score += (item.effects || []).length * A.perEffect + (item.rarity === "unique" ? A.uniqueBonus : 0) + (item.rarity === "set" ? A.setBonus : 0);
    score += this.gemFill(pool, item.slot, this.capacity(item), W);
    let cost = improves * WYD.inventory.forgeCost(item, "improve");
    for (let p = item.plus || 0; p < E.max; p++) cost += Math.round(E.costBase * Math.pow(E.costGrowth, p) * (E.rarityCostMult[item.rarity] || 1));
    return { score, cost, plus: Math.max(0, E.max - (item.plus || 0)), improves, stat: bestStat };
  },
  // 育てると、今の装備を同じだけ育てた下限より強くなる装備（持ち物・倉庫）。伸びの大きい順
  // ---- セットを完成させる候補 ----
  // 完成の力の価値（点。10点＝1%）：火力は全体が約 attackMult 倍になる（倍率は実測で決めたので、与ダメージ/秒もほぼその倍）。
  // 防御は最大HPの倍率（statMult）だけ数える。対人は火力と防御の半分ずつ
  completePoints(set, goalId) {
    const C = WYD.data.sets.complete || {}, dmg = 1000 * (((C.attackMult || {})[set.id] || 1) - 1);
    const def = 1000 * ((((C.statMult || {})[set.id] || {}).maxHp || 1) - 1);
    return goalId === "damage" ? dmg : goalId === "defense" ? def : (dmg + def) / 2;
  },
  // 持っている装備（装備中・持ち物・倉庫）で完成できるのに、そろえていないセット。差し引き（完成の力 − 替える部位の育てた下限の差）が
  // プラスのものだけ。あと1つで完成するセットは near に入れる（狙う手がかり）
  setPlans(state, goalId, pool = this.gemPool(state)) {
    const equipped = Object.values(state.equipment || {}).filter(Boolean), all = [...equipped, ...(state.inventory || []), ...(state.stash || [])];
    const counts = WYD.stats.setCounts(state), plans = [], near = [];
    for (const set of WYD.loot.forClass(WYD.data.sets.list)) {
      if ((counts[set.id] || 0) >= set.pieces.length) continue;
      const have = {};
      for (const it of all) { const info = WYD.loot.setInfo(it); if (info && info.set.id === set.id && (!have[info.piece.id] || equipped.includes(it))) have[info.piece.id] = it; }
      const missing = set.pieces.filter((p) => !have[p.id]);
      if (missing.length === 1) near.push({ set, missing: missing[0] });
      if (missing.length) continue;
      const need = set.pieces.map((p) => have[p.id]).filter((it) => !equipped.includes(it));
      let loss = 0;
      for (const it of need) loss += this.growth(state.equipment[it.slot] || null, goalId, pool).score - this.growth(it, goalId, pool).score;
      const gain = this.completePoints(set, goalId) - loss;
      if (gain > 0) plans.push({ set, items: need, gain, loss });
    }
    return { plans: plans.sort((a, b) => b.gain - a.gain), near };
  },

  // 全部そろっているセットの装備がある部位（data/sets.js の complete。外すと完成の力が消えるので、おすすめでも育てる候補でも、同じセットの同じ部位にしか替えない）
  // 同じセットの同じ部位か（レベル・追加能力ちがいの同じ装備。替えてもセットはそろったまま）
  samePiece(a, b) {
    return !!(a && b && a.set && a.set === b.set && a.piece === b.piece);
  },
  completeSlots(state) {
    const counts = WYD.stats.setCounts(state), out = new Set();
    for (const [slot, it] of Object.entries(state.equipment || {})) {
      const info = it && WYD.loot.setInfo(it);
      if (info && (counts[info.set.id] || 0) >= info.set.pieces.length) out.add(slot);
    }
    return out;
  },
  growCandidates(state, goalId) {
    const pool = this.gemPool(state), out = [], cur = {}, held = this.completeSlots(state);
    for (const slot of Object.keys(WYD.data.items.slots)) cur[slot] = this.growth(state.equipment[slot] || null, goalId, pool);
    for (const [list, where] of [[state.inventory || [], "inv"], [state.stash || [], "stash"]]) for (const item of list) {
      if (held.has(item.slot) && !this.samePiece(item, state.equipment[item.slot])) continue;
      const g = this.growth(item, goalId, pool), c = cur[item.slot];
      if (c && g.score > c.score) out.push({ item, slot: item.slot, where, gain: g.score - c.score, grown: g.score, curGrown: c.score, cost: g.cost, plus: g.plus, improves: g.improves, stat: g.stat });
    }
    // セットを完成させる候補の部位も入れる（差し引きの伸び。同じ装備はセットのほうを使う）
    for (const sp of this.setPlans(state, goalId, pool).plans) for (const item of sp.items) {
      const i = out.findIndex((c) => c.item === item); if (i >= 0) out.splice(i, 1);
      out.push({ item, slot: item.slot, where: (state.stash || []).includes(item) ? "stash" : "inv", gain: sp.gain, set: sp.set });
    }
    return out.sort((a, b) => b.gain - a.gain);
  },

  // 選んだ理由：どの能力で何点ちがうか（上がる大きい順に数個と、いちばん下がるもの1つ）
  reasons(cur, best) {
    const keys = new Set([...Object.keys(cur.parts), ...Object.keys(best.parts)]);
    const d = [...keys].map((key) => ({ key, name: this.partName(key), points: (best.parts[key] || 0) - (cur.parts[key] || 0) }))
      .filter((x) => Math.abs(x.points) >= 0.5);
    const up = d.filter((x) => x.points > 0).sort((a, b) => b.points - a.points).slice(0, WYD.data.optimizer.reasonCount);
    const down = d.filter((x) => x.points < 0).sort((a, b) => a.points - b.points).slice(0, 1);
    return [...up, ...down];
  },

  // 窓の「育てる候補（下限）」：部位ごとにいちばん伸びる装備（data/optimizer.js の growShow 件まで）
  growHtml(s, goal) {
    const esc = WYD.results.escape, slotName = WYD.data.items.slots, C = WYD.data.crafting, seen = new Set();
    const sp = this.setPlans(s, goal.id), SC = WYD.data.sets.complete || {};
    const setRows = sp.plans.map((p) => `<li><b>セット完成</b> <span style="color:${WYD.data.sets.color}">${esc(p.set.name)}</span>：${p.items.map((it) => `${slotName[it.slot]}「${esc(WYD.loot.label(it))}」`).join("・")} に替える → <b class="opt-up">+${Math.round(p.gain)}点</b>` +
      `<small>（完成の力 攻撃力 ×${(SC.attackMult || {})[p.set.id] || 1}。替える部位の育てた下限の差 −${Math.round(p.loss)}点をふくむ）</small></li>`).join("") +
      sp.near.map((n) => `<li><b>あと1つ</b> <span style="color:${WYD.data.sets.color}">${esc(n.set.name)}</span>：「${esc(n.missing.name)}」がそろえば完成（完成の力 攻撃力 ×${(SC.attackMult || {})[n.set.id] || 1}）</li>`).join("");
    const list = this.growCandidates(s, goal.id).filter((c) => !c.set && !seen.has(c.slot) && seen.add(c.slot)).slice(0, WYD.data.optimizer.growShow);
    if (!list.length && !setRows) return `<details class="opt-grow"><summary>育てる候補（下限）：なし</summary><p class="muted">強化 +10・鍛造（いちばん運が悪いとき）まで育てても、今の装備を同じだけ育てたより強くなる装備はない。</p></details>`;
    const rows = list.map((c) => `<li><b>${slotName[c.slot]}</b> <span style="color:${WYD.ui.color(c.item)}">${esc(WYD.loot.label(c.item))}</span>${c.where === "stash" ? "（倉庫）" : ""}：` +
      `${c.plus ? `強化 +${c.plus}` : "強化ずみ"}${c.improves ? `・鍛造「${esc(WYD.data.items.stats[c.stat].name)}」${c.improves}回` : ""} → <b class="opt-up">+${Math.round(c.gain)}点</b>` +
      `<small>（${Math.round(c.grown)}点。今の装備を同じだけ育てると ${Math.round(c.curGrown)}点。${C.materialName} 約${c.cost}）</small></li>`).join("");
    return `<details class="opt-grow" open><summary>育てる候補（下限）：${list.length}部位${sp.plans.length ? `・セット完成 ${sp.plans.length}` : ""}${sp.near.length ? `・あと1つ ${sp.near.length}` : ""}</summary><p class="muted">強化 +10 と鍛造（毎回いちばん多く余地を使い、会心なし）まで育てたとき。ソケットは持っている宝石で埋めた点数。セットは、全部そろえたときの完成の力（火力が約 攻撃力の倍率 倍）から、替える部位の差を引いた点。持ち物の「★育てる」にも出ます。</p><ul>${setRows}${rows}</ul></details>`;
  },

  // 窓のボタン：着替える（apply）／着替えてビルドの枠 n に保存（build）。確認してから
  act(kind, n) {
    const s = WYD.state, goal = this.goalDef(this.goal), ui = WYD.ui;
    if (kind === "apply") {
      if (!confirm(`おすすめ（${goal.label}）に着替えますか？\n宝石も付け替えます。ロックした装備も外します。\n今身につけている装備と、着替えた後の装備は、全部ロックします（外した装備は持ち物へ）。`)) return;
    } else if (kind === "build") {
      const old = s.builds[n];
      const name = prompt(old ? `枠${n + 1}「${old.name}」を上書きします。ビルドの名前` : `おすすめ（${goal.label}）に着替えて、枠${n + 1}に保存します。ビルドの名前`, old ? old.name : `${goal.label}のおすすめ`);
      if (name == null) return;
      const r = this.apply(s, this.goal);
      WYD.builds.save(s, n, name);
      ui.log(`おすすめ（${goal.label}）に着替えた（装備 ${r.items}・宝石 ${r.gems}）。ビルド「${name}」に保存した`, "#7dff8a");
      ui.changed(); this.render();
      return;
    } else return;
    const r = this.apply(s, this.goal);
    ui.log(`おすすめ（${goal.label}）に着替えた（装備 ${r.items}・宝石 ${r.gems}）`, "#7dff8a");
    ui.changed(); this.render();
  },

  open() {
    this.opened = true;
    this.$("optimizer").hidden = false;
    this.render();
  },

  close() {
    this.opened = false;
    this.$("optimizer").hidden = true;
  },

  refresh() { if (this.opened) this.render(); },

  render() {
    const s = WYD.state, esc = WYD.results.escape, slotName = WYD.data.items.slots, G = WYD.data.optimizer;
    const goal = this.goalDef(this.goal), p = this.plan(s, goal.id);
    const pt = (v) => `${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v))}`;
    const name = (item) => item ? `<span style="color:${WYD.ui.color(item)}">${esc(WYD.loot.label(item))}</span>` : `<span class="muted">なし</span>`;
    const where = { inv: "持ち物", stash: "倉庫", eq: "装備中" };
    const tabs = G.goals.map((g) => `<button data-opt-goal="${g.id}" class="${g.id === goal.id ? "on" : ""}" aria-pressed="${g.id === goal.id}">${g.label}</button>`).join("");
    // 宝石の並び（同じ宝石はまとめて ×数）
    const gemList = (keys) => {
      if (!keys.length) return `<span class="muted">なし</span>`;
      const n = {};
      for (const k of keys) n[k] = (n[k] || 0) + 1;
      return Object.entries(n).map(([k, c]) => `<span style="color:${WYD.gems.color(k)}">${esc(WYD.gems.name(k))}${c > 1 ? `×${c}` : ""}</span>`).join("・");
    };
    const rows = p.rows.map((r) => {
      const why = r.reasons.map((x) => `<span class="${x.points > 0 ? "opt-up" : "opt-down"}">${esc(x.name)} ${pt(x.points)}点</span>`).join("");
      const gems = !r.keep && (r.gemsNow.length || r.gemsNew.length) && [...r.gemsNow].sort().join("|") !== [...r.gemsNew].sort().join("|") ? `<div class="opt-gems">宝石：${gemList(r.gemsNow)} → ${gemList(r.gemsNew)}（${pt(r.gemDiff)}点）</div>` : "";
      return `<tr class="${r.keep ? "opt-keep" : "opt-change"}" data-opt-slot="${r.slot}"><th>${slotName[r.slot]}</th>` +
        `<td>${name(r.cur)}<small>${Math.round(r.curScore)}点</small></td>` +
        (r.keep ? `<td class="opt-same">${r.setHeld ? "そのまま（セット完成中）" : r.cur ? "そのまま" : "候補なし"}</td><td></td>` :
          `<td>${r.gemsOnly ? `<span class="opt-same">装備はそのまま・宝石だけ付け替え</span>` : `→ ${name(r.best)}`}<small>${Math.round(r.bestScore)}点${r.gemsOnly ? "" : `・${where[r.from]}`}</small>${gems}</td>` +
          `<td><b class="${r.diff >= 0 ? "opt-up" : "opt-down"}">${pt(r.diff)}</b><div class="opt-why">${why}</div></td>`) +
        `</tr>`;
    }).join("");
    this.$("optimizer-body").innerHTML =
      `<nav class="opt-goals" aria-label="目的">${tabs}</nav><p class="muted">${esc(goal.desc)}。重みは${esc(((WYD.data.classes[WYD.classes.id] || {}).name) || "")}・${this.profile(s) === "frenzy" ? "猛攻を使うビルド" : "猛攻を使わないビルド"}の実測（10点＝能力が1%伸びる。強化こみ）。宝石は、手元とはめている全部の宝石を、選んだ装備へ点数の高い順に配りなおして数える（混沌の宝石は能力値だけ）。「着替える」を押すまでは見るだけ。</p>` +
      `<div class="opt-total">合計 <b>${Math.round(p.curTotal)}</b> → <b>${Math.round(p.bestTotal)}</b> 点 <b class="${p.diff > 0 ? "opt-up" : ""}">（${pt(p.diff)}）</b>　替える部位 <b>${p.changes}</b> / ${p.rows.length}</div>` +
      `<div class="opt-actions"><button data-opt-act="apply" class="opt-apply" ${p.changes ? "" : "disabled"}>このおすすめに着替える</button>` +
        `<span class="opt-builds"><small>着替えてビルドに保存：</small>${Array.from({ length: WYD.data.items.buildSlots }, (_, n) => `<button data-opt-act="build" data-build="${n}" title="${s.builds[n] ? esc(s.builds[n].name) + "（上書き）" : "空き"}">${n + 1}${s.builds[n] ? "●" : ""}</button>`).join("")}</span></div>` +
      this.growHtml(s, goal) +
      `<div class="opt-scroll"><table class="opt-table"><thead><tr><th>部位</th><th>今</th><th>おすすめ</th><th>差・理由</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  },
};
