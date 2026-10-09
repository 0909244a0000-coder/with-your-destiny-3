// 奈落の双王：鍵を集めて、強くなったボス2体に同時に挑む（試練のしくみ src/trial.js を使う）
window.WYD = window.WYD || {};

WYD.uber = {
  canStart(state) {
    return state.uber.keys >= WYD.data.uber.keysNeeded && !WYD.trial.active(state);
  },

  // 挑める最高の段階（試練の最高記録＋stageOffset。最低でも minStage）
  maxStage(state) {
    const U = WYD.data.uber;
    return Math.max(U.minStage, state.trial.best + U.stageOffset);
  },

  // 挑む段階：選んだ段階（minStage〜最高）。選んでいなければ最高
  stage(state) {
    const max = this.maxStage(state), picked = state.uber.stage;
    return Number.isFinite(picked) ? Math.max(WYD.data.uber.minStage, Math.min(max, picked)) : max;
  },

  // 段階を1つ上げ下げする。最高まで上げたら「最高に合わせる」に戻す（試練の記録が伸びたら一緒に上がる）
  changeStage(state, delta) {
    const next = Math.max(WYD.data.uber.minStage, Math.min(this.maxStage(state), this.stage(state) + delta));
    state.uber.stage = next >= this.maxStage(state) ? null : next;
  },

  start(w, state) {
    if (!this.canStart(state)) return;
    state.uber.keys -= WYD.data.uber.keysNeeded;
    WYD.trial.start(w, state, this.stage(state), null, null, true);
  },

  // 鍵が落ちるか（ボス・守護者を倒したとき）
  onKill(w, state, e) {
    if (!e.boss || e.clone) return;
    const U = WYD.data.uber;
    const run = state.trialRun;
    if (run && run.uber) return;
    const chance = run ? U.drop.trialGuardianChance : state.difficulty >= U.drop.bossMinDifficulty ? U.drop.bossChance : 0;
    if (Math.random() >= chance) return;
    state.uber.keys++;
    WYD.world.addText(w, e.x, e.y - 60, U.keyName, U.color);
    WYD.ui.notice(`${U.keyName}を手に入れた（${state.uber.keys}/${U.keysNeeded}）`, U.color);
    WYD.sound.play("uniqueDrop");
    WYD.ui.markDirty();
  },

  // 勝ったとき（src/trial.js の finish から）
  finish(w, state, success, last) {
    const U = WYD.data.uber;
    if (!success) {
      WYD.ui.log(`${U.name}に敗れた…（鍵はなくなった）`, "#ff6b6b");
      return;
    }
    const lv = WYD.trial.itemLevel(state);
    const uberDefs = WYD.data.uniques.list.filter((u) => u.uberOnly);
    for (let i = 0; i < U.rewardUniques; i++) {
      const def = i === 0 && Math.random() < U.uberUniqueChance ? WYD.util.pick(uberDefs) : null;
      const item = WYD.loot.createUnique(state, lv, def);
      const sp = WYD.data.trial.dropSpread;
      w.drops.push({ x: last.x + WYD.util.rand(-sp, sp), y: last.y + WYD.util.rand(-sp, sp), item, age: 0 });
    }
    state.materials += U.rewardMaterials;
    for (let i = 0; i < U.rewardGems; i++) WYD.gems.gain(state, WYD.gems.key(WYD.util.pick(WYD.data.gems.gems).id, Math.min(WYD.data.gems.tiers.length - 1, WYD.gems.dropTier(state) + 1)));
    state.uber.kills++;
    WYD.runeSkills.onUberWin(w, state);
    WYD.ui.notice(`${U.name}を討った！ ユニーク${U.rewardUniques}個・${WYD.data.crafting.materialName} +${U.rewardMaterials}・宝石${U.rewardGems}個`, U.color);
    WYD.sound.play("achievement");
  },
};
