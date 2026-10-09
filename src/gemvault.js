// 宝石の画面（持ち物とは別の窓）。手元の宝石・はめている宝石の一覧、絞り込み・検索・並べ替え、
// はめる（はめ先を選ぶ）・外す・段階の合成・宝石合成（混沌の宝石）。宝石のしくみは src/gems.js、数値は data/gems.js。
window.WYD = window.WYD || {};
WYD.gemVault = {
  opened: false,
  filter: "all",   // all / normal / fused / god
  query: "",       // 能力・名前で検索（空白区切りはすべてを含むもの）
  sort: "tier",    // tier = 段階・種類 / new = 新しい順 / lines = 能力の数 / value = 検索した能力の数値
  picking: null,   // はめ先を選んでいる宝石の key

  init() {
    const $ = (id) => document.getElementById(id);
    this.$ = $;
    $("gems-open").onclick = () => this.open();
    $("gemvault-close").onclick = () => this.close();
    $("gemvault-filter").onchange = (e) => { this.filter = e.target.value; this.render(); };
    $("gemvault-sort").onchange = (e) => { this.sort = e.target.value; this.render(); };
    $("gemvault-search").oninput = (e) => { this.query = e.target.value; this.render(); };
    $("gemvault-body").onclick = (e) => this.click(e);
  },

  open() {
    this.opened = true; this.picking = null;
    this.$("gemvault").hidden = false;
    this.render();
  },

  close() {
    this.opened = false; this.picking = null;
    this.$("gemvault").hidden = true;
  },

  // 画面の外で宝石が増減したとき（src/ui.js の描きなおしから呼ぶ）
  refresh() { if (this.opened) this.render(); },

  // 能力の説明（ふつうの宝石は部位ごと）
  text(key) {
    const i = WYD.gems.info(key), G = WYD.data.gems;
    if (!i || i.fused) return WYD.gems.statsText(key);
    const slotOf = { weapon: "weapon", armor: "body", jewelry: "ring" };
    return Object.keys(G.groupName).map((g) => `${G.groupName[g]}：${WYD.gems.statsText(key, slotOf[g])}`).join("／");
  },

  // 検索・種類で残すか
  matches(key) {
    const i = WYD.gems.info(key);
    if (!i || i.rune) return false;
    if (this.filter === "normal" && i.fused) return false;
    if (this.filter === "fused" && !i.fused) return false;
    if (this.filter === "god" && !i.god) return false;
    const text = (WYD.gems.name(key) + " " + this.text(key)).toLowerCase();
    return this.query.trim().toLowerCase().split(/\s+/).filter(Boolean).every((w) => text.includes(w));
  },

  // 並べ替えの値（大きいほど上）
  score(key, order) {
    const i = WYD.gems.info(key);
    if (this.sort === "new") return order;
    if (this.sort === "lines") return i.fused ? i.lines.length * 1000 + order / 1e6 : -1 + i.tier / 10;
    if (this.sort === "value") {
      // 検索語を含む能力の数値（割合・神は数値が小さいので、能力の幅に対する割合で比べる）
      const words = this.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (!i.fused || !words.length) return i.fused ? i.lines.length : -1;
      let best = 0;
      for (const l of i.lines) {
        if (!words.some((w) => WYD.gems.lineText(l).toLowerCase().includes(w))) continue;
        const p = WYD.gems.poolDef(l.kind, l.id);
        const v = p.params ? Object.entries(p.params).reduce((n, [k, [lo, hi]]) => n + (l.params[k] - lo) / (hi - lo || 1), 0) / Object.keys(p.params).length
          : (l.value - p.range[0]) / (p.range[1] - p.range[0] || 1);
        best = Math.max(best, v);
      }
      return best;
    }
    return i.fused ? (i.god ? 2000 : 1000) + i.lines.length : i.tier * 10 + WYD.data.gems.gems.indexOf(i.def);
  },

  sorted(keys) {
    return keys.map((k, n) => [k, this.score(k, n)]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map((x) => x[0]);
  },

  // はめられる装備（身につけている装備と持ち物で、空いたソケットがあるもの）
  targets(key) {
    const s = WYD.state, out = [];
    for (const slot in s.equipment) {
      const it = s.equipment[slot];
      if (it && WYD.gems.freeSocket(it) >= 0 && !WYD.gems.godBlocked(s, it, key)) out.push({ where: "eq", key: slot, item: it });
    }
    s.inventory.forEach((it, n) => { if (it && WYD.gems.freeSocket(it) >= 0) out.push({ where: "inv", key: n, item: it }); });
    return out;
  },

  // はめている宝石 [{ key, where, slotKey, item, index }]
  socketed() {
    const s = WYD.state, out = [];
    const add = (where, k, it) => (it && it.sockets || []).forEach((key, index) => { if (key && WYD.gems.info(key) && !WYD.gems.info(key).rune) out.push({ key, where, slotKey: k, item: it, index }); });
    for (const slot in s.equipment) add("eq", slot, s.equipment[slot]);
    s.inventory.forEach((it, n) => add("inv", n, it));
    return out;
  },

  itemAt(where, k) { return where === "eq" ? WYD.state.equipment[k] : WYD.state.inventory[Number(k)]; },
  itemLabel(where, item) { return `${where === "eq" ? "装備中" : "持ち物"}・${WYD.data.items.slots[item.slot]}「${WYD.loot.label(item)}」`; },

  click(e) {
    const s = WYD.state, ui = WYD.ui, G = WYD.data.gems, b = e.target.closest("button");
    if (!b) return;
    const d = b.dataset;
    if (d.gvAct === "fuse") {
      const plan = WYD.gems.fusionPlan(s), F = G.fusion;
      if (!plan.ok) return ui.log("合成できない（宝石の量か素材が足りない）", "#ff6b6b");
      const list = Object.keys(plan.use).map((k) => `${WYD.gems.name(k)}×${plan.use[k]}`).join("、");
      if (!confirm(`次の宝石を使って、${F.name}を1つ作りますか？（能力は完全ランダム）\n${list}`)) return;
      const key = WYD.gems.fuse(s);
      if (key) ui.log(`${WYD.gems.name(key)}ができた：${WYD.gems.statsText(key)}`, WYD.gems.color(key));
    } else if (d.gvAct === "combine") {
      const i = WYD.gems.info(d.key), next = i && WYD.gems.key(i.def.id, i.tier + 1);
      if (WYD.gems.combine(s, d.key)) ui.log(`${WYD.gems.name(d.key)}を合成して、${WYD.gems.name(next)}にした`, WYD.gems.color(d.key));
      else ui.log("合成できない（宝石の数か素材が足りない）", "#ff6b6b");
    } else if (d.gvAct === "pick") {
      this.picking = this.picking === d.key ? null : d.key;
    } else if (d.gvAct === "place") {
      const item = this.itemAt(d.where, d.slot), key = this.picking;
      if (item && WYD.gems.socket(s, item, key)) ui.log(`${item.name}に${WYD.gems.name(key)}をはめた（${WYD.gems.statsText(key, item.slot)}）`, WYD.gems.color(key));
      else if (item && WYD.gems.godBlocked(s, item, key)) ui.log("神の混沌石は、身につけている装備に1つまで（先に外してから）", "#ff6b6b");
      else ui.log("はめられなかった（空いたソケットがない）", "#ff6b6b");
      if (!(s.gems[key] > 0)) this.picking = null;
    } else if (d.gvAct === "remove") {
      const item = this.itemAt(d.where, d.slot), key = item && WYD.gems.unsocketAt(s, item, Number(d.index));
      if (key) ui.log(`${item.name}から${WYD.gems.name(key)}を外した`, WYD.gems.color(key));
    } else return;
    ui.changed();
    this.render();
  },

  render() {
    const s = WYD.state, G = WYD.data.gems, F = G.fusion, esc = WYD.results.escape;
    const top = G.tiers[G.tiers.length - 1].name, unit = Math.pow(G.combineCount, G.tiers.length - 1), plan = WYD.gems.fusionPlan(s);
    const fusion = `<div class="gv-fusion"><button data-gv-act="fuse" ${plan.ok ? "" : "disabled"} title="段階の低い宝石から使う。欠けた=1、1段ごとに${G.combineCount}倍（${top}=${unit}）">宝石合成 → <span style="color:${F.color}">${F.name}</span></button>` +
      ` <small class="muted">種類も段階も混ぜて${top}${F.need / unit}個ぶん（今 ${Math.min(plan.total, F.need)} / ${F.need}${F.cost ? `・${WYD.data.crafting.materialName}${F.cost}個` : ""}）。能力の数・種類・数値はランダム（割合・固有能力・神の能力も。神は身につけて1つだけ効く）</small></div>`;
    const card = (key, inner, extra = "") => {
      const i = WYD.gems.info(key);
      return `<div class="gv-card${extra}" style="border-color:${i.def.color}"><div><b style="color:${i.def.color}">◆ ${esc(WYD.gems.name(key))}</b>${inner.head || ""}<br><small>${esc(this.text(key))}</small></div><div class="gv-btns">${inner.btns || ""}</div>${inner.after || ""}</div>`;
    };
    const owned = this.sorted(Object.keys(s.gems).filter((k) => s.gems[k] > 0 && this.matches(k)));
    const ownedHtml = owned.map((k) => {
      const i = WYD.gems.info(k), cost = WYD.gems.combineCost(k), canCombine = cost != null && s.gems[k] >= G.combineCount;
      const pick = this.picking === k, targets = pick ? this.targets(k) : [];
      const after = pick ? `<div class="gv-targets">${targets.length ? targets.map((t) => `<button data-gv-act="place" data-where="${t.where}" data-slot="${t.key}">${esc(this.itemLabel(t.where, t.item))}（空き${t.item.sockets.filter((x) => !x).length}）</button>`).join("") : `<span class="muted">空いたソケットのある装備がない</span>`}</div>` : "";
      return card(k, { head: ` ×${s.gems[k]}`, after,
        btns: `<button data-gv-act="pick" data-key="${esc(k)}" class="${pick ? "active" : ""}">${pick ? "やめる" : "はめる"}</button>` +
          (canCombine ? `<button data-gv-act="combine" data-key="${esc(k)}" title="${G.combineCount}つと${WYD.data.crafting.materialName}${cost}個で1つ上の段階に">合成</button>` : "") }, pick ? " picking" : "");
    }).join("");
    const used = this.socketed().filter((x) => this.matches(x.key));
    const usedSorted = this.sorted([...new Set(used.map((x) => x.key))]).flatMap((k) => used.filter((x) => x.key === k));
    const usedHtml = usedSorted.map((x) => card(x.key, { head: ` <small class="muted">${esc(this.itemLabel(x.where, x.item))}</small>`,
      btns: `<button data-gv-act="remove" data-where="${x.where}" data-slot="${x.slotKey}" data-index="${x.index}">外す</button>` })).join("");
    const total = Object.values(s.gems).reduce((n, v) => n + v, 0);
    this.$("gemvault-body").innerHTML = fusion +
      `<h3>手元の宝石 <small class="muted">${owned.length}種類（全部で${total}個）</small></h3><div class="gv-list">${ownedHtml || `<p class="muted">${total ? "条件に合う宝石がない" : "手元に宝石がない（精鋭とボスがよく落とす）"}</p>`}</div>` +
      `<h3>はめている宝石 <small class="muted">${usedSorted.length}個</small></h3><div class="gv-list">${usedHtml || `<p class="muted">${this.query || this.filter !== "all" ? "条件に合う宝石がない" : "はめている宝石がない"}</p>`}</div>`;
  },
};
