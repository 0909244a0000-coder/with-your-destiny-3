// おすすめ装備の窓（装備画面の「おすすめ装備」から開く）。目的（火力・防御・対人）ごとに、
// 手持ち（持ち物・今の装備・倉庫）から部位ごとに点数のいちばん高い装備を選んで「今 → おすすめ」と点数の差を出す。
// 見るだけで、着替えない。点数は能力×重み（data/optimizer.js）＋特殊効果・ユニーク・セットの加点（data/items.js の autoEquip）。
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

  // 装備1つの点数と内訳。parts = { 能力名 or 加点の名前: 点 }
  score(item, goalId) {
    const out = { total: 0, parts: {} };
    if (!item) return out;
    const A = WYD.data.items.autoEquip, W = this.goalDef(goalId).weights, st = WYD.loot.statTotals(item);
    const add = (key, v) => { if (!v) return; out.parts[key] = (out.parts[key] || 0) + v; out.total += v; };
    for (const k in st) add(k, st[k] * (W[k] || 0));
    add("effects", (item.effects || []).length * A.perEffect);
    if (item.rarity === "unique") add("unique", A.uniqueBonus);
    if (item.rarity === "set") add("set", A.setBonus);
    return out;
  },

  partName(key) {
    const S = WYD.data.items.stats[key];
    return S ? S.name : { effects: "特殊効果", unique: "ユニーク", set: "セット" }[key] || key;
  },

  // 部位ごとのおすすめ。今の装備のほうが強い（同点もふくむ）なら keep
  plan(state, goalId) {
    const pool = [
      ...Object.values(state.equipment || {}).filter(Boolean).map((item) => ({ item, from: "eq" })),
      ...(state.inventory || []).map((item) => ({ item, from: "inv" })),
      ...(state.stash || []).map((item) => ({ item, from: "stash" })),
    ];
    const rows = Object.keys(WYD.data.items.slots).map((slot) => {
      const cur = state.equipment[slot] || null, curScore = this.score(cur, goalId);
      let best = null, bestScore = curScore, from = "eq";
      for (const c of pool) {
        if (c.item.slot !== slot || c.item === cur) continue;
        const sc = this.score(c.item, goalId);
        if (sc.total > bestScore.total) { best = c.item; bestScore = sc; from = c.from; }
      }
      const keep = !best;
      return { slot, cur, best: best || cur, from, keep, curScore: curScore.total, bestScore: bestScore.total,
        diff: bestScore.total - curScore.total, reasons: keep ? [] : this.reasons(curScore, bestScore) };
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
    const rows = p.rows.map((r) => {
      const why = r.reasons.map((x) => `<span class="${x.points > 0 ? "opt-up" : "opt-down"}">${esc(x.name)} ${pt(x.points)}点</span>`).join("");
      return `<tr class="${r.keep ? "opt-keep" : "opt-change"}" data-opt-slot="${r.slot}"><th>${slotName[r.slot]}</th>` +
        `<td>${name(r.cur)}<small>${Math.round(r.curScore)}点</small></td>` +
        (r.keep ? `<td class="opt-same">${r.cur ? "そのまま" : "候補なし"}</td><td></td>` :
          `<td>→ ${name(r.best)}<small>${Math.round(r.bestScore)}点・${where[r.from]}</small></td><td><b class="opt-up">${pt(r.diff)}</b><div class="opt-why">${why}</div></td>`) +
        `</tr>`;
    }).join("");
    this.$("optimizer-body").innerHTML =
      `<nav class="opt-goals" aria-label="目的">${tabs}</nav><p class="muted">${esc(goal.desc)}。点数は目安（強化・宝石こみ）。見るだけで、着替えはしない。</p>` +
      `<div class="opt-total">合計 <b>${Math.round(p.curTotal)}</b> → <b>${Math.round(p.bestTotal)}</b> 点 <b class="${p.diff > 0 ? "opt-up" : ""}">（${pt(p.diff)}）</b>　替える部位 <b>${p.changes}</b> / ${p.rows.length}</div>` +
      `<div class="opt-scroll"><table class="opt-table"><thead><tr><th>部位</th><th>今</th><th>おすすめ</th><th>差・理由</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  },
};
