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
      base: base.id,
      rarity: rarity.id,
      level: itemLevel,
      stats,
      effects: this.rollEffects(rarity.id),
    };
  },

  // ユニーク装備を作る（def を省くとランダムに選ぶ）
  createUnique(state, itemLevel, def) {
    const U = WYD.data.uniques;
    def = def || WYD.util.pickWeighted(U.list, (x) => x.weight);
    const base = WYD.data.items.bases.find((b) => b.id === def.base);
    const stats = [];
    for (const stat in base.main) {
      stats.push({ stat, value: this.rollValue(stat, base.main[stat], itemLevel), main: true });
    }
    for (const stat in def.stats) {
      stats.push({ stat, value: this.rollValue(stat, def.stats[stat], itemLevel), main: false });
    }
    return {
      id: state.nextItemId++,
      name: def.name,
      slot: base.slot,
      base: base.id,
      rarity: "unique",
      unique: def.id,
      level: itemLevel,
      stats,
      effects: this.rollEffects("unique"),
    };
  },

  uniqueInfo(item) {
    return (item && item.unique && WYD.data.uniques.list.find((u) => u.id === item.unique)) || null;
  },

  // 固有能力の説明文（{名前} を params の数値に置きかえる）
  uniqueDesc(def) {
    return def.desc
      .replace(/\{skill:(\w+)\}/g, (all, kind) => WYD.classes.skillNameByKind(kind))
      .replace(/\{(\w+)\}/g, (all, key) => (key in def.params ? String(def.params[key]) : all));
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

  // 装備の種類（古いセーブの装備は名前から探す）
  baseOf(item) {
    const bases = WYD.data.items.bases;
    return bases.find((b) => b.id === item.base) ||
      bases.find((b) => b.slot === item.slot && item.name.endsWith(b.name)) || null;
  },

  // 装備のアイコンの絵のファイル（なければ null）
  iconOf(item) {
    const base = this.baseOf(item);
    return (base && WYD.data.items.icons[base.id]) || null;
  },

  rarityInfo(id) {
    return WYD.data.items.rarities.find((r) => r.id === id);
  },
};
