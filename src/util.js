// 小さな便利関数。
window.WYD = window.WYD || {};

WYD.util = {
  rand(min, max) {
    return min + Math.random() * (max - min);
  },
  randInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  },
  pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  },
  // weight を持つ要素の中から重み付きで1つ選ぶ
  pickWeighted(list, getWeight) {
    const total = list.reduce((sum, x) => sum + getWeight(x), 0);
    let r = Math.random() * total;
    for (const x of list) {
      r -= getWeight(x);
      if (r <= 0) return x;
    }
    return list[list.length - 1];
  },
  dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  },
  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },
  // 決まった順番の乱数（飾りの配置を毎回同じにするため）
  seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  },
  formatStat(stat, value) {
    const info = WYD.data.items.stats[stat];
    const v = value.toFixed(info.decimals);
    const sign = value >= 0 ? "+" : "";
    return `${info.name} ${sign}${v}${info.percent ? "%" : ""}`;
  },
};
