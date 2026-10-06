// ビルドの保存と切り替え：装備（装備の id）・使うスキル・スキルの型・カナイの箱の枠をまとめて覚え、ワンクリックで戻す
window.WYD = window.WYD || {};

WYD.builds = {
  // 今の状態を n 番目に保存する
  save(state, n, name) {
    const equipment = {};
    for (const slot in state.equipment) if (state.equipment[slot]) equipment[slot] = state.equipment[slot].id;
    state.builds[n] = {
      runeSkill: state.runeSkills?.equipped || null,
      trainingArt: WYD.training.current(state)?.id || null,
      name: name || `ビルド${n + 1}`,
      equipment,
      skillEnabled: Object.assign({}, state.player.skillEnabled),
      runes: Object.assign({}, state.player.runes),
      cube: Object.assign({}, state.cube.slots),
    };
  },

  // id の装備を探す { list, index }（持ち物・倉庫）
  find(state, id) {
    for (const list of [state.inventory, state.stash]) {
      const index = list.findIndex((x) => x.id === id);
      if (index >= 0) return { list, index };
    }
    return null;
  },

  // n 番目を呼び出す。見つからなかった装備の数を返す
  load(state, n) {
    const b = state.builds[n];
    if (!b) return null;
    let missing = 0;
    for (const slot in b.equipment) {
      const id = b.equipment[slot];
      if (state.equipment[slot] && state.equipment[slot].id === id) continue;
      const at = this.find(state, id);
      if (!at) { missing++; continue; }
      // 倉庫にあるときは、いったん持ち物へ
      if (at.list === state.stash) {
        if (!WYD.inventory.fromStash(state, at.index)) { missing++; continue; }
      }
      const index = state.inventory.findIndex((x) => x.id === id);
      WYD.inventory.equip(state, index);
    }
    // スキルは、覚えているものだけ ON にもどす
    for (const id in b.skillEnabled) if (id in state.player.skills) state.player.skillEnabled[id] = b.skillEnabled[id] && state.player.skills[id] > 0;
    state.player.runes = Object.assign({}, b.runes);
    state.cube.slots = Object.assign({}, state.cube.slots, b.cube);
    if ("runeSkill" in b) state.runeSkills.equipped = state.runeSkills.skills.some(x=>x.id===b.runeSkill) ? b.runeSkill : null;
    if ("trainingArt" in b) WYD.training.equip(state, WYD.training.ensure(state).owned[b.trainingArt] ? b.trainingArt : null);
    return { missing };
  },
};
