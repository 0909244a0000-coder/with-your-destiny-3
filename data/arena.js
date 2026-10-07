// アリーナ専用の攻防補正。本編や保存されたビルドの性能には適用しない。
window.WYD = window.WYD || {};
WYD.data.arena = {
  width: 960, height: 600, startRadius: 220, timeLimit: 180, step: 0.05,
  speeds: [1, 2, 4], refreshMs: 250, loadTimeoutMs: 30000,
  background: "assets/areas/scenes/cathedral.webp",
  colors: ["#f2ba67", "#8bc7ff", "#bf96ff", "#9be39c", "#ff949b", "#80e5de", "#f5a2e3"],
  visual: { particlesPerTeam: 90, effectsPerTeam: 80, labelPx: 12, barWidth: 50, barHeight: 5, labelGap: 28, fieldAlpha: 0.6, backgroundDim: 0.3 },
  modes: { duel: { name: "1対1", min: 2, max: 2 }, royale: { name: "バトルロワイヤル", min: 2, max: 7 }, teams: { name: "3対3", min: 6, max: 6, teamSize: 3 } },
  formations: { slots: 6, nameLength: 32 },
  // 傭兵は出さない（加護もなし）。装備・スキル由来の召喚はそのまま出る。
  mercenary: false,
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
