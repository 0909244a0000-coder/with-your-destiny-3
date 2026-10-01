// 持ち物と装備の操作。
window.WYD = window.WYD || {};

WYD.inventory = {
  isFull(state) {
    return state.inventory.length >= WYD.data.items.inventorySize;
  },

  add(state, item) {
    if (this.isFull(state)) return false;
    state.inventory.push(item);
    return true;
  },

  // 持ち物の index 番目を装備する（前の装備は同じ場所に戻る）
  equip(state, index) {
    const item = state.inventory[index];
    if (!item) return;
    const old = state.equipment[item.slot];
    state.equipment[item.slot] = item;
    state.inventory.splice(index, 1);
    if (old) state.inventory.splice(index, 0, old);
  },

  // 装備1つの点数（data/items.js の autoEquip）
  itemScore(item) {
    if (!item) return 0;
    const A = WYD.data.items.autoEquip;
    const st = WYD.loot.statTotals(item);
    let score = (item.effects || []).length * A.perEffect +
      (item.rarity === "unique" ? A.uniqueBonus : 0) + (item.rarity === "set" ? A.setBonus : 0);
    for (const k in st) score += st[k] * (A.weights[k] || 0);
    return score;
  },

  // 自動で着替えないほうがいい装備（自分で選んだはずのもの）
  keepEquipped(item) {
    return !!item && (item.locked || item.rarity === "unique" || item.rarity === "set" || item.plus > 0 || (item.sockets || []).some((x) => x));
  },

  // 拾った装備が強ければ着替える。着替えたら true
  autoEquip(state, item) {
    const cur = state.equipment[item.slot];
    if (this.keepEquipped(cur)) return false;
    const before = this.itemScore(cur);
    if (cur && this.itemScore(item) <= before * (1 + WYD.data.items.autoEquip.minGain)) return false;
    const index = state.inventory.indexOf(item);
    if (index < 0) return false;
    this.equip(state, index);
    return true;
  },

  unequip(state, slot) {
    const item = state.equipment[slot];
    if (!item || this.isFull(state)) return false;
    delete state.equipment[slot];
    state.inventory.push(item);
    return true;
  },

  // 持ち物 → 倉庫。できたら true
  toStash(state, index) {
    const item = state.inventory[index];
    if (!item || state.stash.length >= WYD.data.items.stashSize) return false;
    state.inventory.splice(index, 1);
    state.stash.push(item);
    return true;
  },

  // 倉庫 → 持ち物。できたら true
  fromStash(state, index) {
    const item = state.stash[index];
    if (!item || this.isFull(state)) return false;
    state.stash.splice(index, 1);
    state.inventory.push(item);
    return true;
  },

  // 倉庫の装備を捨てる（分解）。もらった素材の数を返す
  discardFromStash(state, index) {
    if (state.stash[index] && state.stash[index].locked) return -1;
    const item = state.stash.splice(index, 1)[0];
    return item ? this.salvage(state, item) : 0;
  },

  // 捨てる（分解して素材をもらう）。もらった素材の数を返す
  // ロックした装備は捨てられない（捨てたら素材の数、捨てなかったら -1）
  discard(state, index) {
    if (state.inventory[index] && state.inventory[index].locked) return -1;
    const item = state.inventory.splice(index, 1)[0];
    return item ? this.salvage(state, item) : 0;
  },

  // 指定したレア度の装備をまとめて捨てる。{ count: 捨てた数, gained: もらった素材 } を返す
  discardRarities(state, rarityIds) {
    let count = 0, gained = 0;
    state.inventory = state.inventory.filter((it) => {
      if (!rarityIds.includes(it.rarity)) return true;
      // 強化した装備と、宝石をはめた装備は、まとめて捨てる対象にしない
      if (it.locked || it.plus > 0 || (it.sockets || []).some((x) => x)) return true;
      count++;
      gained += this.salvage(state, it);
      return false;
    });
    return { count, gained };
  },

  // 自動分解の対象か（設定で選んだレア度以下。レジェンドとユニークは対象外）
  shouldAutoSalvage(state, item) {
    const opt = WYD.data.crafting.autoSalvageOptions.find((o) => o.id === state.settings.autoSalvage);
    if (!opt || !opt.upTo) return false;
    const order = WYD.data.items.rarities.map((r) => r.id);
    return order.indexOf(item.rarity) <= order.indexOf(opt.upTo);
  },

  // 捨てたときにもらえる素材の数
  salvageValue(item) {
    const C = WYD.data.crafting;
    return (C.salvage[item.rarity] || 0) + Math.floor((item.enhanceSpent || 0) * C.enhance.refundOnSalvage);
  },

  salvage(state, item) {
    WYD.gems.returnGems(state, item);
    const n = this.salvageValue(item);
    state.materials = (state.materials || 0) + n;
    return n;
  },

  // 振り直しの素材
  respecCost(state) {
    const C = WYD.data.crafting;
    return C.respecBase + C.respecPerLevel * state.player.level;
  },

  // スキルと修練の振り直し。もどしたポイントの数 { skill, paragon } か、素材が足りなければ null
  respec(state) {
    const cost = this.respecCost(state);
    if (state.materials < cost) return null;
    state.materials -= cost;
    const pl = state.player;
    let skill = 0;
    for (const id in WYD.data.skills) {
      const start = WYD.data.skills[id].startLevel;
      const lv = pl.skills[id] || 0;
      if (lv > start) skill += lv - start;
      pl.skills[id] = start;
      if (start <= 0) pl.skillEnabled[id] = false;
    }
    pl.skillPoints += skill;
    pl.runes = {};
    const pg = pl.paragon;
    let paragon = 0;
    for (const k in pg.alloc) paragon += pg.alloc[k];
    pg.alloc = {};
    pg.points += paragon;
    return { skill, paragon };
  },

  // 次の強化に必要な素材（もう上げられなければ null）
  enhanceCost(item) {
    const E = WYD.data.crafting.enhance;
    const plus = item.plus || 0;
    if (plus >= E.max) return null;
    return Math.round(E.costBase * Math.pow(E.costGrowth, plus) * (E.rarityCostMult[item.rarity] || 1));
  },

  // 強化する。できたら true
  enhance(state, item) {
    const cost = this.enhanceCost(item);
    if (cost == null || state.materials < cost) return false;
    state.materials -= cost;
    item.plus = (item.plus || 0) + 1;
    item.enhanceSpent = (item.enhanceSpent || 0) + cost;
    return true;
  },

  rerollCost(item) {
    return WYD.data.crafting.rerollCost[item.rarity] || 0;
  },

  // 特殊効果をつけ直す。できたら true
  reroll(state, item) {
    const cost = this.rerollCost(item);
    if (cost <= 0 || state.materials < cost) return false;
    state.materials -= cost;
    item.effects = WYD.loot.rollEffects(item.rarity);
    return true;
  },
};
