// 放置中の進行：遊んでいるときの「1秒あたりの稼ぎ」を測っておき、離れていた時間ぶんを渡す。
window.WYD = window.WYD || {};

WYD.offline = {
  tally: { exp: 0, mats: 0, gems: 0, time: 0 },
  granting: false,   // 放置ぶんを渡している最中は、稼ぎとして数えない

  // 稼いだときに呼ぶ（kind = "exp"・"mats"・"gems"）
  record(kind, amount) {
    if (!this.granting) this.tally[kind] += amount;
  },

  // ゲームが1コマ進むたびに呼ぶ。一定時間ごとに稼ぎの速さを更新する
  tick(state, dt) {
    const O = WYD.data.offline;
    const t = this.tally;
    t.time += dt;
    if (t.time < O.sampleSeconds) return;
    const now = { exp: t.exp / t.time, mats: t.mats / t.time, gems: t.gems / t.time };
    const r = state.offlineRates;
    const mix = (k) => (r[k] || 0) + (now[k] - (r[k] || 0)) * O.smoothing;
    state.offlineRates = r ? { exp: mix("exp"), mats: mix("mats"), gems: mix("gems") } : now;
    this.tally = { exp: 0, mats: 0, gems: 0, time: 0 };
  },

  // since（ミリ秒の時刻）から今までの放置ぶんを渡す
  apply(state, world, since) {
    const O = WYD.data.offline;
    const r = state.offlineRates;
    if (!since || !r) return;
    const secs = Math.min((Date.now() - since) / 1000, O.maxHours * 3600);
    if (secs < O.minMinutes * 60) return;
    const exp = Math.floor(r.exp * secs * O.efficiency);
    const mats = Math.floor(r.mats * secs * O.efficiency);
    const gems = Math.min(O.maxGems, Math.floor((r.gems || 0) * secs * O.efficiency));
    if (exp <= 0 && mats <= 0 && gems <= 0) return;
    const before = state.player.level;
    this.granting = true;
    WYD.world.gainExp(state, exp);
    this.granting = false;
    state.materials += mats;
    const gemNames = {};
    for (let i = 0; i < gems; i++) {
      const key = WYD.gems.key(WYD.util.pick(WYD.data.gems.gems).id, WYD.gems.dropTier(state));
      WYD.gems.add(state, key);
      gemNames[key] = (gemNames[key] || 0) + 1;
    }
    const lv = state.player.level - before;
    const C = WYD.data.crafting;
    WYD.ui.showWelcome(
      `${this.formatTime(secs)}のあいだ、戦いは続いていました。`,
      [`経験値 +${exp}${lv > 0 ? `（レベル +${lv}）` : ""}`, `${C.materialName} +${mats}`]
        .concat(gems > 0 ? [`宝石 +${gems}（${Object.keys(gemNames).map((k) => `${WYD.gems.name(k)}×${gemNames[k]}`).join("、")}）`] : [])
    );
    WYD.ui.changed();
  },

  formatTime(secs) {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}時間${m}分` : `${m}分`;
  },
};
