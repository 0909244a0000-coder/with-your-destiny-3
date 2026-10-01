// 日替わりの試練：試練（src/trial.js）のしくみを使い、日付で決まる条件をつけて挑む。
window.WYD = window.WYD || {};

WYD.daily = {
  // 今日の日付（"2026-10-02"。遊んでいる人の時計で）
  today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },

  // 日付から決まる乱数（同じ日なら同じ並び）
  rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  },

  // その日の条件と守護者 { mods: [条件], guardian }
  forDate(date) {
    const D = WYD.data.daily;
    const r = this.rng(date);
    const pool = D.mods.slice();
    const mods = [];
    for (let i = 0; i < D.modCount && pool.length; i++) mods.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    const g = WYD.data.trial.guardians;
    return { mods, guardian: g[Math.floor(r() * g.length)] };
  },

  doneToday(state) {
    return state.daily.lastDone === this.today();
  },

  stage(state) {
    return Math.max(1, state.trial.best + WYD.data.daily.stageOffset);
  },

  // 今の試練についている条件（日替わりでなければ空）
  mods(state) {
    const run = state.trialRun;
    if (!run || !run.daily) return [];
    return run.daily.modIds.map((id) => WYD.data.daily.mods.find((m) => m.id === id)).filter(Boolean);
  },

  // 条件の倍率をかけあわせる（name = "enemyHp" など）
  mult(state, name) {
    return this.mods(state).reduce((a, m) => a * (m[name] || 1), 1);
  },

  // 出てきた敵に条件をかける
  modifyEnemy(state, e) {
    if (!this.mods(state).length) return;
    const hp = this.mult(state, "enemyHp");
    e.maxHp = Math.round(e.maxHp * hp);
    e.hp = e.maxHp;
    e.attack *= this.mult(state, "enemyAttack");
    e.moveSpeedMult *= this.mult(state, "enemySpeed");
  },

  start(w, state) {
    if (this.doneToday(state)) return;
    const date = this.today();
    const day = this.forDate(date);
    WYD.trial.start(w, state, this.stage(state), { date, modIds: day.mods.map((m) => m.id), guardian: day.guardian });
  },

  // 成功・失敗したとき（src/trial.js の finish から）
  finish(w, state, success, guardian) {
    const D = WYD.data.daily;
    const rec = state.daily;
    const date = state.trialRun.daily.date;
    if (!success) {
      WYD.ui.log("日替わりの試練 失敗…（今日のうちなら何度でも挑める）", "#ff6b6b");
      return;
    }
    // 連続日数：前に成功したのが昨日なら +1
    const y = new Date(date + "T00:00:00");
    y.setDate(y.getDate() - 1);
    const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    rec.streak = rec.lastDone === yesterday ? rec.streak + 1 : 1;
    rec.bestStreak = Math.max(rec.bestStreak, rec.streak);
    rec.lastDone = date;
    rec.total++;
    const n = state.trialRun.level;
    const streakMult = 1 + Math.min(D.streakBonusMax, D.streakBonus * (rec.streak - 1));
    const mats = Math.round((D.rewardMaterials + D.rewardMaterialsPerStage * n) * this.mult(state, "rewardMult") * streakMult);
    state.materials += mats;
    const lv = WYD.trial.itemLevel(state);
    if (D.rewardUnique) {
      const item = WYD.loot.createUnique(state, lv);
      w.drops.push({ x: guardian.x, y: guardian.y, item, age: 0 });
    }
    for (let i = 0; i < D.rewardGems; i++) {
      const key = WYD.gems.key(WYD.util.pick(WYD.data.gems.gems).id, WYD.gems.dropTier(state));
      WYD.gems.add(state, key);
    }
    WYD.ui.log(`日替わりの試練 成功！ 連続${rec.streak}日 ${WYD.data.crafting.materialName} +${mats}・ユニーク装備・宝石${D.rewardGems}個`, D.color);
    WYD.sound.play("achievement");
  },

  // 今日の条件の説明
  describe(date) {
    const day = this.forDate(date || this.today());
    return day.mods.map((m) => `${m.name}（${m.desc}）`).join("・") + `／守護者：${WYD.data.enemies[day.guardian].name}`;
  },
};
