// 地図：落ちた地図を持っておき、使うと「条件つきの試練」に挑む（試練のしくみ src/trial.js を使う）
window.WYD = window.WYD || {};

WYD.maps = {
  // 新しい地図を作る（tier を省くと 1）
  create(tier, rarityId) {
    const M = WYD.data.maps;
    const r = rarityId ? M.rarities.find((x) => x.id === rarityId) : WYD.util.pickWeighted(M.rarities, (x) => x.weight);
    const n = WYD.util.randInt(r.mods[0], r.mods[1]);
    const pool = WYD.data.daily.mods.slice();
    const modIds = [];
    for (let i = 0; i < n && pool.length; i++) modIds.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
    return { tier: WYD.util.clamp(tier || 1, 1, M.maxTier), rarity: r.id, modIds };
  },

  mods(map) {
    return map.modIds.map((id) => WYD.data.daily.mods.find((m) => m.id === id)).filter(Boolean);
  },

  // 量の倍率（条件の rewardMult をかけあわせたもの）
  quantity(map) {
    return this.mods(map).reduce((a, m) => a * (m.rewardMult || 1), 1);
  },

  name(map) {
    return `地図 段階${map.tier}`;
  },

  color(map) {
    return WYD.data.maps.rarities.find((r) => r.id === map.rarity).color;
  },

  stage(map) {
    const M = WYD.data.maps;
    return M.stageOffset + map.tier * M.stagePerTier;
  },

  // 拾う（持てる数をこえたら捨てる）
  add(state, map) {
    if (state.maps.length >= WYD.data.maps.maxHeld) {
      WYD.ui.log("地図がいっぱいで拾えない", "#ff6b6b");
      return false;
    }
    state.maps.push(map);
    WYD.ui.log(`${this.name(map)}（${WYD.data.maps.rarities.find((r) => r.id === map.rarity).name}）を手に入れた`, this.color(map));
    WYD.ui.markDirty();
    return true;
  },

  // ふつうの冒険で敵を倒したとき（クリア後だけ）
  onKill(w, state, e) {
    const D = WYD.data.maps.drop;
    if (!state.cleared || WYD.trial.active(state)) return;
    const chance = e.boss ? D.chanceBoss : e.elite ? D.chanceElite : D.chanceNormal;
    if (Math.random() >= chance) return;
    this.add(state, this.create(1 + Math.floor((state.difficulty - 1) / D.tierPerDifficulty)));
  },

  // 地図を使う
  use(w, state, index) {
    const map = state.maps[index];
    if (!map || WYD.trial.active(state)) return;
    state.maps.splice(index, 1);
    WYD.trial.start(w, state, this.stage(map), null, map);
  },

  // 素材で「レア」にする（条件を3〜4つにつけ直す）
  upgrade(state, index) {
    const map = state.maps[index];
    const cost = WYD.data.maps.upgradeCostPerTier * map.tier;
    if (!map || state.materials < cost) return false;
    state.materials -= cost;
    state.maps[index] = this.create(map.tier, "rare");
    return true;
  },

  // 終わったとき（src/trial.js の finish から）
  finish(w, state, success, guardian) {
    const M = WYD.data.maps;
    const map = state.trialRun.map;
    if (!success) {
      WYD.ui.log(`${this.name(map)} 失敗…（地図はなくなった）`, "#ff6b6b");
      return;
    }
    const q = this.quantity(map);
    const lv = WYD.trial.itemLevel(state);
    const items = Math.round(M.rewardItems * q);
    for (let i = 0; i < items; i++) {
      const item = WYD.loot.create(state, lv, WYD.data.trial.rarityBonus * q);
      const sp = WYD.data.trial.dropSpread;
      w.drops.push({ x: guardian.x + WYD.util.rand(-sp, sp), y: guardian.y + WYD.util.rand(-sp, sp), item, age: 0 });
    }
    const mats = Math.round((M.rewardMaterials + M.rewardMaterialsPerTier * map.tier) * q);
    state.materials += mats;
    for (let i = 0; i < M.rewardGems; i++) WYD.gems.add(state, WYD.gems.key(WYD.util.pick(WYD.data.gems.gems).id, WYD.gems.dropTier(state)));
    // 次の地図
    const D = M.drop;
    const count = D.guardianDrops + (Math.random() < D.guardianExtraChance ? 1 : 0);
    for (let i = 0; i < count; i++) this.add(state, this.create(map.tier + (Math.random() < D.tierUpChance ? 1 : 0)));
    state.mapBest = Math.max(state.mapBest || 0, map.tier);
    WYD.ui.log(`${this.name(map)} 成功！ 装備${items}個・${WYD.data.crafting.materialName} +${mats}（量 ×${q.toFixed(2)}）`, M.color);
    WYD.sound.play("uniqueDrop");
  },
};
