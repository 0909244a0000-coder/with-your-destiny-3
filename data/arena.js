// アリーナ専用の攻防補正。本編や保存されたビルドの性能には適用しない。
window.WYD = window.WYD || {};
WYD.data.arena = {
  width: 960, height: 600, startRadius: 220, timeLimit: 180, step: 0.05,
  speeds: [1, 2, 4], refreshMs: 250, loadTimeoutMs: 30000,
  background: "assets/areas/scenes/cathedral.webp",
  colors: ["#f2ba67", "#8bc7ff", "#bf96ff", "#9be39c", "#ff949b", "#80e5de", "#f5a2e3", "#e6e27a"],
  visual: { particlesPerTeam: 90, effectsPerTeam: 80, labelPx: 12, barWidth: 50, barHeight: 5, labelGap: 28, fieldAlpha: 0.6, backgroundDim: 0.3 },
  modes: { duel: { name: "1対1", min: 2, max: 2 }, royale: { name: "バトルロワイヤル", min: 2, max: 8 }, teams: { name: "3対3", min: 6, max: 6, teamSize: 3 } },
  formations: { slots: 6, nameLength: 32 },
  // 高速シミュレーター（src/arena-sim.js）：描画せずに同じ組み合わせを指定回数戦わせ、結果だけ集計する。
  //   counts … 選べる回数　stepsPerSlice … 画面を止めないよう、この刻み数ごとに一息つく　refreshMs … 途中経過の表示間隔
  sim: { counts: [10, 30, 100, 300, 1000], defaultCount: 30, stepsPerSlice: 800, refreshMs: 300 },
  // 傭兵は出さない（加護もなし）。装備・スキル由来の召喚はそのまま出る。
  mercenary: false,
  // 職業ごとの召喚の対人補正（傀儡師の人形は data/puppeteer.js の modes.pvp）。
  //   hpMult/attackMult … 呼んだ時の HP・攻撃力の倍率　damageTakenScale/hitHpCap/windowHpCap … 受けるダメージの規則（combat の summon〜 の代わり）
  classSummons: {
    necromancer: { hpMult: 1.6, attackMult: 1.5, damageTakenScale: 0.4, hitHpCap: 0.25, windowHpCap: 0.6 },
  },
  teamStart: { x: 0.25, rows: [0.25, 0.5, 0.75] },
  movement: { margin: 20 }, // 通常の移動と同じマップ境界。壁際では横へ逃げる。
  combat: {
    damageScale: 0.08, hitHpCap: 0.10, windowSeconds: 1, windowHpCap: 0.12,
    // 壊せない罠の継続射撃を抑え、近接戦士の追跡を補助する。
    trapDamageScale: 0.35, chaseSpeed: { barbarian: 1.2 },
    summonDamageScale: 0.6, summonHitHpCap: 0.4, summonWindowHpCap: 1,
    reflectScale: 0.2, reflectRatioCap: 0.4, healScale: 0.5,
    // 回復専門の技は維持し、攻撃職の防御兼回復だけ追加補正。
    skillHealScale: { asn_cloak: 0.7 },
    bindScale: 0.5, bindMax: 1, bindImmunity: 0.75,
    pressureStart: 30, pressureRamp: 60, pressureDamageMax: 2.5, pressureHealMin: 0.05,
  },
};
