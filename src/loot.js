// 装備をランダムに作る。
window.WYD = window.WYD || {};

WYD.loot = {
  rollValue(stat, range, itemLevel) {
    const D = WYD.data.items;
    const info = D.stats[stat];
    let v = WYD.util.rand(range[0], range[1]);
    if (info.scales) v *= 1 + D.levelScaling * (itemLevel - 1);
    const p = Math.pow(10, info.decimals);
    return Math.round(v * p) / p;
  },

  rollRarity(rarityBonus) {
    const D = WYD.data.items;
    return WYD.util.pickWeighted(D.rarities, (r) =>
      r.id === "normal" ? r.weight : r.weight * rarityBonus
    );
  },

  create(state, itemLevel, rarityBonus) {
    const D = WYD.data.items;
    const u = WYD.util;
    const base = u.pick(D.bases);
    const rarity = this.rollRarity(rarityBonus);

    const stats = [];
    for (const stat in base.main) {
      stats.push({ stat, value: this.rollValue(stat, base.main[stat], itemLevel), main: true });
    }
    // 追加能力（同じ能力は2回つかない）
    const count = u.randInt(rarity.affixes[0], rarity.affixes[1]);
    const pool = D.affixes.slice();
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const affix = pool.splice(idx, 1)[0];
      stats.push({ stat: affix.stat, value: this.rollValue(affix.stat, affix.range, itemLevel), main: false });
    }

    let name = base.name;
    if (rarity.id === "rare") name = u.pick(D.rarePrefixes) + base.name;
    if (rarity.id === "legend") name = u.pick(D.legendPrefixes) + base.name;

    return {
      id: state.nextItemId++,
      name,
      slot: base.slot,
      rarity: rarity.id,
      level: itemLevel,
      stats,
      effects: this.rollEffects(rarity.id),
    };
  },

  // 特殊効果をランダムに決める（同じ効果は2回つかない）
  rollEffects(rarityId) {
    const E = WYD.data.effects;
    const u = WYD.util;
    const range = E.countByRarity[rarityId] || [0, 0];
    const count = u.randInt(range[0], range[1]);
    const pool = E.list.slice();
    const effects = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const def = u.pickWeighted(pool, (x) => x.weight);
      pool.splice(pool.indexOf(def), 1);
      const p = Math.pow(10, def.decimals);
      const value = Math.round(u.rand(def.range[0], def.range[1]) * p) / p;
      effects.push({ id: def.id, value });
    }
    return effects;
  },

  effectInfo(id) {
    return WYD.data.effects.list.find((x) => x.id === id);
  },

  rarityInfo(id) {
    return WYD.data.items.rarities.find((r) => r.id === id);
  },
};
