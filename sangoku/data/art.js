// 天下三分：絵の場所と、絵の使い分け（絵がないときは図形と文字で表示する）
var SG = typeof SG !== 'undefined' ? SG : {};
SG.data = SG.data || {};
SG.data.art = {
  // 地図の城：人口で大・中・小。持ち主のいない都市は廃城
  castle: { l: 'assets/map/castle_l.webp', m: 'assets/map/castle_m.webp', s: 'assets/map/castle_s.webp', ruin: 'assets/map/ruin.webp' },
  castleTier: { l: 400000, m: 200000 },
  // 地図の拡大：倍率の範囲、始めの倍率、ホイール1回の倍率。iconGrow は拡大したとき城と地名がどれだけ大きくなるか（0＝画面で同じ大きさ、1＝地図と一緒に大きくなる）
  view: { minZoom: 1, maxZoom: 4, startZoom: 1.8, wheelStep: 1.15, iconGrow: 0.3 },
  minimapDot: 30,             // ミニマップの都市の点の大きさ（地図の座標）
  castleSize: 34,             // 地図での城の大きさ（地図の座標 1024 のうち）
  flag: 'assets/map/flag.webp',       // 白い旗。勢力の色を重ねる
  capital: 'assets/map/capital.webp', // 君主のいる都市
  // アイコン：<dir><id>.webp。id は命令（src/ui.js の data-cmd）・数値・出来事の名前
  cmd: 'assets/cmd/', stat: 'assets/stat/', event: 'assets/event/', map: 'assets/map/',
  // 武将の顔：assets/face/<武将名>.webp。faces にある武将だけ顔がある。mob は顔のない武将の型の絵（届いたら true）
  face: 'assets/face/',
  faces: '曹操 劉備 孫策 袁紹 呂布 関羽 張飛 趙雲 諸葛亮 周瑜 孫権 司馬懿 袁術 劉表 劉璋 馬騰 夏侯惇 夏侯淵 曹仁 典韋 許褚 張遼 荀彧 郭嘉 賈詡 陳宮 黄忠 馬超 龐統 魏延 甘寧 太史慈 呂蒙 陸遜 魯粛 程普 黄蓋 韓当 周泰 張昭 顔良 文醜 張郃 田豊 沮授 公孫瓚 徐晃 龐徳 徐庶 姜維 法正 張任 厳顔 李厳 黄権 張魯 韓遂 李傕 郭汜 張済 張繍 孔融 士燮 孟獲 曹洪 曹純 荀攸 程昱 楽進 李典 于禁 満寵 曹丕 簡雍 糜竺 糜芳 孫乾 陳登 高順 臧覇 高覧 審配 逢紀 郭図 許攸 袁譚 袁尚 淳于瓊 麴義 田楷 関靖 公孫続 公孫度 公孫康 紀霊 張勲 橋蕤 閻象 楊弘 雷薄 朱治 呂範 張紘 凌統 蒋欽 諸葛瑾 劉繇 笮融 薛礼 張英 厳白虎 厳輿 王朗 虞翻 蔡瑁 蒯越 蒯良 黄祖 文聘 韓玄 張允 劉琦 王威 伊籍 馬良 馬謖 馬岱 成公英'.split(' '),
  mobFaces: false,
  // マス戦闘の絵：地形は assets/battle/<地形>.webp（六角形・透明背景）、駒は unit_<型>.webp
  battle: 'assets/battle/',
  battleTiles: ['plain', 'forest', 'mountain', 'river', 'bridge', 'town', 'keep', 'gate', 'broken', 'wall'],
  flipTiles: ['plain', 'forest', 'mountain'], // 左右をときどき反転して、同じ絵の並びを目立たなくする
  // 記録・戦の報告の行につける絵（上から順に、最初に当てはまったもの）
  logIcons: [
    [/一騎打ち|合目|勝負つかず|の勝ち！/, 'event/duel'], [/火計/, 'event/fire'], [/滅亡/, 'event/destroyed'],
    [/落城|攻め落とした|のものとなった|奪われた/, 'event/fall'], [/撃退|守りきった|落とせなかった|兵を引いた/, 'event/hold'],
    [/捕らえ|捕虜/, 'event/capture'], [/壊滅|総崩れ|退いた|逃れた|落ち延び/, 'event/rout'], [/占領/, 'map/flag'],
    [/世を去った|処断/, 'event/death'], [/元服/, 'event/comeofage'], [/疫病/, 'event/plague'], [/洪水/, 'event/flood'], [/蝗害/, 'event/locust'],
    [/仕官|寝返った|降った/, 'cmd/employ'], [/君主となった/, 'map/capital'], [/出奔/, 'event/rout'], [/兵糧が尽き/, 'stat/food'],
  ],
};
