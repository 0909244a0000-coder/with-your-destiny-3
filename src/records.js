// 図鑑と記録と実績。数を数え、拾ったユニーク・セット装備を図鑑に載せ、実績を達成したら素材をもらう。
window.WYD = window.WYD || {};

WYD.records = {
  // 記録を数える
  add(state, key, n) {
    state.records[key] = (state.records[key] || 0) + (n == null ? 1 : n);
  },

  // 拾った装備を図鑑に載せ、拾った数を数える
  found(state, item) {
    if (item.rarity === "legend") this.add(state, "legendsFound");
    if (item.ancient) this.add(state, item.ancient === 2 ? "primalsFound" : "ancientsFound");
    if (item.unique) {
      this.add(state, "uniquesFound");
      state.codex.uniques[item.unique] = true;
    }
    if (item.set) {
      this.add(state, "setsFound");
      state.codex.setPieces[item.piece] = true;
    }
  },

  // 持っている装備を図鑑に載せる（図鑑がなかった頃のセーブ用）
  backfill(state) {
    for (const item of state.inventory.concat(state.stash, Object.values(state.equipment))) {
      if (!item) continue;
      if (item.unique) state.codex.uniques[item.unique] = true;
      if (item.set) state.codex.setPieces[item.piece] = true;
    }
  },

  // 実績の今の値
  progress(state, a) {
    const c = state.codex;
    switch (a.check) {
      case "counter": return state.records[a.key] || 0;
      case "level": return state.player.level;
      case "paragon": return state.player.paragon.level;
      case "maxDifficulty": return state.maxDifficulty;
      case "trialBest": return state.trial.best;
      case "uniques": return WYD.loot.forClass(WYD.data.uniques.list).filter((u) => c.uniques[u.id]).length;
      case "setPieces": return Object.keys(c.setPieces).length;
      case "setComplete": return WYD.loot.forClass(WYD.data.sets.list).filter((s) => s.pieces.every((p) => c.setPieces[p.id])).length;
      case "cleared": return state.cleared ? 1 : 0;
      case "dailyStreak": return state.daily.bestStreak;
      case "dailyTotal": return state.daily.total;
      case "mapBest": return state.mapBest || 0;
    }
    return 0;
  },

  // 実績の目標の値（"all" は全種類）
  target(a) {
    if (a.value !== "all") return a.value;
    if (a.check === "uniques") return WYD.loot.forClass(WYD.data.uniques.list).length;
    return 1;
  },

  // 達成した実績があれば、印をつけて素材を渡す
  check(state) {
    const R = WYD.data.records;
    for (const a of R.achievements) {
      if (state.achievements[a.id]) continue;
      if (this.progress(state, a) < this.target(a)) continue;
      state.achievements[a.id] = true;
      state.materials += a.reward;
      WYD.ui.notice(`実績「${a.name}」を達成！（${a.desc}）${WYD.data.crafting.materialName} +${a.reward}`, R.color);
      WYD.sound.play("achievement");
      WYD.ui.markDirty();
    }
  },

  // 遊んだ時間を「1時間2分」のように
  timeText(sec) {
    const m = Math.floor(sec / 60), h = Math.floor(m / 60);
    return h > 0 ? `${h}時間${m % 60}分` : `${m}分`;
  },
};
