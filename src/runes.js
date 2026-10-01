// スキルの型（ルーン）：選んだ型に合わせて、スキルの数値を変えたものを作る（数値は data/runes.js）。
window.WYD = window.WYD || {};

WYD.runes = {
  // そのスキルの型の一覧（なければ空）
  list(skillId) {
    return WYD.data.runes.skills[skillId] || [];
  },

  // 型が選べるようになるスキルレベル（i = 0, 1, 2 番目）
  unlockLevel(i) {
    return WYD.data.runes.unlockLevels[i];
  },

  // 今選んでいる型（選んでいない・まだ解放されていないときは null）
  selected(state, skillId) {
    const id = (state.player.runes || {})[skillId];
    const list = this.list(skillId);
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) return null;
    return (state.player.skills[skillId] || 0) >= this.unlockLevel(i) ? list[i] : null;
  },

  // 型を反映したスキルの数値
  effectiveDef(state, skillId) {
    const def = WYD.data.skills[skillId];
    const rune = this.selected(state, skillId);
    if (!rune || !rune.mods) return def;
    const out = Object.assign({}, def);
    const groups = WYD.data.runes.groups;
    for (const key in rune.mods) {
      const [op, v] = rune.mods[key];
      for (const f of groups[key] || [key]) {
        if (out[f] == null && op !== "set") continue;
        if (op === "mul") out[f] = out[f] * v;
        else if (op === "add") out[f] = Math.max(1, out[f] + v);
        else out[f] = v;
      }
    }
    return out;
  },

  // 型のおまけの効果（なければ null）
  extra(state, skillId) {
    const rune = this.selected(state, skillId);
    return (rune && rune.extra) || null;
  },
};
