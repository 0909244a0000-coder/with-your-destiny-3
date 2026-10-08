// ソケットと宝石。宝石は「種類:段階」の名前で数だけ持つ（持ち物の枠は使わない）。
// 混沌の宝石（合成で作る）は能力を名前に書きこむ："fused:attack=24,fx.lifesteal=3.5"（fx. = 特殊効果）
window.WYD = window.WYD || {};

WYD.gems = {
  key(id, tier) {
    return `${id}:${tier}`;
  },

  // "ruby:1" → { def, tier, tierDef }（data にない宝石は null）
  info(key) {
    const [id, t] = String(key).split(":");
    const G = WYD.data.gems;
    if (id === "fused") {
      const lines = this.parseFused(t);
      return lines ? { def: { id, name: G.fusion.name, color: G.fusion.color }, tier: 0, tierDef: { name: "", mult: 1 }, fused: true, lines } : null;
    }
    // ルーン（"rune:el"）は段階なし
    if (id === "rune") {
      const def = G.runes.find((r) => r.id === t);
      return def ? { def, tier: 0, tierDef: { name: "", mult: 1 }, rune: true, index: G.runes.indexOf(def) } : null;
    }
    const def = G.gems.find((g) => g.id === id);
    const tier = Number(t);
    if (!def || !G.tiers[tier]) return null;
    return { def, tier, tierDef: G.tiers[tier] };
  },

  // 混沌の宝石の能力 [{ kind, id, value }]（読めなければ null）
  parseFused(text) {
    if (!text) return null;
    const lines = String(text).split(",").map((part) => {
      const [k, v] = part.split("="), value = Number(v);
      const effect = k.startsWith("fx."), id = effect ? k.slice(3) : k;
      const known = effect ? WYD.data.effects.list.some((d) => d.id === id) : !!WYD.data.items.stats[id];
      return known && Number.isFinite(value) ? { kind: effect ? "effect" : "stat", id, value } : null;
    });
    return lines.length && lines.every(Boolean) ? lines : null;
  },

  name(key) {
    const i = this.info(key);
    if (i && i.rune) return `ルーン「${i.def.name}」`;
    return i ? `${i.tierDef.name ? i.tierDef.name + " " : ""}${i.def.name}` : "？";
  },

  // そのルーンを1つ上にしたもの（なければ null）
  nextKey(key) {
    const i = this.info(key);
    if (!i) return null;
    if (i.fused) return null;
    if (i.rune) {
      const next = WYD.data.gems.runes[i.index + 1];
      return next ? `rune:${next.id}` : null;
    }
    return WYD.data.gems.tiers[i.tier + 1] ? this.key(i.def.id, i.tier + 1) : null;
  },

  // ノーマル装備のソケットのルーンが、ルーンワードとぴったり合えばその定義
  runeword(item) { return item && item.legacyRuneBonus || null; },

  // 敵を倒したとき、ルーンを落とすことがある
  dropRune(w, state, e) {
    const D = WYD.data.gems.runeDrop;
    const chance = (e.boss ? D.chanceBoss : e.elite ? D.chanceElite : D.chanceNormal) * WYD.season.mult(state, "gemMult");
    if (Math.random() >= chance) return;
    const r = WYD.util.pickWeighted(WYD.data.gems.runes, (x) => x.weight);
    const value = WYD.data.runeSkills.legacyRuneValues[WYD.data.gems.runes.indexOf(r)];
    WYD.runeSkills.ensure(state).essence += value;
    WYD.world.addText(w, e.x, e.y - 52, `ᚱ欠片 +${value}`, r.color);
    WYD.ui.log(`${WYD.data.runeSkills.essenceName} +${value}`, r.color);
    WYD.ui.markDirty();
  },

  color(key) {
    const i = this.info(key);
    return i ? i.def.color : "#888";
  },

  // その部位にはめたときに上がる能力 { 能力: 数値 }
  statsFor(key, slot) {
    const i = this.info(key);
    if (!i || i.rune) return {};
    if (i.fused) return Object.fromEntries(i.lines.filter((l) => l.kind === "stat").map((l) => [l.id, l.value]));
    const group = WYD.data.gems.slotGroup[slot];
    const base = i.def[group] || {};
    const out = {};
    for (const stat in base) out[stat] = base[stat] * i.tierDef.mult;
    return out;
  },

  // その宝石の特殊効果 { 効果: 数値 }（混沌の宝石だけ）
  effectsFor(key) {
    const i = this.info(key);
    return i && i.fused ? Object.fromEntries(i.lines.filter((l) => l.kind === "effect").map((l) => [l.id, l.value])) : {};
  },

  statsText(key, slot) {
    const st = this.statsFor(key, slot), fx = this.effectsFor(key);
    return Object.keys(st).map((k) => WYD.util.formatStat(k, st[k]))
      .concat(Object.keys(fx).map((k) => WYD.util.formatEffect(WYD.data.effects.list.find((d) => d.id === k), fx[k]))).join("、");
  },

  // ---- 宝石合成（数値は data/gems.js の fusion）----
  // 宝石1つの量（欠けた = 1、1段ごとに combineCount 倍。ルーン・混沌の宝石は入れない）
  fusionValue(key) {
    const i = this.info(key);
    return !i || i.rune || i.fused ? 0 : Math.pow(WYD.data.gems.combineCount, i.tier);
  },

  // 使う宝石を決める：段階の低いものから使う。{ use: { key: 数 }, total, need, ok }
  fusionPlan(state) {
    const F = WYD.data.gems.fusion, use = {};
    const keys = Object.keys(state.gems).filter((k) => state.gems[k] > 0 && this.fusionValue(k) > 0)
      .sort((a, b) => this.fusionValue(a) - this.fusionValue(b) || a.localeCompare(b));
    let total = 0;
    for (const k of keys) {
      while (total < F.need && (use[k] || 0) < state.gems[k]) { use[k] = (use[k] || 0) + 1; total += this.fusionValue(k); }
      if (total >= F.need) break;
    }
    return { use, total, need: F.need, ok: total >= F.need && state.materials >= F.cost };
  },

  // 能力をランダムに決めて、混沌の宝石の名前（key）を作る
  rollFused() {
    const F = WYD.data.gems.fusion, U = WYD.util;
    const n = U.pickWeighted(F.lineCount, (x) => x.weight).n, pool = [...F.pool], lines = [];
    while (lines.length < n && pool.length) {
      const p = U.pickWeighted(pool, (x) => x.weight);
      pool.splice(pool.indexOf(p), 1);
      const decimals = p.kind === "effect" ? WYD.data.effects.list.find((d) => d.id === p.id).decimals : WYD.data.items.stats[p.id].decimals;
      const value = Number((p.range[0] + Math.random() * (p.range[1] - p.range[0])).toFixed(decimals));
      lines.push(`${p.kind === "effect" ? "fx." : ""}${p.id}=${value}`);
    }
    return `fused:${lines.join(",")}`;
  },

  // 合成する。できたら作った宝石の key、できなければ null
  fuse(state) {
    const plan = this.fusionPlan(state);
    if (!plan.ok) return null;
    state.materials -= WYD.data.gems.fusion.cost;
    for (const k in plan.use) this.add(state, k, -plan.use[k]);
    const key = this.rollFused();
    this.add(state, key);
    return key;
  },

  // 新しい装備にソケットをつける
  rollSockets(item) {
    const S = WYD.data.gems.sockets;
    const max = S.max[item.slot] || 0;
    let n = 0;
    if (max > 0 && Math.random() < (S.chance[item.rarity] || 0)) {
      n = 1;
      while (n < max && Math.random() < S.secondChance) n++;
    }
    item.sockets = new Array(n).fill(null);
    return item;
  },

  add(state, key, n) {
    state.gems[key] = (state.gems[key] || 0) + (n == null ? 1 : n);
    if (state.gems[key] <= 0) delete state.gems[key];
  },

  // 今の場所で落ちる宝石の段階
  dropTier(state) {
    const D = WYD.data.gems.drop;
    const lv = WYD.trial.active(state)
      ? Math.floor((state.trialRun.level - 1) / D.trialTierEvery)
      : Math.floor((state.difficulty - 1) / D.tierEvery);
    return Math.min(D.maxDropTier, lv);
  },

  // 敵を倒したとき、宝石を落とすことがある（そのまま手に入る）
  onKill(w, state, e) {
    const D = WYD.data.gems.drop;
    const count = e.boss ? D.bossCount : Math.random() < (e.elite ? D.chanceElite : D.chanceNormal) * WYD.season.mult(state, "gemMult") ? 1 : 0;
    for (let i = 0; i < count; i++) {
      const key = this.key(WYD.util.pick(WYD.data.gems.gems).id, this.dropTier(state));
      this.add(state, key);
      WYD.offline.record("gems", 1);
      WYD.world.addText(w, e.x, e.y - 40 - i * 14, `◆${this.name(key)}`, this.color(key));
      WYD.ui.log(`宝石「${this.name(key)}」を手に入れた`, this.color(key));
    }
    if (count > 0) WYD.ui.markDirty();
    this.dropRune(w, state, e);
  },

  freeSocket(item) {
    return Array.isArray(item.sockets) ? item.sockets.indexOf(null) : -1;
  },

  // 宝石をはめる。できたら true
  socket(state, item, key) {
    if (!this.info(key) || this.info(key).rune) return false;
    const i = this.freeSocket(item);
    if (i < 0 || !(state.gems[key] > 0)) return false;
    item.sockets[i] = key;
    this.add(state, key, -1);
    return true;
  },

  // 装備を捨てるとき、はまっていた宝石を手元にもどす
  returnGems(state, item) {
    for (const key of item.sockets || []) if (key) this.add(state, key);
  },

  combineCost(key) {
    const i = this.info(key);
    if (!i || i.rune || !this.nextKey(key)) return null;
    return i.rune ? WYD.data.gems.runeUpgradeCost * (i.index + 1) : WYD.data.gems.combineCost[i.tier];
  },

  // 同じ宝石をまとめて1つ上の段階に。できたら true
  combine(state, key) {
    const G = WYD.data.gems;
    const i = this.info(key);
    const cost = this.combineCost(key);
    if (cost == null || (state.gems[key] || 0) < G.combineCount || state.materials < cost) return false;
    state.materials -= cost;
    this.add(state, key, -G.combineCount);
    this.add(state, this.nextKey(key));
    return true;
  },
};
