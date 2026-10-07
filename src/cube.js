// カナイの箱：ユニークを分解して固有能力を覚え、3つの枠に入れて使う。
window.WYD = window.WYD || {};

WYD.cube = {
  // そのユニークが入る枠（weapon / armor / jewelry）
  slotOf(def) {
    const base = WYD.data.items.bases.find((b) => b.id === def.base);
    return WYD.data.gems.slotGroup[base.slot];
  },

  // 分解して覚える。覚えたら true（理由つきで false）
  extract(state, item) {
    const C = WYD.data.cube;
    const def = WYD.loot.uniqueInfo(item);
    if (!def) return { ok: false, why: "ユニーク装備だけ箱に入れられる" };
    if (state.cube.learned[def.id]) return { ok: false, why: `「${def.name}」の力はもう覚えている` };
    if (item.locked) return { ok: false, why: "ロックしている装備は入れられない" };
    if (state.materials < C.extractCost) return { ok: false, why: `${WYD.data.crafting.materialName}が${C.extractCost}個いる` };
    state.materials -= C.extractCost;
    WYD.gems.returnGems(state, item);
    for (const list of [state.inventory, state.stash]) {
      const i = list.indexOf(item);
      if (i >= 0) list.splice(i, 1);
    }
    for (const slot in state.equipment) if (state.equipment[slot] === item) delete state.equipment[slot];
    state.cube.learned[def.id] = true;
    // 枠が空いていれば、そのまま入れる
    const cs = this.slotOf(def);
    if (!state.cube.slots[cs]) state.cube.slots[cs] = def.id;
    return { ok: true, def };
  },

  // 今、箱の枠に入っている能力の一覧（def の配列）
  active(state) {
    const out = [];
    for (const k in state.cube.slots) {
      const id = state.cube.slots[k];
      const def = id && WYD.loot.forClassDef(WYD.data.uniques.list.find((u) => u.id === id));
      if (def && WYD.loot.forClass([def]).length) out.push(def);
    }
    return out;
  },

  // 枠に入れられる、覚えた能力の一覧
  learnedFor(state, cs) {
    return WYD.loot.forClass(WYD.data.uniques.list).filter((u) => state.cube.learned[u.id] && this.slotOf(u) === cs);
  },
};
