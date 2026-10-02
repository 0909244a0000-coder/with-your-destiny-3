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
      // 能力（強化と、はめた宝石もふくむ）
      const st = WYD.loot.statTotals(item);
      for (const k in st) bonus[k] += st[k];
    }
    return bonus;
  },

  // 装備についている特殊効果を合計する（上限つき）
  // 身につけているセット装備の数（セット名 → 数）
  setCounts(state) {
    const out = {};
    for (const slot in state.equipment) {
      const info = WYD.loot.setInfo(state.equipment[slot]);
      if (info) out[info.set.id] = (out[info.set.id] || 0) + 1;
    }
    return out;
  },

  // 今効いているセットのボーナスの一覧 [{ set, need, bonus }]
  activeSetBonuses(state) {
    const counts = this.setCounts(state);
    const out = [];
    for (const set of WYD.data.sets.list) {
      for (const need in set.bonuses) {
        if ((counts[set.id] || 0) >= Number(need)) out.push({ set, need: Number(need), bonus: set.bonuses[need] });
      }
    }
    return out;
  },

  effectTotals(state) {
    const totals = {};
    for (const def of WYD.data.effects.list) totals[def.id] = 0;
    for (const a of this.activeSetBonuses(state)) {
      for (const id in a.bonus.effects || {}) if (id in totals) totals[id] += a.bonus.effects[id];
    }
    for (const c of WYD.devotion.owned(state)) {
      for (const id in c.bonus.effects || {}) if (id in totals) totals[id] += c.bonus.effects[id];
    }
    for (const slot in state.equipment) {
      // ルーンワードの特殊効果
      const rw = WYD.gems.runeword(state.equipment[slot]);
      if (rw) for (const id in rw.bonus.effects || {}) if (id in totals) totals[id] += rw.bonus.effects[id];
    }
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

  // 装備中のユニーク装備の固有能力（power の名前 → params）
  powers(state) {
    const out = {};
    for (const slot in state.equipment) {
      const def = WYD.loot.uniqueInfo(state.equipment[slot]);
      if (def) out[def.power] = def.params;
    }
    for (const a of this.activeSetBonuses(state)) {
      if (a.bonus.power && !out[a.bonus.power]) out[a.bonus.power] = a.bonus.params;
    }
    // ルーンワードの固有能力
    for (const slot in state.equipment) {
      const rw = WYD.gems.runeword(state.equipment[slot]);
      if (rw && rw.bonus.power && !out[rw.bonus.power]) out[rw.bonus.power] = rw.bonus.params;
    }
    // 星座の固有能力
    for (const c of WYD.devotion.owned(state)) if (c.bonus.power && !out[c.bonus.power]) out[c.bonus.power] = c.bonus.params;
    // カナイの箱に入れた能力（装備と同じ能力なら装備のほうが効く）
    for (const def of WYD.cube.active(state)) if (!out[def.power]) out[def.power] = def.params;
    return out;
  },

  compute(state) {
    const P = WYD.data.player;
    const lv = state.player.level - 1;
    const b = this.equipmentBonus(state);
    // セットのボーナスと星座の能力を足す
    for (const sb of this.activeSetBonuses(state)) {
      for (const k in sb.bonus.stats || {}) b[k] = (b[k] || 0) + sb.bonus.stats[k];
    }
    for (const c of WYD.devotion.owned(state)) {
      for (const k in c.bonus.stats || {}) b[k] = (b[k] || 0) + c.bonus.stats[k];
    }
    const fx = this.effectTotals(state);
    const pb = this.paragonBonus(state);
    const powers = this.powers(state);
    // 固有能力：苦行者の法衣（スキルの空き枠でスキル威力アップ）
    let asceticBonus = 0;
    if (powers.ascetic) {
      const pl = state.player;
      const active = Object.keys(WYD.data.skills).filter((id) => (pl.skills[id] || 0) > 0 && pl.skillEnabled[id]).length;
      asceticBonus = Math.max(0, WYD.data.skillSlots - active) * powers.ascetic.percentPerSlot;
    }
    return {
      maxHp: Math.round(P.base.maxHp + P.perLevel.maxHp * lv + b.maxHp + pb.maxHp),
      attack: P.base.attack + P.perLevel.attack * lv + b.attack + pb.attack,
      defense: P.base.defense + P.perLevel.defense * lv + b.defense + pb.defense,
      attackSpeed: Math.max(P.minAttackSpeed, P.base.attackSpeed * (1 + (b.attackSpeed + pb.attackSpeed) / 100)),
      critChance: Math.min(P.critChanceCap, P.base.critChance + b.critChance + pb.critChance),
      hpRegen: P.base.hpRegen + b.hpRegen + pb.hpRegen,
      moveSpeed: P.base.moveSpeed * (1 + (b.moveSpeed + fx.moveSpeed) / 100),
      skillDamage: b.skillDamage + asceticBonus + pb.skillDamage,
      magicFind: pb.magicFind,   // レア発見（%）
      powers,
      critMultiplier: P.critMultiplier + fx.critDamage / 100,
      effects: fx,
    };
  },

  expToNext(level) {
    const P = WYD.data.player;
    const early = Math.min(level, P.expLateFrom) - 1;
    const late = Math.max(0, level - P.expLateFrom);
    return Math.round(P.expBase * Math.pow(P.expGrowth, early) * Math.pow(P.expGrowthLate, late));
  },

  // 修練レベル1つぶんに必要な経験値
  paragonToNext(plevel) {
    const G = WYD.data.player.paragon;
    return Math.round(G.expBase * Math.pow(G.expGrowth, plevel));
  },

  // 修練ポイントで上げた能力
  paragonBonus(state) {
    const G = WYD.data.player.paragon;
    const pg = state.player.paragon || {};
    const alloc = pg.alloc || {};
    const out = {};
    for (const k in G.stats) out[k] = (alloc[k] || 0) * G.stats[k].per;
    return out;
  },
};
