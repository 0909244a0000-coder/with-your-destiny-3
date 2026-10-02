// エフェクト用の絵（data/vfx.js）。絵があるときだけ使い、なければ何もしない（今までの見た目のまま）。
window.WYD = window.WYD || {};

WYD.vfx = {
  img(key) {
    return WYD.render.getImage(WYD.data.vfx.textures[key]);
  },

  has(key) {
    return !!this.img(key);
  },

  // 絵のエフェクトを出す。opts: size（px）、angle（向き）、color（なくてよい）
  spawn(w, key, x, y, opts) {
    if (!this.has(key)) return false;
    const a = WYD.data.vfx.anim[key] || {};
    const o = opts || {};
    w.effects.push({
      type: "sprite", key, x, y,
      size: o.size || a.size || 80,
      angle: o.angle || 0,
      fall: o.fall || 0,   // 上から落ちてくる距離（px）
      time: -(o.delay || 0), duration: o.duration || a.duration || 0.4,
      from: a.scaleFrom != null ? a.scaleFrom : 1, to: a.scaleTo != null ? a.scaleTo : 1,
      spin: a.spin || 0, additive: a.additive !== false,
    });
    return true;
  },

  // 2点を絵でつなぐ（稲妻）
  segment(w, key, a, b) {
    if (!this.has(key)) return false;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    w.effects.push({
      type: "sprite", key, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
      size: d, stretch: true, angle: Math.atan2(b.y - a.y, b.x - a.x),
      time: 0, duration: (WYD.data.vfx.anim[key] || {}).duration || 0.25, from: 1, to: 1, spin: 0, additive: true,
    });
    return true;
  },

  // スキルを使ったときの絵
  cast(w, skillId, x, y, radius) {
    const key = WYD.data.vfx.skillCast[skillId];
    return key ? this.spawn(w, key, x, y, radius ? { size: radius * 2 } : null) : false;
  },

  draw(ctx, ef) {
    const img = this.img(ef.key);
    if (!img || ef.time < 0) return;
    const t = ef.time / ef.duration;
    const scale = ef.from + (ef.to - ef.from) * t;
    ctx.save();
    ctx.translate(ef.x, ef.y - ef.fall * (1 - t));
    ctx.rotate(ef.angle + ef.spin * ef.time);
    ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
    if (ef.additive) ctx.globalCompositeOperation = "lighter";
    if (ef.stretch) {
      ctx.drawImage(img, -ef.size / 2, -ef.size * 0.15, ef.size, ef.size * 0.3);
    } else {
      const s = ef.size * scale;
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
    }
    ctx.restore();
  },

  // 地面に広がる絵（燃える地面）。ゆらぎながら、消える前に薄くなる
  drawGround(ctx, f, t) {
    const img = this.img("fireGround");
    if (!img) return false;
    const pulse = 1 + Math.sin(t * 6 + f.x) * WYD.data.vfx.groundPulse;
    const s = f.radius * 2 * pulse;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, f.timeLeft / (f.duration * 0.3)) * 0.9;
    ctx.translate(f.x, f.y);
    ctx.scale(1, 0.75);   // 地面に寝かせて見えるように少しつぶす
    ctx.drawImage(img, -s / 2, -s / 2, s, s);
    ctx.restore();
    return true;
  },

  // キャラに重ねる絵（盾の光・縛る鎖）
  drawOn(ctx, key, x, y, size, alpha) {
    const img = this.img(key);
    if (!img) return false;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    ctx.restore();
    return true;
  },
};
