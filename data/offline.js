// 放置中の進行の数値。ブラウザを閉じていた間（タブを裏にしていた間も）、少しだけ進む。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.offline = {
  minMinutes: 1,       // これより短い時間はなにもしない
  maxHours: 8,         // これより長く離れていても、ここまでしか数えない
  efficiency: 0.5,     // 遊んでいるときの何割ぶん進むか（0〜1）
  sampleSeconds: 30,   // 遊んでいるときの稼ぎを、何秒ごとに測るか
  maxGems: 20,         // 放置で一度にもらえる宝石の数の上限
  smoothing: 0.25,     // 新しく測った稼ぎをどれだけ混ぜるか（0〜1。大きいほど最近の稼ぎに近づく）
};
