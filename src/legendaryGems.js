// 伝説の宝石（数値は data/legendaryGems.js）。手に入れる・身につける・ランク上げ・効果。
// セーブは state.lgems = { owned: { id: ランク }, equipped: [id, ...] }
window.WYD = window.WYD || {};

WYD.lgems = {
  def(id) {
    return WYD.data.legendaryGems.list.find((g) => g.id === id) || null;
  },

  // 身につけている宝石の効果の値（つけていなければ 0）
  value(state, type) {
    const L = state.lgems;
    for (const id of L.equipped) {
      const g = this.def(id);
      if (g && g.type === type) return g.base + g.perRank * ((L.owned[id] || 1) - 1);
    }
    return 0;
  },

  // その宝石の定義（身につけていなければ null）
  equippedDef(state, type) {
    for (const id of state.lgems.equipped) {
      const g = this.def(id);
      if (g && g.type === type) return g;
    }
    return null;
  },

  descFor(g, rank) {
    const v = Math.round((g.base + g.perRank * (rank - 1)) * 100) / 100;
    return g.desc.replace(/\{(\w+)\}/g, (m, k) => (k === "v" ? v : g[k]));
  },

  toggle(state, id) {
    const L = state.lgems;
    if (!L.owned[id]) return false;
    const i = L.equipped.indexOf(id);
    if (i >= 0) { L.equipped.splice(i, 1); return true; }
    if (L.equipped.length >= WYD.data.legendaryGems.slots) return false;
    L.equipped.push(id);
    return true;
  },

  upgradeChance(stage, rank) {
    const C = WYD.data.legendaryGems.upgradeChance;
    return WYD.util.clamp(C.base + C.step * (stage - rank), C.min, 1);
  },

  // 試練に成功したとき（src/trial.js）：宝石が手に入ることがあり、つけている宝石のランクを上げる
  onTrialSuccess(state, stage) {
    const D = WYD.data.legendaryGems;
    const L = state.lgems;
    const missing = D.list.filter((g) => !L.owned[g.id]);
    const first = !Object.keys(L.owned).length && D.firstDropGuaranteed;
    if (missing.length && (first || Math.random() < D.dropChance)) {
      const g = WYD.util.pick(missing);
      L.owned[g.id] = 1;
      if (L.equipped.length < D.slots) L.equipped.push(g.id);
      WYD.ui.notice(`伝説の宝石「${g.name}」を手に入れた！`, D.color);
      WYD.sound.play("uniqueDrop");
    }
    // ランク上げ：つけている宝石（なければ持っている宝石）のうち、ランクの低いものから
    const pool = L.equipped.length ? L.equipped : Object.keys(L.owned);
    let ups = 0, fails = 0;
    for (let i = 0; i < D.upgradeTries; i++) {
      const cand = pool.filter((id) => L.owned[id] < D.maxRank).sort((a, b) => L.owned[a] - L.owned[b]);
      if (!cand.length) break;
      const id = cand[0];
      if (Math.random() < this.upgradeChance(stage, L.owned[id])) { L.owned[id]++; ups++; } else fails++;
    }
    if (ups || fails) WYD.ui.log(`伝説の宝石のランク上げ：成功${ups}回・失敗${fails}回`, D.color);
  },

  // ---- 効果 ----
  // 敵に与えるダメージの倍率（src/world.js の playerHit）
  damageMult(w, state, e) {
    let pct = 0;
    if (e.stunTimer > 0) pct += this.value(state, "trapped");
    if (w.player.powerfulTimer > 0) pct += this.value(state, "powerful");
    const zei = this.equippedDef(state, "zei");
    if (zei) pct += this.value(state, "zei") * WYD.util.dist(w.player, e) / zei.per;
    return 1 + pct / 100;
  },

  // 攻撃を当てたとき：迅速の宝石の重なり
  onHit(w, state) {
    const g = this.equippedDef(state, "gogok");
    if (!g) return;
    const p = w.player;
    p.gogok = { stacks: Math.min(g.maxStacks, ((p.gogok && p.gogok.stacks) || 0) + 1), timeLeft: g.duration };
  },

  // 攻撃速度の倍率（迅速の宝石）
  attackSpeedMult(w, state) {
    const p = w.player;
    return p.gogok ? 1 + p.gogok.stacks * this.value(state, "gogok") / 100 : 1;
  },

  // 敵が倒れたとき：強者の災い
  onKill(w, state, e) {
    const g = this.equippedDef(state, "powerful");
    if (g && (e.elite || e.boss)) w.player.powerfulTimer = g.duration;
  },

  update(w, dt) {
    const p = w.player;
    if (p.powerfulTimer > 0) p.powerfulTimer -= dt;
    if (p.gogok) {
      p.gogok.timeLeft -= dt;
      if (p.gogok.timeLeft <= 0) p.gogok = null;
    }
  },
};
