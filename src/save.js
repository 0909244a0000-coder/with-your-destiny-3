// セーブとロード（ブラウザの localStorage に保存）。
window.WYD = window.WYD || {};

WYD.save = {
  KEY: "wyd3-save-v1",

  newState() {
    const skills = {};
    const enabled = {};
    for (const id in WYD.data.skills) {
      skills[id] = WYD.data.skills[id].startLevel;
      enabled[id] = true;
    }
    return {
      version: 1,
      player: { level: 1, exp: 0, skillPoints: 0, skills, skillEnabled: enabled },
      equipment: {},   // slot -> item
      inventory: [],   // item の配列
      nextItemId: 1,
      difficulty: 1,
      maxDifficulty: 1,
      killsAtMax: 0,
      settings: { speed: 1, skipNormal: false },
    };
  },

  load() {
    try {
      const text = localStorage.getItem(this.KEY);
      if (!text) return this.newState();
      const saved = JSON.parse(text);
      // 新しく増えた項目があっても壊れないように、初期値と合体する
      const base = this.newState();
      const state = Object.assign(base, saved);
      state.player = Object.assign(base.player, saved.player);
      state.player.skills = Object.assign(this.newState().player.skills, saved.player && saved.player.skills);
      state.player.skillEnabled = Object.assign(this.newState().player.skillEnabled, saved.player && saved.player.skillEnabled);
      state.settings = Object.assign(this.newState().settings, saved.settings);
      // 特殊効果がなかった頃の装備には、空の特殊効果を付けておく
      for (const item of state.inventory.concat(Object.values(state.equipment))) {
        if (item && !Array.isArray(item.effects)) item.effects = [];
      }
      return state;
    } catch (e) {
      console.warn("セーブデータを読めませんでした。新しく始めます。", e);
      return this.newState();
    }
  },

  write(state) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("セーブできませんでした。", e);
    }
  },

  reset() {
    try {
      localStorage.removeItem(this.KEY);
    } catch (e) {
      // 何もしない
    }
  },
};
