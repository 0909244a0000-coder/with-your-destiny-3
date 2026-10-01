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

  discard(state, index) {
    state.inventory.splice(index, 1);
  },

  // 指定したレア度の装備をまとめて捨てる
  discardRarities(state, rarityIds) {
    const before = state.inventory.length;
    state.inventory = state.inventory.filter((it) => !rarityIds.includes(it.rarity));
    return before - state.inventory.length;
  },
};
