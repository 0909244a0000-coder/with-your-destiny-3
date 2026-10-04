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
    const V = WYD.data.vfx, S = V.signature;
    const def = WYD.data.skills[skillId] || {};
    const kind = WYD.classes.kindOf(skillId);
    const key = V.skillCast[skillId];
    let drawn = key ? this.spawn(w, key, x, y, radius ? { size: radius * 2 } : null) : false;
    if (w.effects.length < V.maxEffects && S.styles[kind]) {
      w.effects.push({ type: "signature", x, y, radius: Math.min(radius || S.radius, S.radius * 2),
        style: S.styles[kind], color: def.color || S.classColors[WYD.classes.id],
        time: 0, duration: S.duration });
      drawn = true;
    }
    return drawn;
  },

  trapShot(w, trap, enemy) {
    if (w.effects.length >= WYD.data.vfx.maxEffects) return;
    w.effects.push({ type: "trapShot", x: trap.x, y: trap.y, tx: enemy.x, ty: enemy.y,
      style: WYD.data.vfx.trapStyles[trap.source] || "shadow", color: trap.color,
      time: 0, duration: WYD.data.vfx.trapShot.duration });
  },

  drawSignature(ctx, ef) {
    const S = WYD.data.vfx.signature;
    const t = Math.max(0, Math.min(1, ef.time / ef.duration));
    const r = ef.radius * (1 - S.expansion + S.expansion * t);
    ctx.save();
    ctx.translate(ef.x, ef.y);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = S.alpha * Math.sin(Math.PI * t);
    ctx.strokeStyle = ef.color;
    ctx.fillStyle = ef.color;
    ctx.lineWidth = S.lineWidth;
    const ring = (radius) => { ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke(); };
    const ray = (a, inner, outer) => { ctx.beginPath(); ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner); ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer); ctx.stroke(); };
    if (["summon", "trap", "aura", "field"].includes(ef.style)) ctx.scale(1, S.flatten);
    if (ef.style === "blades") {
      // 分かれた刃が外へ広がる。全職業を同じ一枚の輪にしない。
      for (let i = 0; i < S.spokes; i++) {
        const a = i * Math.PI * 2 / S.spokes + t * S.spin;
        ctx.beginPath(); ctx.arc(0, 0, r, a, a + Math.PI / S.spokes); ctx.stroke();
        ray(a, r * (1 - S.coreRatio), r);
      }
    } else if (ef.style === "shield") {
      // 防御：閉じた多角形が立ち上がり、内側にも盾の線。
      ctx.rotate(-t * S.spin);
      for (const scale of [1, 1 - S.coreRatio]) {
        ctx.beginPath();
        for (let i = 0; i <= S.spokes; i++) { const a = i * Math.PI * 2 / S.spokes; const x = Math.cos(a) * r * scale, y = Math.sin(a) * r * scale; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
      }
    } else if (ef.style === "fury" || ef.style === "shift") {
      // 強化・変身：外へ開く爪と放射線。円だけの演出と区別する。
      for (let i = 0; i < S.spokes; i++) {
        const a = i * Math.PI * 2 / S.spokes + t * S.spin;
        ray(a, r * S.coreRatio, r);
        ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, r * S.coreRatio, a + Math.PI, a + Math.PI * 1.5); ctx.stroke();
      }
    } else if (ef.style === "bind") {
      // 束縛：内へ締まる輪と、放射状に閉じる鎖。
      const close = ef.radius * (1 - t * S.expansion);
      ring(close);
      for (let i = 0; i < S.spokes; i++) ray(i * Math.PI * 2 / S.spokes, close * S.coreRatio, close);
    } else if (ef.style === "trap") {
      // 罠の設置は角張った装置の紋章。召喚の円とは違う形。
      ctx.rotate(-t * S.spin);
      for (let i = 0; i < S.trapSides; i++) {
        const a = i * Math.PI * 2 / S.trapSides;
        ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(r * S.coreRatio, -r); ctx.lineTo(r, -r); ctx.lineTo(r, -r * S.coreRatio); ctx.stroke(); ctx.restore();
      }
    } else if (ef.style === "field") {
      // 地面の呪文は枝分かれする亀裂。
      for (let i = 0; i < S.spokes; i++) {
        const a = i * Math.PI * 2 / S.spokes;
        ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * S.coreRatio, r * S.coreRatio); ctx.lineTo(r, 0); ctx.moveTo(r * S.coreRatio, r * S.coreRatio); ctx.lineTo(r * (1 - S.coreRatio), r * (1 - S.coreRatio)); ctx.stroke(); ctx.restore();
      }
    } else if (ef.style === "aura") {
      // オーラの発動は外へ広がる花弁状の光。
      for (let i = 0; i < S.spokes; i++) {
        const a = i * Math.PI * 2 / S.spokes;
        ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(r * S.coreRatio, 0); ctx.quadraticCurveTo(r, -r * S.coreRatio, r, 0); ctx.quadraticCurveTo(r, r * S.coreRatio, r * S.coreRatio, 0); ctx.stroke(); ctx.restore();
      }
    } else {
      // 召喚：円の中で星の紋章が回る。
      ctx.rotate(t * S.spin); ring(r);
      ctx.beginPath();
      for (let i = 0; i <= S.spokes * 2; i++) {
        const a = i * Math.PI / S.spokes, radius = r * (i % 2 ? S.coreRatio : 1 - S.coreRatio);
        const x = Math.cos(a) * radius, y = Math.sin(a) * radius;
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  },

  drawTrapShot(ctx, ef) {
    const T = WYD.data.vfx.trapShot;
    const t = Math.min(1, ef.time / ef.duration);
    const dx = ef.tx - ef.x, dy = ef.ty - ef.y, d = Math.hypot(dx, dy) || 1;
    ctx.save();
    ctx.strokeStyle = ef.color; ctx.fillStyle = ef.color;
    ctx.lineWidth = T.lineWidth; ctx.globalAlpha = 1 - t;
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    if (ef.style === "lightning") {
      ctx.moveTo(ef.x, ef.y);
      for (let i = 1; i <= T.zigzags; i++) {
        const k = i / T.zigzags, bend = i === T.zigzags ? 0 : Math.sin(i * Math.PI / 2 + ef.time * T.phaseSpeed) * T.bend;
        ctx.lineTo(ef.x + dx * k - dy / d * bend, ef.y + dy * k + dx / d * bend);
      }
      ctx.stroke();
    } else {
      const start = Math.max(0, t - T.tail);
      ctx.moveTo(ef.x + dx * start, ef.y + dy * start);
      ctx.lineTo(ef.x + dx * t, ef.y + dy * t); ctx.stroke();
      ctx.translate(ef.x + dx * t, ef.y + dy * t);
      ctx.rotate(Math.atan2(dy, dx));
      const head = T.headSize * (1 - t);
      if (ef.style === "fire") {
        // 火は先の尖った炎、影は弧を引く幽体。色だけでなく形で区別する。
        ctx.beginPath(); ctx.moveTo(head, 0); ctx.lineTo(-head * T.fireLength, -head); ctx.quadraticCurveTo(-head, 0, -head * T.fireLength, head); ctx.closePath(); ctx.fill();
        ctx.fillStyle = T.coreColor; ctx.beginPath(); ctx.ellipse(0, 0, head, head / T.fireLength, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, head, 0, Math.PI * T.shadowArc); ctx.stroke();
        ctx.beginPath(); ctx.arc(-head, 0, head, Math.PI / 2, Math.PI * T.shadowArc); ctx.stroke();
      }
    }
    ctx.restore();
  },

  drawAuraMarks(ctx, p, a) {
    const M = WYD.data.vfx.auraMarks;
    ctx.save(); ctx.translate(p.x, p.y + WYD.data.player.radius * 0.6); ctx.scale(1, WYD.data.fx.auraRing.flatten);
    ctx.rotate(WYD.render.clock * M.spin); ctx.strokeStyle = a.color; ctx.globalAlpha = M.alpha; ctx.lineWidth = WYD.data.vfx.signature.lineWidth;
    const r = a.radius * M.radiusRatio;
    for (let i = 0; i < M.count; i++) {
      const angle = i * Math.PI * 2 / M.count, x = Math.cos(angle) * r, y = Math.sin(angle) * r;
      ctx.beginPath(); ctx.moveTo(x, y - M.size); ctx.lineTo(x + M.size, y); ctx.lineTo(x, y + M.size); ctx.lineTo(x - M.size, y); ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
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
