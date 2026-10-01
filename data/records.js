// 図鑑と記録と実績。
//   counters     … 数えておく記録（表示の名前）
//   achievements … 実績。check の種類：
//     counter（counters の名前）・level（レベル）・paragon（修練レベル）・maxDifficulty（最高危険度）
//     trialBest（試練の最高段階）・uniques（図鑑に載ったユニークの数）・setPieces（図鑑に載ったセット装備の数）
//     setComplete（全部の部位を図鑑に載せたセットの数）・cleared（クリアしたか：value は 1）
//     dailyStreak（日替わりの試練の最高連続日数）・dailyTotal（日替わりの試練の成功回数）
//   reward       … 達成したときにもらえる素材の数
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.records = {
  color: "#ffd36b",   // 実績の文字の色

  counters: [
    { id: "kills", name: "倒した敵" },
    { id: "eliteKills", name: "倒した精鋭" },
    { id: "bossKills", name: "倒したボス・守護者" },
    { id: "deaths", name: "倒れた回数" },
    { id: "legendsFound", name: "拾ったレジェンド" },
    { id: "uniquesFound", name: "拾ったユニーク" },
    { id: "setsFound", name: "拾ったセット装備" },
    { id: "playSeconds", name: "冒険した時間", time: true },
  ],

  achievements: [
    { id: "kill100", name: "初陣", desc: "敵を100体倒す", check: "counter", key: "kills", value: 100, reward: 10 },
    { id: "kill1000", name: "千人斬り", desc: "敵を1,000体倒す", check: "counter", key: "kills", value: 1000, reward: 30 },
    { id: "kill10000", name: "屍の山", desc: "敵を10,000体倒す", check: "counter", key: "kills", value: 10000, reward: 100 },
    { id: "elite50", name: "精鋭狩り", desc: "精鋭を50体倒す", check: "counter", key: "eliteKills", value: 50, reward: 30 },
    { id: "elite500", name: "精鋭の天敵", desc: "精鋭を500体倒す", check: "counter", key: "eliteKills", value: 500, reward: 100 },
    { id: "boss1", name: "王殺し", desc: "ボスを初めて倒す", check: "counter", key: "bossKills", value: 1, reward: 15 },
    { id: "boss25", name: "王たちの墓標", desc: "ボス・守護者を25体倒す", check: "counter", key: "bossKills", value: 25, reward: 60 },
    { id: "cleared", name: "運命の果て", desc: "3つのエリアのボスを倒してクリア", check: "cleared", value: 1, reward: 50 },
    { id: "lv25", name: "一人前", desc: "レベル25になる", check: "level", value: 25, reward: 20 },
    { id: "lv50", name: "極めし者", desc: "レベル50（上限）になる", check: "level", value: 50, reward: 60 },
    { id: "paragon10", name: "修練の道", desc: "修練レベル10になる", check: "paragon", value: 10, reward: 60 },
    { id: "diff5", name: "危険を好む", desc: "危険度5を解放する", check: "maxDifficulty", value: 5, reward: 30 },
    { id: "diff15", name: "死地に立つ", desc: "危険度15を解放する", check: "maxDifficulty", value: 15, reward: 100 },
    { id: "trial5", name: "試練に挑む者", desc: "試練の段階5に成功する", check: "trialBest", value: 5, reward: 40 },
    { id: "trial15", name: "果てなき者", desc: "試練の段階15に成功する", check: "trialBest", value: 15, reward: 120 },
    { id: "daily1", name: "今日の試練", desc: "日替わりの試練に成功する", check: "dailyTotal", value: 1, reward: 20 },
    { id: "daily7", name: "七日の誓い", desc: "日替わりの試練に7日連続で成功する", check: "dailyStreak", value: 7, reward: 150 },
    { id: "daily30", name: "不屈の巡礼", desc: "日替わりの試練に30日連続で成功する", check: "dailyStreak", value: 30, reward: 500 },
    { id: "unique3", name: "蒐集家", desc: "ユニーク装備を3種類見つける", check: "uniques", value: 3, reward: 30 },
    { id: "uniqueAll", name: "伝説の目録", desc: "ユニーク装備を全種類見つける", check: "uniques", value: "all", reward: 150 },
    { id: "set4", name: "そろえる楽しみ", desc: "セット装備を4種類見つける", check: "setPieces", value: 4, reward: 30 },
    { id: "setComplete", name: "完全なる一揃い", desc: "1つのセットの全部の部位を見つける", check: "setComplete", value: 1, reward: 80 },
  ],
};
