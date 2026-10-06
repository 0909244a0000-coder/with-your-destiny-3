// エフェクト用の絵（data/vfx.js）。絵があるときだけ使い、なければ何もしない（今までの見た目のまま）。
window.WYD = window.WYD || {};

WYD.vfx = {
  img(key) {
    return WYD.render.getImage(WYD.data.vfx.textures[key]);
  },

  has(key) {
    return !!this.img(key);
  },

  // 1セルだけを切り出す。隣の時点と補間して4コマの切替を滑らかにする。
  frame(ctx, key, image, x, y, width, height, progress, loop = false) {
    const a = WYD.data.vfx.atlases[key];
    if (!a) { ctx.drawImage(image, x, y, width, height); return; }
    const frames = loop ? a.loopFrames || Array.from({ length: a.frames }, (_, i) => i) : null;
    const position = loop ? ((progress % 1 + 1) % 1) * frames.length : WYD.util.clamp(progress, 0, 1) * (a.frames - 1);
    const index = Math.floor(position), mix = position - index;
    const first = loop ? frames[index] : index, second = loop ? frames[(index + 1) % frames.length] : Math.min(index + 1, a.frames - 1);
    const sw = image.width / a.columns, sh = image.height / a.rows, alpha = ctx.globalAlpha;
    const draw = (cell, weight) => {
      if (weight <= 0) return;
      ctx.globalAlpha = alpha * weight;
      ctx.drawImage(image, cell % a.columns * sw, Math.floor(cell / a.columns) * sh, sw, sh, x, y, width, height);
    };
    draw(first, 1 - mix); draw(second, mix); ctx.globalAlpha = alpha;
  },

  skillImpact(w, skillId, x, y, radius) {
    const key = WYD.data.vfx.impactSkills[skillId];
    if (!key) return false;
    if (w.effects.length >= WYD.data.vfx.maxEffects) return true;
    return this.spawn(w, key, x, y, { size: radius * 2 });
  },

  drawLoop(ctx, key, x, y, size, time, alphaFactor = 1) {
    const image = this.img(key), a = WYD.data.vfx.atlases[key];
    if (!image || !a) return false;
    const s = Math.min(size, a.maxSize);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha *= a.alpha * alphaFactor * (WYD.state?.settings.quietFx ? WYD.data.vfx.atlasQuietAlpha : 1);
    this.frame(ctx, key, image, x - s / 2, y - s * a.anchorY, s, s, time / WYD.data.vfx.anim[key].duration, true);
    ctx.restore(); return true;
  },

  // 絵のエフェクトを出す。opts: size（px）、angle（向き）、color（なくてよい）
  spawn(w, key, x, y, opts) {
    if (w.effects.length >= WYD.data.vfx.maxEffects) return false;
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

  // 発動時は絵を一枚だけ重ねる。白く潰れる紋章や放射線は使わない。
  cast(w, skillId, x, y, radius) {
    const V = WYD.data.vfx;
    // 命中地点・移動中の竜巻で描く技は、術者の足元へ重ねて出さない。
    if (V.impactSkills[skillId] || V.placedSkills.includes(skillId)) return false;
    if (w.effects.length >= V.maxEffects) return false;
    const kind = WYD.classes.kindOf(skillId);
    const base = V.castProfiles[kind];
    if (base) {
      const profile = Object.assign({}, base, V.castOverrides[skillId]);
      if (!this.has(profile.key)) return false;
      // 罠の設置煙は装置の位置に出す。
      const trap = kind === "trap" && w.traps[w.traps.length - 1];
      if (trap) { x = trap.x; y = trap.y; }
      w.effects.push(Object.assign({ type: "castMist", x, y, time: 0 }, profile));
      return true;
    }
    const key = V.skillCast[skillId];
    return key ? this.spawn(w, key, x, y, radius ? { size: radius * 2 } : null) : false;
  },

  trapShot(w, trap, enemy) {
    const V = WYD.data.vfx;
    if (w.effects.length >= V.maxEffects) return;
    const key = V.trapStyles[trap.source] || "shadowWisp";
    if (!this.has(key)) return;
    w.effects.push({ type: "trapShot", key, x: trap.x, y: trap.y, tx: enemy.x, ty: enemy.y,
      time: 0, duration: V.trapShot.duration });
  },

  drawCastMist(ctx, ef) {
    const img = this.img(ef.key);
    if (!img || ef.time < 0) return;
    const t = Math.max(0, Math.min(1, ef.time / ef.duration));
    const ease = 1 - (1 - t) * (1 - t);
    const size = ef.size * (ef.from + (ef.to - ef.from) * ease);
    ctx.save();
    ctx.translate(ef.x, ef.y - (ef.rise || 0) * ease);
    ctx.scale(1, ef.flatten);
    ctx.globalCompositeOperation = "lighter";
    const atlas = WYD.data.vfx.atlases[ef.key];
    ctx.globalAlpha *= ef.alpha * Math.sin(Math.PI * Math.sqrt(t)) * (atlas && WYD.state?.settings.quietFx ? WYD.data.vfx.atlasQuietAlpha : 1);
    this.frame(ctx, ef.key, img, -size / 2, -size * (atlas ? atlas.anchorY : 0.5), size, size, t);
    ctx.restore();
  },

  drawTrapShot(ctx, ef) {
    const img = this.img(ef.key), T = WYD.data.vfx.trapShot;
    if (!img) return;
    const t = Math.max(0, Math.min(1, ef.time / ef.duration));
    const dx = ef.tx - ef.x, dy = ef.ty - ef.y;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (ef.key === "lightning") {
      ctx.translate((ef.x + ef.tx) / 2, (ef.y + ef.ty) / 2);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.globalAlpha = T.alpha * (1 - t);
      const length = Math.hypot(dx, dy);
      ctx.drawImage(img, -length / 2, -T.size / 2, length, T.size);
    } else {
      for (let i = T.tailCount; i >= 0; i--) {
        const pos = Math.max(0, t - i * T.tailGap);
        ctx.save(); ctx.translate(ef.x + dx * pos, ef.y + dy * pos);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.globalAlpha = T.alpha * (1 - t) * (i ? T.tailAlpha / i : 1);
        ctx.drawImage(img, -T.size / 2, -T.size / 2, T.size, T.size);
        ctx.restore();
      }
    }
    ctx.restore();
  },

  drawAuraMist(ctx, p, aura, skillId) {
    const V = WYD.data.vfx, M = V.auraMist;
    const style = V.auraStyles[skillId];
    if (style && this.drawLoop(ctx, style.key, p.x, p.y, style.size, WYD.render.clock || 0, style.alphaFactor)) return true;
    const key = (V.castOverrides[skillId] || V.castProfiles.aura).key;
    const img = this.img(key);
    if (!img) return false;
    const size = aura.radius * 2 * M.radiusRatio;
    ctx.save();
    ctx.translate(p.x, p.y + WYD.data.player.radius * 0.6);
    ctx.scale(1, WYD.data.fx.auraRing.flatten);
    ctx.rotate(WYD.render.clock * M.spin);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = M.alpha + M.pulseAlpha * Math.sin(WYD.render.clock * WYD.data.fx.auraRing.pulseSpeed);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
    return true;
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
    const t = Math.max(0, Math.min(1, (ef.time - t0) / Math.max(Number.EPSILON, ef.duration - t0)));
    const atlas = V.atlases[ef.key];
    // 出た瞬間に少し大きくなってから戻る（ぽんっ）
    const pop = 1 + V.pop * Math.sin(Math.min(1, t * 4) * Math.PI);
    const scale = (ef.from + (ef.to - ef.from) * t) * pop;
    ctx.save();
    ctx.translate(ef.x, ef.y - ef.fall * (1 - t));
    ctx.rotate(ef.angle + ef.spin * ef.time);
    ctx.globalAlpha = Math.min(1, (1 - t) * 1.6) * (atlas ? ctx.globalAlpha * atlas.alpha * (WYD.state?.settings.quietFx ? V.atlasQuietAlpha : 1) : 1);
    if (ef.additive) ctx.globalCompositeOperation = "lighter";
    if (ef.stretch) {
      ctx.drawImage(img, -ef.size / 2, -ef.size * 0.15, ef.size, ef.size * 0.3);
    } else {
      const s = Math.min(ef.size * scale, atlas ? atlas.maxSize : Infinity);
      for (let i = 0; i < ef.boost; i++) this.frame(ctx, ef.key, img, -s / 2, -s * (atlas ? atlas.anchorY : 0.5), s, s, t);
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
    // アリーナのfieldAlphaを上書きしない。PvEの通常描画は従来の濃さ。
    ctx.globalAlpha *= Math.min(1, f.timeLeft / (f.duration * 0.3)) * WYD.data.vfx.groundAlpha;
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

  buffStyle() { return WYD.data.vfx.buffStyles[WYD.classes.id]; },

  drawBuff(ctx, p, time) {
    if (!p.buff || p.dead) return false;
    const style = this.buffStyle();
    if (!style) return false;
    const size = WYD.data.player.radius * WYD.data.map.spriteScale * style.sizeRatio * (p.form ? p.form.scale : 1);
    return this.drawLoop(ctx, style.key, p.x, p.y, size, time, style.alphaFactor);
  },
};
