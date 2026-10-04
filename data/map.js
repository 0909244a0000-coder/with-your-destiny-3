// マップの設定（全エリア共通）。エリアごとの設定は data/areas.js。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.map = {
  notice: { duration: 3, fade: 0.6, max: 3, font: "bold 20px serif", lineHeight: 30, top: 110 },   // 画面の真ん中に出す大事な知らせ
  width: 960,
  height: 600,
  maxEnemies: 6,        // 同時に出る敵の最大数
  spawnInterval: 1.2,   // 敵が出てくる間隔（秒）
  spawnMinDistance: 220,// プレイヤーからこれ以上離れた場所に出る
  projectileLifetime: 3,// 弾が消えるまでの秒数
  spriteScale: 4,       // 絵の大きさ（体の大きさ×これ の正方形で描く）
  spriteShadow: 0.45,   // 絵の足元の影の濃さ（0〜1）
  // キャラの絵のふちをうっすら光らせる色（暗い地面でも敵・主人公が見分けやすいように）。blur = 光のぼかしの大きさ
  // blur = ぼかしの大きさ（絵の幅に対する割合）。光らせた絵は最初に1回だけ作って使い回す（毎回ぼかすと重いので）
  rim: { enemy: "rgba(255,70,50,0.6)", elite: "rgba(90,160,255,0.85)", boss: "rgba(255,40,40,0.85)", player: "rgba(255,220,140,0.65)", blur: 0.05 },
  // 精鋭などの名前：重なったら上にずらし、うすい黒の板の上に書く
  unitLabel: { font: 12, minShownPx: 11, pad: 3, back: "rgba(0,0,0,0.78)", maxShift: 5 },
  groundDim: 0.35,      // 地面の絵を暗くする強さ（0〜1）。キャラを目立たせるため
  // 明かり：主人公のまわりだけ明るく、離れるほど暗くする（ディアブロの「たいまつの明かり」）
  light: {
    inner: 170,         // この距離までは暗くならない
    outer: 520,         // この距離で一番暗くなる
    darkness: 0.72,     // 一番暗いところの暗さ（0〜1）
    darknessPerFloor: 0.05, // 1階深くなるごとに足す暗さ（ボスの間がいちばん暗い）
    maxDarkness: 0.9,
    unitDarkness: 0.25,  // キャラ（敵・主人公・仲間）にかかる暗さの割合（0〜1）。地面だけ暗く、キャラは見やすく
  },
  // 画面の左下に、使っているスキルを並べる（暗い影＝次に使えるまでの時間、光る枠＝今使った）
  // minShownPx：スマホで画面が縮んでも、1つの四角がこの大きさ（画面上のピクセル）より小さくならないように大きく描く
  skillBar: { size: 38, minShownPx: 26, gap: 6, x: 12, bottom: 12, flash: 0.35, shade: "rgba(0,0,0,0.65)", border: "rgba(232,216,168,0.7)", flashColor: "#fff3b0", back: "rgba(20,16,12,0.8)" },
  // 左上のエリア名と危険度の文字（スマホでも読める大きさに）。画面がこの割合より縮んで見えるときは、右上のボタンと重ならないよう右下に出す
  hud: { font: 16, minShownPx: 11, compactBelow: 0.6, margin: 12 },
  playerBar: { width: 48, height: 6, gap: 6, color: "#3fd06a", lowColor: "#ffb03a", lowAt: 0.3 },   // 主人公の頭の上のHPの棒（スマホでもHPが見えるように）
  // 落ちている装備の名前（重なったら上にずらす。maxShift 段まで）
  dropLabel: { font: 12, minShownPx: 11, pad: 3, back: "rgba(0,0,0,0.78)", maxShift: 6 },
  playerRing: 0.8,      // 主人公の足元の輪の濃さ（0〜1）。主人公がどこにいるか分かるように
  decorationCount: 40,  // 飾り（草・石）の数
  decorationSeed: 7,
};
