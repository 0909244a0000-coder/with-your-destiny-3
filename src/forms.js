// 変身（ドルイド）。スキルのしくみ shift。近くに敵がいると、duration 秒のあいだ獣の姿になる。
// 姿のあいだは能力が上がる（src/stats.js の最後でかける）。一度に1つの姿だけ。今の姿は w.player.form
// 数値は data/classes.js の shift のスキル：
//   attackPctBase/PerLevel（攻撃力 +%）・attackSpeedPctBase/PerLevel（攻撃速度 +%）・maxHpPct・defensePct・moveSpeedPct（+%）
//   scale（絵の大きさ）・formFilter（姿の色）
window.WYD = window.WYD || {};

WYD.forms = {
  // スキル「変身」：まだ姿が変わっていなくて、近くに敵がいれば変身する。変身したら true
  shift(w, state, stats, s, lv) {
    const p = w.player;
    if (p.form) return false;
    const target = WYD.world.nearestEnemy(w, p);
    if (!target || WYD.util.dist(p, target) > s.triggerRange) return false;
    const L = lv - 1;
    p.form = {
      id: WYD.world.castingId, name: s.formName, timeLeft: s.duration, duration: s.duration,
      attackPct: (s.attackPctBase || 0) + (s.attackPctPerLevel || 0) * L,
      attackSpeedPct: (s.attackSpeedPctBase || 0) + (s.attackSpeedPctPerLevel || 0) * L,
      maxHpPct: s.maxHpPct || 0, defensePct: s.defensePct || 0, moveSpeedPct: s.moveSpeedPct || 0,
      scale: s.scale || 1, filter: s.formFilter || null, color: s.color,
    };
    WYD.world.addText(w, p.x, p.y - 30, `${s.formName}に変身！`, s.color);
    w.effects.push({ type: "ring", x: p.x, y: p.y, radius: 50, color: s.color, time: 0, duration: 0.4 });
    WYD.fx.burst(w, p.x, p.y, WYD.data.fx.levelUp, s.color, { glow: true });
    return true;
  },

  // src/stats.js から：姿の能力をかける
  apply(out) {
    const w = WYD.currentWorld;
    const f = w && w.player && w.player.form;
    if (!f) return out;
    out.attack *= 1 + f.attackPct / 100;
    out.attackSpeed *= 1 + f.attackSpeedPct / 100;
    out.maxHp = Math.round(out.maxHp * (1 + f.maxHpPct / 100));
    out.defense *= 1 + f.defensePct / 100;
    out.moveSpeed *= 1 + f.moveSpeedPct / 100;
    return out;
  },

  update(w, dt) {
    const p = w.player;
    if (!p.form) return;
    p.form.timeLeft -= dt;
    if (p.form.timeLeft <= 0 || p.dead) p.form = null;
  },
};
