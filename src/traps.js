// 罠（アサシン）。スキルのしくみ trap で置くと、duration 秒のあいだ、fireInterval 秒ごとに
// range の中のいちばん近い敵（targetsBase 体）へ 攻撃力×倍率 のダメージを撃つ。数値は data/classes.js の trap のスキル。
// 置いてある罠は w.traps（階を変えると消える）
window.WYD = window.WYD || {};

WYD.traps = {
  // 置ける数
  maxCount(s, lv) {
    return Math.floor(s.maxTrapsBase + s.maxTrapsPerLevel * (lv - 1));
  },

  // スキル「罠」：近くに敵がいて、置ける数に空きがあれば置く。置いたら true
  place(w, state, stats, s, lv) {
    const p = w.player;
    const W = WYD.world;
    w.traps = w.traps || [];
    const source = W.castingId;
    const target = W.nearestEnemy(w, p);
    if (!target || WYD.util.dist(p, target) > s.triggerRange) return false;
    if (w.traps.filter((t) => t.source === source).length >= this.maxCount(s, lv)) return false;
    // 主人公と敵のあいだ（少し主人公寄り）に置く
    const k = s.placeAt;
    w.traps.push({
      source, x: p.x + (target.x - p.x) * k, y: p.y + (target.y - p.y) * k,
      timeLeft: s.duration, duration: s.duration, fireTimer: 0, fireInterval: s.fireInterval,
      range: s.range, targets: Math.max(1, Math.floor(s.targetsBase || 1)), radius: s.trapRadius, color: s.color,
      mult: (s.damageBase + s.damagePerLevel * (lv - 1)) * (1 + stats.skillDamage / 100),
      extra: W.castExtra,   // 型のおまけ（吸血・縛る）
    });
    w.effects.push({ type: "ring", x: p.x, y: p.y, radius: 18, color: s.color, time: 0, duration: 0.25 });
    return true;
  },

  update(w, state, stats, dt) {
    if (!w.traps || !w.traps.length) return;
    const W = WYD.world;
    for (const t of w.traps) {
      t.timeLeft -= dt;
      t.fireTimer -= dt;
      if (t.fireTimer > 0) continue;
      const near = w.enemies.filter((e) => WYD.util.dist(t, e) <= t.range)
        .sort((a, b) => WYD.util.dist(t, a) - WYD.util.dist(t, b)).slice(0, t.targets);
      if (!near.length) continue;
      t.fireTimer = t.fireInterval;
      t.flash = 0.12;
      // 撃つときだけ、型のおまけを効かせる
      const prev = W.castExtra;
      W.castExtra = t.extra;
      for (const e of near) {
        WYD.vfx.trapShot(w, t, e);
        W.playerHit(w, state, stats, e, stats.attack * t.mult, "skill:" + t.source);
      }
      W.castExtra = prev;
    }
    for (const t of w.traps) if (t.flash > 0) t.flash -= dt;
    w.traps = w.traps.filter((t) => t.timeLeft > 0);
  },

  draw(ctx, w) {
    for (const t of w.traps || []) {
      const r = t.radius;
      ctx.save();
      ctx.globalAlpha = t.flash > 0 ? WYD.data.vfx.trapRangeAlpha : 0;
      ctx.strokeStyle = t.color;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // 装置：絵があれば絵（撃った瞬間は明るく重ねる）、なければ三角の図形
      const img = WYD.vfx.img("trap");
      if (img) {
        const size = r * WYD.data.vfx.trapImageScale;
        ctx.drawImage(img, t.x - size / 2, t.y - size / 2, size, size);
        if (t.flash > 0) {
          ctx.globalCompositeOperation = "lighter";
          ctx.drawImage(img, t.x - size / 2, t.y - size / 2, size, size);
          ctx.globalCompositeOperation = "source-over";
        }
      } else {
      ctx.fillStyle = t.flash > 0 ? "#ffffff" : "#2a2a34";
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y - r);
      ctx.lineTo(t.x + r * 0.9, t.y + r * 0.6);
      ctx.lineTo(t.x - r * 0.9, t.y + r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      }
      // 残り時間
      ctx.fillStyle = t.color;
      ctx.fillRect(t.x - r, t.y + r, r * 2 * Math.max(0, t.timeLeft / t.duration), 2);
      ctx.restore();
    }
  },
};
