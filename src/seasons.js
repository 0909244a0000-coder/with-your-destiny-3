// 季節のルール：選んでいる季節の倍率を返す
window.WYD = window.WYD || {};

WYD.season = {
  current(state) {
    const L = WYD.data.seasons.list;
    return L.find((x) => x.id === state.settings.season) || L[0];
  },

  // 倍率（書いていなければ 1）
  mult(state, key) {
    const v = this.current(state)[key];
    return v == null ? 1 : v;
  },

  effects(state) {
    return this.current(state).effects || {};
  },
};
