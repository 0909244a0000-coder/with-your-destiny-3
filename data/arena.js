// アリーナ専用の攻防補正。本編や保存されたビルドの性能には適用しない。
window.WYD = window.WYD || {};
WYD.data.arena = {
  width: 960, height: 600, startRadius: 220, timeLimit: 180, step: 0.05,
  speeds: [1, 2, 4], refreshMs: 250, loadTimeoutMs: 30000,
  background: "assets/areas/scenes/cathedral.webp",
  colors: ["#f2ba67", "#8bc7ff", "#bf96ff", "#9be39c", "#ff949b", "#80e5de", "#f5a2e3"],
  visual: { particlesPerTeam: 90, effectsPerTeam: 80, labelPx: 12, barWidth: 50, barHeight: 5, labelGap: 28, fieldAlpha: 0.6, backgroundDim: 0.3 },
  modes: { duel: { name: "1対1", min: 2, max: 2 }, royale: { name: "バトルロワイヤル", min: 2, max: 7 } },
  combat: {
    damageScale: 0.18, hitHpCap: 0.075, windowSeconds: 1, windowHpCap: 0.1,
    summonDamageScale: 0.6, summonHitHpCap: 0.4, summonWindowHpCap: 1,
    reflectScale: 0.2, reflectRatioCap: 0.4, healScale: 0.5,
    bindScale: 0.5, bindMax: 1, bindImmunity: 0.75,
    pressureStart: 30, pressureRamp: 60, pressureDamageMax: 2.5, pressureHealMin: 0.05,
  },
};
