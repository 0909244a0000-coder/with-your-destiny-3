// エフェクト：粒（火花・血しぶき・火の粉）、画面の揺れ。数値は data/fx.js。
window.WYD = window.WYD || {};

WYD.fx = {
  // 粒を飛び散らせる。spec = data/fx.js の1項目、color を省くと spec.color
  burst(w, x, y, spec, color, opts) {
    const F = WYD.data.fx;
    const o = opts || {};
    const n = Math.min(spec.count, F.maxParticles - w.particles.length);
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + WYD.util.rand(-o.spread, o.spread) : Math.random() * Math.PI * 2;
      const sp = spec.speed * WYD.util.rand(0.3, 1);
      w.particles.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (o.up ? -spec.speed * 0.6 : 0),
        life: spec.life * WYD.util.rand(0.6, 1), max: spec.life,
        size: spec.size * WYD.util.rand(0.6, 1.2),
        color: color || spec.color,
        gravity: o.gravity ? F.gravity : 0,
        glow: !!o.glow,
      });
    }
  },

  // 攻撃が当たった
  hit(w, e, crit) {
    const F = WYD.data.fx;
    const def = WYD.data.enemies[e.kind];
    this.burst(w, e.x, e.y, crit ? F.crit : F.hit, null, { glow: true });
    WYD.sound.play(crit ? "crit" : "hit");
    this.burst(w, e.x, e.y, F.blood, def.color, { gravity: true });
  },

  // 敵が倒れた
  death(w, e) {
    const F = WYD.data.fx;
    const def = WYD.data.enemies[e.kind];
    // 倒れた体を少しのあいだ残す（絵があるときだけ。向きは倒れた瞬間のまま）
    w.corpses = w.corpses || [];
    if (w.corpses.length < F.corpse.maxCount) {
      w.corpses.push({ x: e.x, y: e.y, r: def.radius, image: WYD.render.poseImage(e, def), filter: e.imageFilter || def.imageFilter,
        flip: e.face || 1, time: 0 });
    }
    const big = e.boss || e.elite;
    WYD.sound.play(big ? "bigDeath" : "death");
    this.burst(w, e.x, e.y, big ? F.bigDeath : F.death, def.color, { gravity: true });
    if (big) this.burst(w, e.x, e.y, F.crit, null, { glow: true });
    if (e.boss) this.shake(w, F.shakeBossDeath);
    else if (e.elite) this.shake(w, F.shakeEliteDeath);
  },

  shake(w, spec) {
    if (!w.shake || w.shake.strength <= spec.strength) w.shake = { strength: spec.strength, time: spec.time, max: spec.time };
  },

  // 毎コマ：粒を動かす、燃える地面から火の粉を出す、揺れを弱める
  update(w, dt) {
    const F = WYD.data.fx;
    for (const p of w.particles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.vx *= 1 - 2.5 * dt;
      p.vy *= 1 - (p.gravity ? 0.5 : 2.5) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    w.particles = w.particles.filter((p) => p.life > 0);
    if (w.corpses) {
      for (const c of w.corpses) c.time += dt;
      w.corpses = w.corpses.filter((c) => c.time < F.corpse.time);
    }
    for (const f of w.fields) {
      if (Math.random() < F.ember.perSecond * dt) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * f.radius;
        this.burst(w, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.6, { ...F.ember, count: 1 }, f.color, { angle: -Math.PI / 2, spread: 0.5, glow: true });
      }
    }
    if (w.shake) {
      w.shake.time -= dt;
      if (w.shake.time <= 0) w.shake = null;
    }
  },

  // 画面の揺れの、今のずれ
  shakeOffset(w) {
    if (!w.shake) return { x: 0, y: 0 };
    const s = w.shake.strength * (w.shake.time / w.shake.max);
    return { x: WYD.util.rand(-s, s), y: WYD.util.rand(-s, s) };
  },

  draw(ctx, w) {
    ctx.save();
    for (const p of w.particles) {
      const t = p.life / p.max;
      ctx.globalAlpha = Math.max(0, Math.min(1, t * 1.4));
      ctx.globalCompositeOperation = p.glow ? "lighter" : "source-over";
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * t), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
};
