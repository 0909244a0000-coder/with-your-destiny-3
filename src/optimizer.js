// おすすめ装備の窓（装備画面の「おすすめ装備」から開く）。目的（火力・防御・対人）ごとに、
// 手持ち（持ち物・今の装備・倉庫）から部位ごとに点数のいちばん高い装備を選んで「今 → おすすめ」と点数の差を出す。
// 見るだけで、着替えない。点数は能力×重み（data/optimizer.js）＋特殊効果・ユニーク・セットの加点（data/items.js の autoEquip）。
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
      if (el && this.goalDef(el.dataset.optGoal)) { this.goal = el.dataset.optGoal; this.render(); }
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
    const pick = {};
    for (const slot of slots) {
      const cur = state.equipment[slot] || null;
      let best = cur, bestBase = this.score(cur, goalId, []).total, from = "eq";
      for (const c of pool) {
        if (c.item.slot !== slot || c.item === cur) continue;
        const b = this.score(c.item, goalId, []).total;
        if (b > bestBase) { best = c.item; bestBase = b; from = c.from; }
      }
      pick[slot] = { best, from };
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
      const cur = state.equipment[slot] || null, { best, from } = pick[slot];
      const curScore = this.score(cur, goalId), bestScore = best ? this.score(best, goalId, assigned[slot]) : curScore;
      const gemsNow = this.removable(cur), gemsNew = best ? assigned[slot] : [];
      const sameItem = best === cur, sameGems = same(gemsNow, gemsNew);
      const keep = sameItem && sameGems;
      return { slot, cur, best: best || cur, from, keep, gemsOnly: sameItem && !sameGems, gemsNow, gemsNew,
        curScore: curScore.total, bestScore: bestScore.total, diff: bestScore.total - curScore.total,
        gemDiff: (bestScore.parts.gems || 0) - (curScore.parts.gems || 0), reasons: keep ? [] : this.reasons(curScore, bestScore) };
    });
    const curTotal = rows.reduce((n, r) => n + r.curScore, 0), bestTotal = rows.reduce((n, r) => n + r.bestScore, 0);
    return { rows, curTotal, bestTotal, diff: bestTotal - curTotal, changes: rows.filter((r) => !r.keep).length };
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
        (r.keep ? `<td class="opt-same">${r.cur ? "そのまま" : "候補なし"}</td><td></td>` :
          `<td>${r.gemsOnly ? `<span class="opt-same">装備はそのまま・宝石だけ付け替え</span>` : `→ ${name(r.best)}`}<small>${Math.round(r.bestScore)}点${r.gemsOnly ? "" : `・${where[r.from]}`}</small>${gems}</td>` +
          `<td><b class="${r.diff >= 0 ? "opt-up" : "opt-down"}">${pt(r.diff)}</b><div class="opt-why">${why}</div></td>`) +
        `</tr>`;
    }).join("");
    this.$("optimizer-body").innerHTML =
      `<nav class="opt-goals" aria-label="目的">${tabs}</nav><p class="muted">${esc(goal.desc)}。重みは${esc(((WYD.data.classes[WYD.classes.id] || {}).name) || "")}・${this.profile(s) === "frenzy" ? "猛攻を使うビルド" : "猛攻を使わないビルド"}の実測（10点＝能力が1%伸びる。強化こみ）。宝石は、手元とはめている全部の宝石を、選んだ装備へ点数の高い順に配りなおして数える（混沌の宝石は能力値だけ）。見るだけで、着替えはしない。</p>` +
      `<div class="opt-total">合計 <b>${Math.round(p.curTotal)}</b> → <b>${Math.round(p.bestTotal)}</b> 点 <b class="${p.diff > 0 ? "opt-up" : ""}">（${pt(p.diff)}）</b>　替える部位 <b>${p.changes}</b> / ${p.rows.length}</div>` +
      `<div class="opt-scroll"><table class="opt-table"><thead><tr><th>部位</th><th>今</th><th>おすすめ</th><th>差・理由</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  },
};
