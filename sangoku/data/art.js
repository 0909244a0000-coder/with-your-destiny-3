// 天下三分：絵の場所と、絵の使い分け（絵がないときは図形と文字で表示する）
var SG = typeof SG !== 'undefined' ? SG : {};
SG.data = SG.data || {};
SG.data.art = {
  // 地図の城：人口で大・中・小。持ち主のいない都市は廃城
  castle: { l: 'assets/map/castle_l.webp', m: 'assets/map/castle_m.webp', s: 'assets/map/castle_s.webp', ruin: 'assets/map/ruin.webp' },
  castleTier: { l: 400000, m: 200000 },
  castleSize: 34,             // 地図での城の大きさ（地図の座標 1024 のうち）
  flag: 'assets/map/flag.webp',       // 白い旗。勢力の色を重ねる
  capital: 'assets/map/capital.webp', // 君主のいる都市
  // アイコン：<dir><id>.webp。id は命令（src/ui.js の data-cmd）・数値・出来事の名前
  cmd: 'assets/cmd/', stat: 'assets/stat/', event: 'assets/event/', map: 'assets/map/',
  // 記録・戦の報告の行につける絵（上から順に、最初に当てはまったもの）
  logIcons: [
    [/一騎打ち|合目|勝負つかず|の勝ち！/, 'event/duel'], [/火計/, 'event/fire'], [/滅亡/, 'event/destroyed'],
    [/落城|攻め落とした|のものとなった|奪われた/, 'event/fall'], [/撃退|守りきった|落とせなかった|兵を引いた/, 'event/hold'],
    [/捕らえ|捕虜/, 'event/capture'], [/壊滅|総崩れ|退いた|逃れた|落ち延び/, 'event/rout'], [/占領/, 'map/flag'],
    [/世を去った|処断/, 'event/death'], [/元服/, 'event/comeofage'], [/疫病/, 'event/plague'], [/洪水/, 'event/flood'], [/蝗害/, 'event/locust'],
    [/仕官|寝返った|降った/, 'cmd/employ'], [/君主となった/, 'map/capital'], [/出奔/, 'event/rout'], [/兵糧が尽き/, 'stat/food'],
  ],
};
