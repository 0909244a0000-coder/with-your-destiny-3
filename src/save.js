// セーブとロード（ブラウザの localStorage に保存）。
window.WYD = window.WYD || {};

WYD.save = {
  BASE_KEY: "wyd3-save-v1",
  KEY: "wyd3-save-v1",   // 職業ごとに変わる（src/classes.js）

  newState() {
    const skills = {};
    const enabled = {};
    for (const id in WYD.data.skills) {
      skills[id] = WYD.data.skills[id].startLevel;
      enabled[id] = true;
    }
    return {
      version: 1,
      classId: WYD.classes.id,   // 職業
      player: { level: 1, exp: 0, skillPoints: 0, skills, skillEnabled: enabled,
        paragon: { level: 0, exp: 0, points: 0, alloc: {} },   // 修練（レベル上限のあと）
        runes: {} },   // スキルの型（スキル名 → 型の名前）
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
      let text = localStorage.getItem(this.KEY);
      if (!text) return this.newState();
      let saved;
      try {
        saved = JSON.parse(text);
        // 読めたセーブは「控え」として残しておく（次に壊れたときに戻せるように）
        localStorage.setItem(this.KEY + "-backup", text);
      } catch (e) {
        // 壊れていたら、前回の控えから読む
        text = localStorage.getItem(this.KEY + "-backup");
        if (!text) throw e;
        saved = JSON.parse(text);
        this.restoredFromBackup = true;
      }
      // 新しく増えた項目があっても壊れないように、初期値と合体する
      const base = this.newState();
      const state = Object.assign(base, saved);
      state.player = Object.assign(base.player, saved.player);
      state.player.skills = Object.assign(this.newState().player.skills, saved.player && saved.player.skills);
      state.player.paragon = Object.assign(this.newState().player.paragon, saved.player && saved.player.paragon);
      state.player.runes = Object.assign({}, saved.player && saved.player.runes);
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

  // ---------- バックアップ（ファイルに書き出す・読み込む） ----------
  // このゲームのセーブ（全部のキャラ、控えもふくむ）をまとめて1つのファイルにする
  exportAll(state) {
    this.write(state);
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("wyd3-")) data[k] = localStorage.getItem(k);
    }
    const file = { format: "wyd3-backup", version: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
    const a = document.createElement("a");
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    a.href = URL.createObjectURL(blob);
    a.download = `wyd3-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  // 書き出したファイルを読み込んで、セーブを置きかえる。うまくいったら true
  importAll(text) {
    const file = JSON.parse(text);
    if (!file || file.format !== "wyd3-backup" || typeof file.data !== "object") {
      throw new Error("このゲームのバックアップファイルではありません");
    }
    for (const k in file.data) {
      if (k.startsWith("wyd3-") && typeof file.data[k] === "string") localStorage.setItem(k, file.data[k]);
    }
    return true;
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
