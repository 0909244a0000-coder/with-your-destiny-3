// 終わりのない試練：制限時間の中で決まった数を倒すと守護者が出る。倒せば成功で、次の段階へ。
// 試練の最中かどうかはセーブしない（読み直すと、ふつうの冒険にもどる）
window.WYD = window.WYD || {};

WYD.trial = {
  active(state) {
    return !!state.trialRun;
  },

  unlocked(state) {
    return !!state.cleared;
  },

  // 試練のときの「エリア」の設定
  area(state) {
    const T = WYD.data.trial;
    const n = state.trialRun.level;
    return {
      id: "trial", name: "終わりのない試練",
      bgColor: T.bgColor, grassColor: T.grassColor, stoneColor: T.stoneColor, groundImage: T.groundImage,
      powerMult: T.powerBase * Math.pow(T.powerGrowth, n - 1),
      itemLevelBonus: 0, enemies: T.enemies, floors: 1, killsPerFloor: T.kills, boss: state.trialRun.guardian,
    };
  },

  itemLevel(state) {
    const T = WYD.data.trial;
    return T.itemLevelBase + T.itemLevelPerStage * (state.trialRun.level - 1);
  },

  start(w, state, level) {
    const T = WYD.data.trial;
    state.trialRun = { level, guardian: WYD.util.pick(T.guardians) };
    w.trial = { timeLeft: T.timeLimit, kills: 0, guardianOut: false, done: false };
    WYD.world.resetEnemies(w, state, false);
    w.drops = [];
    w.banner = { text: `終わりのない試練　段階 ${level}`, time: 0 };
    WYD.ui.log(`試練 段階${level} に挑む（${T.timeLimit}秒で${T.kills}体倒し、守護者を討て）`, T.color);
    WYD.ui.changed();
  },

  // 試練をやめる・終わる（ふつうの冒険にもどる）
  stop(w, state) {
    state.trialRun = null;
    w.trial = null;
    WYD.world.resetEnemies(w, state, false);
    w.banner = { text: `${WYD.world.area(state).name}　${WYD.world.floorName(state)}`, time: 0 };
    WYD.ui.changed();
  },

  updateSpawns(w, state, dt) {
    const T = WYD.data.trial;
    const t = w.trial;
    if (!t || t.done) return;
    if (t.kills >= T.kills && !t.guardianOut) {
      t.guardianOut = true;
      const kind = state.trialRun.guardian;
      const g = WYD.world.spawnEnemy(w, state, kind, WYD.world.farPosition(w));
      g.boss = true;
      g.slamTimer = WYD.data.enemies[kind].slam.interval;
      WYD.ui.log(`守護者「${WYD.data.enemies[kind].name}」が現れた！`, T.color);
      WYD.sound.play("bossAppear");
    }
    w.spawnTimer -= dt;
    if (w.spawnTimer > 0 || w.enemies.length >= T.maxEnemies) return;
    w.spawnTimer = T.spawnInterval;
    const pick = WYD.util.pickWeighted(T.enemies, (x) => x.weight);
    const e = WYD.world.spawnEnemy(w, state, pick.kind, WYD.world.farPosition(w));
    if (Math.random() < WYD.data.elites.chance) WYD.world.makeElite(e);
  },

  tick(w, state, dt) {
    const t = w.trial;
    if (!t) return;
    if (t.done) {
      t.nextIn -= dt;
      if (t.nextIn > 0) return;
      if (state.trial.autoNext) this.start(w, state, state.trial.level);
      else this.stop(w, state);
      return;
    }
    t.timeLeft -= dt;
    if (t.timeLeft <= 0) this.finish(w, state, false);
  },

  onKill(w, state, e) {
    const t = w.trial;
    if (!t || t.done) return;
    if (e.boss) this.finish(w, state, true, e);
    else t.kills = Math.min(WYD.data.trial.kills, t.kills + 1);
  },

  onDeath(w, state) {
    if (w.trial && !w.trial.done) w.trial.timeLeft -= WYD.data.trial.deathPenalty;
  },

  finish(w, state, success, guardian) {
    const T = WYD.data.trial;
    const t = w.trial;
    t.done = true;
    const n = state.trialRun.level;
    const rec = state.trial;
    rec.runs++;
    if (success) {
      const used = T.timeLimit - t.timeLeft;
      const first = n > rec.best;
      rec.best = Math.max(rec.best, n);
      // ごほうび：装備と素材
      const lv = this.itemLevel(state);
      for (let i = 0; i < T.rewardItems; i++) {
        const item = WYD.loot.create(state, lv, T.rarityBonus * (1 + n * T.rewardRarityPerStage));
        w.drops.push({ x: guardian.x + WYD.util.rand(-T.dropSpread, T.dropSpread), y: guardian.y + WYD.util.rand(-T.dropSpread, T.dropSpread), item, age: 0 });
      }
      const mats = T.rewardMaterials[0] + T.rewardMaterials[1] * n;
      state.materials += mats;
      WYD.ui.log(`試練 段階${n} 成功！（${Math.round(used)}秒）${first ? "自己ベスト更新！" : ""} ${WYD.data.crafting.materialName} +${mats}`, T.color);
      WYD.sound.play("uniqueDrop");
      if (rec.autoNext) rec.level = n + 1;
      else rec.level = Math.min(rec.best + 1, rec.level);
    } else {
      WYD.ui.log(`試練 段階${n} 失敗…（時間切れ）`, "#ff6b6b");
      if (rec.autoNext && n > 1) rec.level = n - 1;
    }
    // すこし待ってから、次の段階へ（自動）か、ふつうの冒険へもどる（tick で数える）
    t.nextIn = T.nextDelay;
    WYD.ui.changed();
  },

  // 画面の上：残り時間と、守護者までの数
  draw(ctx, w, state) {
    const t = w.trial;
    if (!t) return;
    const T = WYD.data.trial;
    const map = WYD.data.map;
    const bw = map.width * 0.4, x = (map.width - bw) / 2, y = map.height - 34;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - 2, y - 2, bw + 4, 14);
    ctx.fillStyle = T.color;
    ctx.fillRect(x, y, bw * Math.max(0, t.timeLeft / T.timeLimit), 10);
    ctx.textAlign = "center";
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#fff";
    const m = Math.max(0, Math.ceil(t.timeLeft));
    const goal = t.guardianOut ? "守護者を倒せ！" : `守護者まで ${t.kills}/${T.kills}体`;
    ctx.fillText(`試練 段階${state.trialRun.level}　残り ${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}　${goal}`, map.width / 2, y - 6);
  },
};
