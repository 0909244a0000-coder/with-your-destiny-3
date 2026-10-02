// キャダラの賭け（数値は data/gamble.js）。
window.WYD = window.WYD || {};

WYD.gamble = {
  // もらえる装備のアイテムレベル：行ったことのある一番奥のエリア × 最高危険度
  itemLevel(state) {
    const bonus = Math.max(...WYD.data.areas.filter((a) => state.unlockedAreas.includes(a.id)).map((a) => a.itemLevelBonus));
    return state.maxDifficulty + bonus;
  },

  cost(state) {
    const G = WYD.data.gamble;
    return G.costBase + G.costPerLevel * this.itemLevel(state);
  },

  // その部位のユニーク・セット（今の職業で出るもの）
  uniquesFor(slot) {
    return WYD.loot.forClass(WYD.data.uniques.list).filter((u) => u.weight > 0 && this.slotOf(u.base) === slot);
  },
  setPiecesFor(slot) {
    const out = [];
    for (const set of WYD.loot.forClass(WYD.data.sets.list)) {
      for (const p of set.pieces) if (this.slotOf(p.base) === slot) out.push({ set, piece: p });
    }
    return out;
  },
  slotOf(baseId) {
    const b = WYD.data.items.bases.find((x) => x.id === baseId);
    return b ? b.slot : null;
  },

  // 1回賭ける。もらえた装備（できなければ null）
  roll(state, slot) {
    const G = WYD.data.gamble;
    const cost = this.cost(state);
    if (state.player.level < G.minLevel || state.materials < cost || WYD.inventory.isFull(state)) return null;
    if (!WYD.data.items.slots[slot]) return null;
    const lv = this.itemLevel(state);
    let rarity = WYD.util.pickWeighted(G.odds, (o) => o.weight).rarity;
    let item = null;
    if (rarity === "unique") {
      const list = this.uniquesFor(slot);
      if (list.length) item = WYD.loot.createUnique(state, lv, WYD.util.pickWeighted(list, (u) => u.weight));
      else rarity = "legend";
    } else if (rarity === "set") {
      const list = this.setPiecesFor(slot);
      if (list.length) {
        const pick = WYD.util.pick(list);
        item = WYD.loot.createSetPiece(state, lv, pick.set.id, pick.piece.id);
      } else rarity = "legend";
    }
    if (!item) item = WYD.loot.create(state, lv, 1, { slot, rarity });
    state.materials -= cost;
    WYD.inventory.add(state, item);
    WYD.records.found(state, item);
    WYD.records.add(state, "gambles");
    return item;
  },
};
