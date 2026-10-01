// レベルと装備から、今の能力値を計算する。
window.WYD = window.WYD || {};

WYD.stats = {
  // 装備についている能力を合計する
  equipmentBonus(state) {
    const bonus = {};
    for (const stat in WYD.data.items.stats) bonus[stat] = 0;
    for (const slot in state.equipment) {
      const item = state.equipment[slot];
      if (!item) continue;
      for (const line of item.stats) bonus[line.stat] += line.value;
    }
    return bonus;
  },

  // 装備についている特殊効果を合計する（上限つき）
  effectTotals(state) {
    const totals = {};
    for (const def of WYD.data.effects.list) totals[def.id] = 0;
    for (const slot in state.equipment) {
      const item = state.equipment[slot];
      if (!item || !Array.isArray(item.effects)) continue;
      for (const fx of item.effects) {
        if (fx.id in totals) totals[fx.id] += fx.value;
      }
    }
    for (const def of WYD.data.effects.list) totals[def.id] = Math.min(def.cap, totals[def.id]);
    return totals;
  },

  compute(state) {
    const P = WYD.data.player;
    const lv = state.player.level - 1;
    const b = this.equipmentBonus(state);
    const fx = this.effectTotals(state);
    return {
      maxHp: Math.round(P.base.maxHp + P.perLevel.maxHp * lv + b.maxHp),
      attack: P.base.attack + P.perLevel.attack * lv + b.attack,
      defense: P.base.defense + P.perLevel.defense * lv + b.defense,
      attackSpeed: Math.max(P.minAttackSpeed, P.base.attackSpeed * (1 + b.attackSpeed / 100)),
      critChance: Math.min(P.critChanceCap, P.base.critChance + b.critChance),
      hpRegen: P.base.hpRegen + b.hpRegen,
      moveSpeed: P.base.moveSpeed * (1 + (b.moveSpeed + fx.moveSpeed) / 100),
      skillDamage: b.skillDamage,
      critMultiplier: P.critMultiplier + fx.critDamage / 100,
      effects: fx,
    };
  },

  expToNext(level) {
    const P = WYD.data.player;
    return Math.round(P.expBase * Math.pow(P.expGrowth, level - 1));
  },
};
