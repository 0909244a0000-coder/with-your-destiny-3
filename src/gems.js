// ソケットと宝石。宝石は「種類:段階」の名前で数だけ持つ（持ち物の枠は使わない）。
window.WYD = window.WYD || {};

WYD.gems = {
  key(id, tier) {
    return `${id}:${tier}`;
  },

  // "ruby:1" → { def, tier, tierDef }（data にない宝石は null）
  info(key) {
    const [id, t] = String(key).split(":");
    const G = WYD.data.gems;
    const def = G.gems.find((g) => g.id === id);
    const tier = Number(t);
    if (!def || !G.tiers[tier]) return null;
    return { def, tier, tierDef: G.tiers[tier] };
  },

  name(key) {
    const i = this.info(key);
    return i ? `${i.tierDef.name ? i.tierDef.name + " " : ""}${i.def.name}` : "？";
  },

  color(key) {
    const i = this.info(key);
    return i ? i.def.color : "#888";
  },

  // その部位にはめたときに上がる能力 { 能力: 数値 }
  statsFor(key, slot) {
    const i = this.info(key);
    if (!i) return {};
    const group = WYD.data.gems.slotGroup[slot];
    const base = i.def[group] || {};
    const out = {};
    for (const stat in base) out[stat] = base[stat] * i.tierDef.mult;
    return out;
  },

  statsText(key, slot) {
    const st = this.statsFor(key, slot);
    return Object.keys(st).map((k) => WYD.util.formatStat(k, st[k])).join("、");
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
    const count = e.boss ? D.bossCount : Math.random() < (e.elite ? D.chanceElite : D.chanceNormal) ? 1 : 0;
    for (let i = 0; i < count; i++) {
      const key = this.key(WYD.util.pick(WYD.data.gems.gems).id, this.dropTier(state));
      this.add(state, key);
      WYD.offline.record("gems", 1);
      WYD.world.addText(w, e.x, e.y - 40 - i * 14, `◆${this.name(key)}`, this.color(key));
      WYD.ui.log(`宝石「${this.name(key)}」を手に入れた`, this.color(key));
    }
    if (count > 0) WYD.ui.markDirty();
  },

  freeSocket(item) {
    return Array.isArray(item.sockets) ? item.sockets.indexOf(null) : -1;
  },

  // 宝石をはめる。できたら true
  socket(state, item, key) {
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
    return i ? WYD.data.gems.combineCost[i.tier] : null;
  },

  // 同じ宝石をまとめて1つ上の段階に。できたら true
  combine(state, key) {
    const G = WYD.data.gems;
    const i = this.info(key);
    const cost = this.combineCost(key);
    if (cost == null || (state.gems[key] || 0) < G.combineCount || state.materials < cost) return false;
    state.materials -= cost;
    this.add(state, key, -G.combineCount);
    this.add(state, this.key(i.def.id, i.tier + 1));
    return true;
  },
};
