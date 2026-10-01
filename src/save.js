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
      player: { level: 1, exp: 0, skillPoints: 0, skills, skillEnabled: enabled,
        paragon: { level: 0, exp: 0, points: 0, alloc: {} } },   // 修練（レベル上限のあと）
      equipment: {},   // slot -> item
      inventory: [],   // item の配列
      stash: [],       // 倉庫（item の配列）
      nextItemId: 1,
      difficulty: 1,
      maxDifficulty: 1,
      killsAtMax: 0,
      area: WYD.data.areas[0].id,               // 今いるエリア
      unlockedAreas: [WYD.data.areas[0].id],    // 行けるエリア
      floor: 1,                                 // 今いる階（ふつうの階の数+1 がボスの間）
      bossProgress: 0,                          // 次の階へ降りるまでに倒した数
      settings: { speed: 1, autoSalvage: "none", autoDifficulty: false, sound: true },
      seenHelp: false, // 遊び方を見たか（最初の1回だけ自動で出す）
      cleared: false,  // 最後のボスを倒したか
      materials: 0,    // 素材（装備を捨てるともらえる。名前は data/crafting.js）
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
      state.player.paragon = Object.assign(this.newState().player.paragon, saved.player && saved.player.paragon);
      state.player.skillEnabled = Object.assign(this.newState().player.skillEnabled, saved.player && saved.player.skillEnabled);
      state.settings = Object.assign(this.newState().settings, saved.settings);
      // エリアがなかった頃のセーブや、消えたエリアにいた場合は最初のエリアにする
      const areaIds = WYD.data.areas.map((a) => a.id);
      if (!Array.isArray(state.unlockedAreas)) state.unlockedAreas = [areaIds[0]];
      state.unlockedAreas = state.unlockedAreas.filter((id) => areaIds.includes(id));
      if (!state.unlockedAreas.includes(areaIds[0])) state.unlockedAreas.unshift(areaIds[0]);
      if (!state.unlockedAreas.includes(state.area)) state.area = areaIds[0];
      // 階がなかった頃のセーブは地下1階から
      const curArea = WYD.data.areas.find((a) => a.id === state.area);
      if (!(state.floor >= 1 && state.floor <= curArea.floors + 1)) state.floor = 1;
      state.bossProgress = Math.min(state.bossProgress || 0, curArea.killsPerFloor);
      if (typeof state.materials !== "number") state.materials = 0;
      // 「ノーマルを拾わない」だった頃のセーブは、「ノーマルを自動分解」にする
      if (saved.settings && saved.settings.skipNormal && !saved.settings.autoSalvage) state.settings.autoSalvage = "normal";
      delete state.settings.skipNormal;
      if (!Array.isArray(state.stash)) state.stash = [];
      for (const item of state.inventory.concat(state.stash, Object.values(state.equipment))) {
        if (!item) continue;
        // 特殊効果がなかった頃の装備には、空の特殊効果を付けておく
        if (!Array.isArray(item.effects)) item.effects = [];
        this.renameItem(item);
      }
      return state;
    } catch (e) {
      console.warn("セーブデータを読めませんでした。新しく始めます。", e);
      return this.newState();
    }
  },

  // 名前を変えた装備を、今の名前に直す（data/items.js の renamedWords）
  renameItem(item) {
    const u = WYD.loot.uniqueInfo(item);
    if (u) {
      item.name = u.name;
      return;
    }
    const words = WYD.data.items.renamedWords || {};
    for (const old in words) item.name = item.name.split(old).join(words[old]);
  },

  write(state) {
    try {
      state.lastSeen = Date.now();   // 放置中の進行に使う
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
