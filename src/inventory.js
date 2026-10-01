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

  salvage(state, item) {
    const n = WYD.data.crafting.salvage[item.rarity] || 0;
    state.materials = (state.materials || 0) + n;
    return n;
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
