// 星座：信仰ポイントで星座を埋め、能力・特殊効果・固有能力を得る
window.WYD = window.WYD || {};

WYD.devotion = {
  // 今までの記録からたまった信仰ポイント（全部）
  totalPoints(state) {
    const P = WYD.data.devotion.points;
    // 倒したことのあるボスの数 = 行けるエリアの数 - 1（最後のボスはクリアしていれば +1）
    const bosses = state.unlockedAreas.length - 1 + (state.cleared ? 1 : 0);
    return Math.floor(state.player.level / P.perLevels) + bosses * P.perBoss +
      Math.floor(state.trial.best / P.perTrialStages) + (state.mapBest || 0) * P.perMapTier;
  },

  owned(state) {
    return WYD.data.devotion.list.filter((c) => state.devotion[c.id]);
  },

  spent(state) {
    return this.owned(state).reduce((a, c) => a + c.cost, 0);
  },

  free(state) {
    return this.totalPoints(state) - this.spent(state);
  },

  // 今の縁（埋めた星座からもらえるぶんの合計。except にある星座のぶんは数えない）
  affinity(state, ...except) {
    const out = {};
    for (const k in WYD.data.devotion.affinities) out[k] = 0;
    for (const c of this.owned(state)) if (!except.includes(c)) for (const k in c.grants) out[k] += c.grants[k];
    return out;
  },

  canTake(state, c) {
    if (state.devotion[c.id] || this.free(state) < c.cost) return false;
    const af = this.affinity(state);
    return Object.keys(c.requires).every((k) => af[k] >= c.requires[k]);
  },

  // 外せるか（ほかの星座の必要な縁が足りなくならないか）
  canRemove(state, c) {
    if (!state.devotion[c.id]) return false;
    // 残る星座それぞれについて、自分と外す星座のぶんをのぞいた縁で足りるか
    return this.owned(state).every((o) => {
      if (o === c) return true;
      const af = this.affinity(state, c, o);
      return Object.keys(o.requires).every((k) => af[k] >= o.requires[k]);
    });
  },

  take(state, id) {
    const c = WYD.data.devotion.list.find((x) => x.id === id);
    if (!c || !this.canTake(state, c)) return false;
    state.devotion[id] = true;
    return true;
  },

  remove(state, id) {
    const c = WYD.data.devotion.list.find((x) => x.id === id);
    if (!c || !this.canRemove(state, c)) return false;
    delete state.devotion[id];
    return true;
  },
};
