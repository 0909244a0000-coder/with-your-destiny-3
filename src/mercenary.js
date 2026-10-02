// 傭兵（数値は data/mercenary.js）。雇う・替える・位を上げる・戦場に出す。
// 戦い方は手下と同じ（src/allies.js）。source が "merc" の味方が傭兵。
window.WYD = window.WYD || {};

WYD.mercenary = {
  // 雇っている傭兵の定義（いなければ null）
  type(state) {
    const id = state.mercenary && state.mercenary.type;
    return WYD.data.mercenary.types.find((t) => t.id === id) || null;
  },

  // 雇っているあいだの加護（stats / effects）
  bonus(state) {
    const t = this.type(state);
    return t ? t.bonus : {};
  },

  canHire(state, id) {
    const M = WYD.data.mercenary;
    return state.player.level >= M.minLevel && state.mercenary.type !== id && state.materials >= M.hireCost;
  },

  // 雇う（替えると位は1にもどる）。できたら true
  hire(state, id) {
    if (!this.canHire(state, id) || !WYD.data.mercenary.types.some((t) => t.id === id)) return false;
    state.materials -= WYD.data.mercenary.hireCost;
    state.mercenary = { type: id, rank: 1 };
    this.dismissFromWorld();
    return true;
  },

  dismiss(state) {
    state.mercenary = { type: null, rank: 1 };
    this.dismissFromWorld();
  },

  // 今の戦場から傭兵を消す（すぐに新しい傭兵が出る）
  dismissFromWorld() {
    const w = WYD.currentWorld;
    if (!w) return;
    w.allies = w.allies.filter((a) => a.source !== "merc");
    w.mercTimer = 0;
  },

  rankCost(state) {
    const c = WYD.data.mercenary.rankCosts[state.mercenary.rank - 1];
    return c == null ? null : c;
  },

  rankUp(state) {
    const cost = this.rankCost(state);
    if (!this.type(state) || cost == null || state.materials < cost) return false;
    state.materials -= cost;
    state.mercenary.rank++;
    this.dismissFromWorld();   // 新しい強さで出し直す
    return true;
  },

  // 毎フレーム：いなければ（倒れていれば少し待って）出す
  update(w, state, stats, dt) {
    const t = this.type(state);
    if (!t || w.player.dead) return;
    if (w.allies.some((a) => a.source === "merc")) return;
    const M = WYD.data.mercenary;
    if (w.mercTimer == null) w.mercTimer = M.firstDelay;
    w.mercTimer -= dt;
    if (w.mercTimer > 0) return;
    w.mercTimer = M.reviveTime;   // 次に倒れたときの待ち時間
    const mult = 1 + M.rankMult * (state.mercenary.rank - 1);
    const s = Object.assign({}, t, {
      hpRatio: t.hpRatio * mult, spawnSpread: M.spawnSpread, firstAttackDelay: M.firstAttackDelay,
      duration: Infinity,
    });
    const a = WYD.allies.spawn(w, stats, s, t.attackRatio * mult, "merc");
    a.merc = true;
    a.name = t.name;
  },
};
