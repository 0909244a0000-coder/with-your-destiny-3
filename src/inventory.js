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
    const item = state.stash.splice(index, 1)[0];
    return item ? this.salvage(state, item) : 0;
  },

  // 捨てる（分解して素材をもらう）。もらった素材の数を返す
  discard(state, index) {
    const item = state.inventory.splice(index, 1)[0];
    return item ? this.salvage(state, item) : 0;
  },

  // 指定したレア度の装備をまとめて捨てる。{ count: 捨てた数, gained: もらった素材 } を返す
  discardRarities(state, rarityIds) {
    let count = 0, gained = 0;
    state.inventory = state.inventory.filter((it) => {
      if (!rarityIds.includes(it.rarity)) return true;
      // 強化した装備と、宝石をはめた装備は、まとめて捨てる対象にしない
      if (it.plus > 0 || (it.sockets || []).some((x) => x)) return true;
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
