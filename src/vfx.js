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
      spin: a.spin || 0, additive: a.additive !== false, echo: !!a.echo, boost: a.boost || 1,
      // 飛んでいく絵：fromX/fromY から x/y へ travel 秒で動く
      fromX: o.fromX, fromY: o.fromY, travel: o.travel || 0,
    });
    return true;
  },

  // 跳ね返るスキル：前の点から次の点へ、絵が順に飛んでいく。着いたら衝撃の輪
  flyChain(w, style, points, color) {
    const V = WYD.data.vfx;
    let delay = 0, any = false;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const travel = Math.max(0.04, Math.hypot(b.x - a.x, b.y - a.y) / V.flySpeed);
      const angle = style.face ? Math.atan2(b.y - a.y, b.x - a.x) + ((V.anim[style.key] || {}).angleOffset || 0) : 0;
      any = this.spawn(w, style.key, b.x, b.y, { fromX: a.x, fromY: a.y, travel, delay, angle,
        duration: travel + ((V.anim[style.key] || {}).duration || 0.3) }) || any;
      this.spawn(w, V.impact.key, b.x, b.y, { size: V.impact.size, delay: delay + travel, duration: V.impact.duration });
      if (style.impact) this.spawn(w, style.impact, b.x, b.y, { delay: delay + travel, angle: Math.random() * 6.28 });
      delay += travel;
    }
    return any;
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

  // 攻撃が当たったときの火花（スキル・職業ごとの属性の絵）。suppressHit の間は出さない（飛んでいく絵が着いたときに出すので）
  hitSpark(w, e, skillId, crit) {
    const V = WYD.data.vfx;
    if (this.suppressHit || w.effects.length > V.maxEffects) return;
    const key = (skillId && V.hitBySkill[skillId]) || V.hitByClass[WYD.classes.id] || "hitSpark";
    const a = V.anim[key] || {};
    this.spawn(w, key, e.x + WYD.util.rand(-6, 6), e.y - 8 + WYD.util.rand(-6, 6),
      { angle: Math.random() * 6.28, size: (a.size || 46) * (crit ? V.hitCritScale : 1) });
  },

  // スキルを使ったときの絵
  cast(w, skillId, x, y, radius) {
    const key = WYD.data.vfx.skillCast[skillId];
    return key ? this.spawn(w, key, x, y, radius ? { size: radius * 2 } : null) : false;
  },

  draw(ctx, ef) {
    const img = this.img(ef.key);
    if (!img || ef.time < 0) return;
    const V = WYD.data.vfx;
    // 飛んでいる間：残像をひきながら進む
    if (ef.travel && ef.time < ef.travel) {
      const T = V.trail;
      for (let k = T.count; k >= 0; k--) {
        const tt = Math.max(0, ef.time - k * T.gap) / ef.travel;
        const x = ef.fromX + (ef.x - ef.fromX) * tt, y = ef.fromY + (ef.y - ef.fromY) * tt;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ef.angle + ef.spin * (ef.time - k * T.gap));
        ctx.globalAlpha = k === 0 ? 1 : T.alpha * (1 - k / (T.count + 1));
        if (ef.additive) ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(img, -ef.size / 2, -ef.size / 2, ef.size, ef.size);
        ctx.restore();
      }
      return;
    }
    const t0 = ef.travel || 0;
    const t = (ef.time - t0) / (ef.duration - t0);
    // 出た瞬間に少し大きくなってから戻る（ぽんっ）
    const pop = 1 + V.pop * Math.sin(Math.min(1, t * 4) * Math.PI);
    const scale = (ef.from + (ef.to - ef.from) * t) * pop;
    ctx.save();
    ctx.translate(ef.x, ef.y - ef.fall * (1 - t));
    ctx.rotate(ef.angle + ef.spin * ef.time);
    ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
    if (ef.additive) ctx.globalCompositeOperation = "lighter";
    if (ef.stretch) {
      ctx.drawImage(img, -ef.size / 2, -ef.size * 0.15, ef.size, ef.size * 0.3);
    } else {
      const s = ef.size * scale;
      for (let i = 0; i < ef.boost; i++) ctx.drawImage(img, -s / 2, -s / 2, s, s);
      // 2枚目：うすく大きく、逆向きに回す（厚みと勢い）
      if (ef.echo) {
        const E = V.echo;
        ctx.rotate(ef.spin * ef.time * (E.spin - 1));
        ctx.globalAlpha *= E.alpha;
        ctx.drawImage(img, -s * E.scale / 2, -s * E.scale / 2, s * E.scale, s * E.scale);
      }
    }
    ctx.restore();
  },

  // 地面に広がる絵（燃える地面）。ゆらぎながら、消える前に薄くなる
  drawGround(ctx, f, t) {
    if (f.texture === null) return false;   // 絵を使わない地面（霜・風など）
    const img = this.img(f.texture || "fireGround");
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
