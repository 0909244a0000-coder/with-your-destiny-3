// 賞金首の依頼（数値は data/bounties.js）。セーブは state.bounties = [{ type, area, target, progress }]
window.WYD = window.WYD || {};

WYD.bounties = {
  typeDef(id) {
    return WYD.data.bounties.types.find((t) => t.id === id) || null;
  },

  // 足りなければ新しい依頼を出す（同じ種類・同じエリアは重ねない）
  ensure(state) {
    const D = WYD.data.bounties;
    state.bounties = (state.bounties || []).filter((b) => this.typeDef(b.type));
    let guard = 0;
    while (state.bounties.length < D.count && guard++ < 50) {
      const t = WYD.util.pickWeighted(D.types, (x) => x.weight);
      const area = t.area ? WYD.util.pick(state.unlockedAreas) : null;
      if (state.bounties.some((b) => b.type === t.id && b.area === area)) continue;
      state.bounties.push({ type: t.id, area, target: WYD.util.randInt(t.target[0], t.target[1]), progress: 0 });
    }
  },

  text(b) {
    const t = this.typeDef(b.type);
    const area = b.area && WYD.data.areas.find((a) => a.id === b.area);
    return t.text.replace("{n}", b.target).replace("{area}", area ? area.name : "");
  },

  // 記録が増えたとき（src/records.js の add から）
  onRecord(state, key, n) {
    if (!state.bounties || state.bounties.length < WYD.data.bounties.count) this.ensure(state);
    const inTrial = WYD.trial.active(state);
    for (const b of state.bounties.slice()) {
      const t = this.typeDef(b.type);
      if (!t || t.record !== key) continue;
      if (t.area && (inTrial || state.area !== b.area)) continue;
      b.progress = Math.min(b.target, b.progress + n);
      if (b.progress >= b.target) this.complete(state, b);
    }
  },

  areaIndex(state, b) {
    const ids = WYD.data.areas.map((a) => a.id);
    if (b.area) return ids.indexOf(b.area);
    return Math.max(...state.unlockedAreas.map((id) => ids.indexOf(id)));
  },

  complete(state, b) {
    const D = WYD.data.bounties;
    const R = D.reward;
    state.bounties = state.bounties.filter((x) => x !== b);
    const ai = this.areaIndex(state, b);
    const area = WYD.data.areas[ai];
    const mats = R.materialsBase + R.materialsPerArea * ai;
    state.materials += mats;
    // 装備の箱：そのエリアのアイテムレベルで、レア以上。持ち物がいっぱいなら素材にする
    const lv = state.maxDifficulty + area.itemLevelBonus;
    let got = 0, salvaged = 0;
    for (let i = 0; i < R.items; i++) {
      const rarity = WYD.util.pickWeighted(R.odds, (o) => o.weight).rarity;
      const item = WYD.loot.create(state, lv, 1, { rarity });
      if (!WYD.inventory.add(state, item)) {
        salvaged += WYD.inventory.salvage(state, item);
      } else {
        got++;
        WYD.records.found(state, item);
      }
    }
    const full = got < R.items ? `（持ち物がいっぱいなので${R.items - got}個は素材に）` : "";
    WYD.ui.notice(`依頼達成「${this.text(b)}」：${WYD.data.crafting.materialName} +${mats + salvaged}・装備${got}個${full}`, D.color);
    WYD.sound.play("achievement");
    WYD.records.add(state, "bounties");
    this.ensure(state);
    WYD.ui.markDirty();
  },

  reroll(state, index) {
    const D = WYD.data.bounties;
    if (!state.bounties[index] || state.materials < D.rerollCost) return false;
    state.materials -= D.rerollCost;
    state.bounties.splice(index, 1);
    this.ensure(state);
    return true;
  },
};
