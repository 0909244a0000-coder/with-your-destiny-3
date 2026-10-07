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
        paragon: { level: 0, exp: 0, points: 0, board: {}, training: { owned: {}, active: null } },   // 修練（レベル上限のあと）。board = 取ったマス（"行,列" → true）
        runes: {} },   // スキルの型（スキル名 → 型の名前）
      equipment: {},   // slot -> item
      pendingLoot: [], // 満杯で受け取れなかった重要装備（職業別に保存）
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
      settings: { speed: 1, autoSalvage: "none", autoDifficulty: false, sound: true, autoEquip: true, fullReplace: true, season: "none", music: true, quietFx: false,
        filter: { on: false, slots: {}, keepUpgrades: true } },
      seenHelp: false, // 遊び方を見たか（最初の1回だけ自動で出す）
      cleared: false,  // 最後のボスを倒したか
      trial: { best: 0, level: 1, autoNext: true, runs: 0 },   // 終わりのない試練の記録
      trialRun: null,  // 今挑んでいる試練（読み直すとふつうの冒険にもどる）
      materials: 0,    // 素材（装備を捨てるともらえる。名前は data/crafting.js）
      records: {},     // 数えた記録（data/records.js の counters）
      codex: { uniques: {}, setPieces: {} },   // 図鑑（見つけたユニーク・セット装備の id）
      achievements: {},   // 達成した実績の id
      runeSkills: WYD.runeSkills.initial(),
      gems: {},        // 持っている宝石（"種類:段階" → 数）
      maps: [],        // 持っている地図（src/maps.js）
      runHistory: [],  // 成功した挑戦の記録（新しい順）
      runBest: {},     // 種類ごとのいちばんの記録
      uber: { keys: 0, kills: 0, stage: null },   // 奈落の鍵と、双王を倒した数、選んだ段階（null＝挑める最高）
      builds: [],      // 保存したビルド（src/builds.js）
      devotion: {},    // 埋めた星座（星座の id → true）
      mercenary: { type: null, rank: 1 },
      lgems: { owned: {}, equipped: [] },
      bounties: [],    // 賞金首の依頼（src/bounties.js）   // 伝説の宝石（src/legendaryGems.js）   // 雇っている傭兵（src/mercenary.js）
      bossDeaths: {},  // ボスに倒された回数（エリアの id → 回数。倒すと消える）
      mapBest: 0,      // 成功した地図の最高段階
      cube: { learned: {}, slots: { weapon: null, armor: null, jewelry: null } },   // カナイの箱
      daily: { lastDone: null, streak: 0, bestStreak: 0, total: 0 },   // 日替わりの試練の記録
    };
  },

  load() {
    try {
      let text = localStorage.getItem(this.KEY);
      if (!text) { const fresh = this.newState(); WYD.runeSkills.migrate(fresh); return fresh; }
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
      // ボードがなかった頃のセーブ：振っていたポイントをもどす
      const pgs = state.player.paragon;
      if (pgs.alloc) {
        for (const k in pgs.alloc) pgs.points += pgs.alloc[k];
        delete pgs.alloc;
      }
      pgs.board = Object.assign({}, pgs.board);
      WYD.training.ensure(state);
      state.player.runes = Object.assign({}, saved.player && saved.player.runes);
      state.player.skillEnabled = Object.assign(this.newState().player.skillEnabled, saved.player && saved.player.skillEnabled);
      state.settings = Object.assign(this.newState().settings, saved.settings);
      state.settings.filter = Object.assign(this.newState().settings.filter, saved.settings && saved.settings.filter);
      // エリアがなかった頃のセーブや、消えたエリアにいた場合は最初のエリアにする
      const areaIds = WYD.data.areas.map((a) => a.id);
      if (!Array.isArray(state.unlockedAreas)) state.unlockedAreas = [areaIds[0]];
      state.unlockedAreas = state.unlockedAreas.filter((id) => areaIds.includes(id));
      if (!state.unlockedAreas.includes(areaIds[0])) state.unlockedAreas.unshift(areaIds[0]);
      if (!state.unlockedAreas.includes(state.area)) state.area = areaIds[0];
      // 新しいエリアが増える前にクリアしていたセーブは、増えたエリアにも行けるようにする
      if (state.cleared) {
        for (const a of WYD.data.areas) if (!state.unlockedAreas.includes(a.id)) state.unlockedAreas.push(a.id);
      }
      // 階がなかった頃のセーブは地下1階から
      const curArea = WYD.data.areas.find((a) => a.id === state.area);
      if (!(state.floor >= 1 && state.floor <= curArea.floors + 1)) state.floor = 1;
      state.bossProgress = Math.min(state.bossProgress || 0, curArea.killsPerFloor);
      if (typeof state.materials !== "number") state.materials = 0;
      state.trial = Object.assign(this.newState().trial, saved.trial);
      state.trialRun = null;
      state.records = Object.assign({}, saved.records);
      state.codex = Object.assign(this.newState().codex, saved.codex);
      state.achievements = Object.assign({}, saved.achievements);
      state.gems = Object.assign({}, saved.gems);
      state.daily = Object.assign(this.newState().daily, saved.daily);
      if (!Array.isArray(state.maps)) state.maps = [];
      state.bossDeaths = Object.assign({}, saved.bossDeaths);
      state.devotion = Object.assign({}, saved.devotion);
      if (!Array.isArray(state.builds)) state.builds = [];
      state.uber = Object.assign(this.newState().uber, saved.uber);
      if (!Array.isArray(state.runHistory)) state.runHistory = [];
      state.runBest = Object.assign({}, saved.runBest);
      state.cube = { learned: Object.assign({}, saved.cube && saved.cube.learned),
        slots: Object.assign(this.newState().cube.slots, saved.cube && saved.cube.slots) };
      // 「ノーマルを拾わない」だった頃のセーブは、「ノーマルを自動分解」にする
      if (saved.settings && saved.settings.skipNormal && !saved.settings.autoSalvage) state.settings.autoSalvage = "normal";
      delete state.settings.skipNormal;
      if (!Array.isArray(state.stash)) state.stash = [];
      const ownedIds = new Set(state.inventory.concat(state.stash, Object.values(state.equipment)).filter(Boolean).map((it) => it.id));
      state.pendingLoot = (Array.isArray(saved.pendingLoot) ? saved.pendingLoot : []).filter((it) => {
        if (!it || !Number.isFinite(it.id) || ownedIds.has(it.id) || !Array.isArray(it.stats) || !WYD.data.items.slots[it.slot]) return false;
        ownedIds.add(it.id);
        state.nextItemId = Math.max(state.nextItemId, it.id + 1);
        return true;
      });
      // 倉庫廃止：旧アイテムは60枠のかばんへ、超過分は未受取に残す。
      while (state.stash.length) {
        const item = state.stash.shift();
        if (state.inventory.length < WYD.data.items.inventorySize) state.inventory.push(item);
        else state.pendingLoot.push(item);
      }
      for (const item of state.inventory.concat(state.stash, state.pendingLoot, Object.values(state.equipment))) {
        if (!item) continue;
        // 特殊効果がなかった頃の装備には、空の特殊効果を付けておく
        if (!Array.isArray(item.effects)) item.effects = [];
        // ソケットがなかった頃の装備は、ソケットなし
        if (!Array.isArray(item.sockets)) item.sockets = [];
        this.renameItem(item);
      }
      if (!saved.runeSkills?.migrated) {
        // 再設計前の原本は、通常バックアップの更新とは別に一度だけ残す。
        try { const key = this.KEY + "-before-rune-skills-v1"; if (!localStorage.getItem(key)) localStorage.setItem(key, text); }
        catch (e) { console.warn("移行前の控えを追加できませんでした。", e); }
      }
      WYD.runeSkills.migrate(state);
      WYD.records.backfill(state);
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
    const st = WYD.loot.setInfo(item);
    if (st) {
      item.name = st.piece.name;
      return;
    }
    const words = WYD.data.items.renamedWords || {};
    for (const old in words) item.name = item.name.split(old).join(words[old]);
  },

  // ---------- バックアップ（ファイルに書き出す・読み込む） ----------
  // このゲームのセーブ（全部のキャラ、控えもふくむ）をまとめて1つのファイルにする
  // share が true なら、できる端末では共有の窓を出す。"shared" か "downloaded" を返す
  exportAll(state, share) {
    this.write(state);
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("wyd3-")) data[k] = localStorage.getItem(k);
    }
    const file = { format: "wyd3-backup", version: 1, exportedAt: new Date().toISOString(), data };
    const text = JSON.stringify(file);
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const name = `wyd3-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    // スマホ：共有の窓（LINE・メール・AirDrop など）で、そのままほかの端末へ送れるようにする。
    // 共有できるファイルの種類が決まっているので、中身は同じ JSON のまま .txt にする
    if (share && navigator.canShare) {
      const f = new File([text], `${name}.txt`, { type: "text/plain" });
      if (navigator.canShare({ files: [f] })) {
        navigator.share({ files: [f], title: "With Your Destiny Ⅲ のセーブ" }).catch(() => {});
        return "shared";
      }
    }
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return "downloaded";
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
      // 保存直前のドロップも保護。元の世界は変更せず、読み込み後は未受取として復元する。
      const w = WYD.state === state && WYD.currentWorld;
      const ownedIds = new Set(state.inventory.concat(state.stash, Object.values(state.equipment)).filter(Boolean).map((it) => it.id));
      const pendingLoot = (state.pendingLoot || []).concat(w ? w.drops.filter((d) => !d.picked && WYD.inventory.protectDrop(state, d.item)).map((d) => d.item) : []).filter((it) => {
        if (ownedIds.has(it.id)) return false;
        ownedIds.add(it.id);
        return true;
      });
      localStorage.setItem(this.KEY, JSON.stringify(Object.assign({}, state, { pendingLoot })));
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
