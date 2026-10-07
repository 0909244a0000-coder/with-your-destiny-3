// スマホ縦持ちの画面の数値（処理は src/mobile.js）。PCと横持ちには使わない。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};
WYD.data.mobile = {
  media: "(max-width: 700px) and (orientation: portrait)", // この条件のときだけスマホの画面にする
  // 戦場の大きさ。mult = 全体が入る大きさの何倍で描くか（大きいほど寄る）。主人公を中心に追う
  zooms: [
    { label: "全体", mult: 1 },
    { label: "中", mult: 1.8 },
    { label: "寄る", mult: 99 },   // 戦場の高さいっぱいまで（maxFillHeight で止まる）
  ],
  defaultZoom: 2,
  maxFillHeight: 1,      // 戦場の高さは画面の戦場部分の高さまで（それ以上は寄らない）
  follow: 0.15,          // カメラが主人公を追う速さ（1コマで差の何割を詰めるか）
  zoomKey: "wyd3-mobile-zoom", // ズームの段階を覚えておく場所（端末ごと。セーブとは別）
  tabs: [
    { id: "battle", label: "戦闘", glyph: "⚔" },
    { id: "bag", label: "かばん", icon: "assets/ui/nav-bag.webp" },
    { id: "status", label: "キャラ", icon: "assets/ui/nav-status.webp" },
    { id: "skills", label: "スキル", icon: "assets/ui/nav-skills.webp" },
    { id: "upgrade", label: "強化", icon: "assets/ui/nav-upgrade.webp" },
    { id: "more", label: "その他", glyph: "☰" },
  ],
  // 「その他」のやり込みの入口：[元のボタンのid, 絵, 名前]
  endgame: [
    ["bounty-open", "bounty", "賞金首"], ["merc-open", "merc", "傭兵"], ["lgem-open", "lgem", "伝説の宝石"],
    ["devotion-open", "devotion", "星座"], ["codex-open", "codex", "図鑑と記録"], ["arena-open", "arena", "アリーナ"],
  ],
  // 「閉じる」ボタンの id が「窓のid-close」でない窓
  closeButtons: { "rune-lab": "rune-close", "dps-test": "dps-close" },
};
