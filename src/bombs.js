// 時限・追尾・地雷を共通の有限キューで管理。戦場だけに持ち、セーブには入れない。
window.WYD = window.WYD || {};
WYD.bombs = {
  clear(w) { w.bombs = []; },
  cast(w, state, stats, s, lv) {
    const list = w.bombs || (w.bombs = []), p = w.player;
    const targets = w.enemies.filter(e => e.hp > 0 && WYD.util.dist(p, e) <= s.range).sort((a, b) => WYD.util.dist(p, a) - WYD.util.dist(p, b));
    if (!targets.length) return false;
    const source = WYD.world.castingId;
    const mult = (s.damageBase + s.damagePerLevel * (lv - 1)) * (1 + stats.skillDamage / 100);
    const add = (e, mode) => {
      if (list.length >= WYD.data.bombs.maxActive) return false;
      const pos = mode === "hunter" ? p : mode === "mine" ? { x: p.x + (e.x - p.x) * s.placeAt, y: p.y + (e.y - p.y) * s.placeAt } : e;
      list.push({ mode, source, x: pos.x, y: pos.y, target: e, radius: s.radius, timer: s.fuse || s.lifetime, age: 0, speed: s.speed, triggerRadius: s.triggerRadius, armTime: s.armTime,
        attack: stats.attack * mult, extra: WYD.runes.extra(state, source) });
      if (mode === "brand" && w.effects.length < WYD.data.vfx.maxEffects) WYD.vfx.spawn(w, "bombOrb", e.x, e.y, { size: WYD.data.bombs.visuals.emberSize, fromX: p.x, fromY: p.y, travel: WYD.data.bombs.visuals.travelDuration });
      return true;
    };
    if (s.mode === "finale") {
      const armed = list.filter(b => !b.triggered && (b.mode === "brand" || b.mode === "mine"));
      // 既存の爆弾の威力を使い、一度だけ増幅。持ち主のスキル別に集計する。
      if (armed.length) armed.forEach((b, i) => { b.timer = Math.min(b.timer, i * WYD.data.bombs.chainDelay); b.triggered = true; b.attack *= s.chainBoost; b.extra = this.combineExtra(b.extra, WYD.runes.extra(state, source)); });
      // 起爆ボタンだけでも使えるが、既存爆弾がある時に威力を発揮する。
      if (list.length < WYD.data.bombs.maxActive) { add(targets[0], "brand"); list[list.length - 1].timer = 0; }
      return true;
    }
    if (s.mode === "brand") {
      let used = false;
      const count = Math.floor(s.targetsBase + s.targetsPerLevel * (lv - 1));
      for (const e of targets.filter(e => !list.some(b => b.mode === "brand" && b.target === e)).slice(0, count)) used = add(e, "brand") || used;
      return used;
    }
    if (s.mode === "mine" && list.filter(b => b.source === source).length >= s.maxBombs) return false;
    return add(targets[0], s.mode);
  },
  combineExtra(a, b) { return { lifesteal: Math.max(a && a.lifesteal || 0, b && b.lifesteal || 0), bind: Math.max(a && a.bind || 0, b && b.bind || 0) }; },
  update(w, state, stats, dt) {
    const list = w.bombs || [], ready = [];
    for (const b of list) {
      b.age += dt; b.timer -= dt;
      if (b.mode === "brand") {
        // 参照で階移動によるIDの再利用を避ける。倒れた宿主は最終位置で爆発。
        if (!w.enemies.includes(b.target) && b.target.hp > 0) { b.done = true; continue; }
        b.x = b.target.x; b.y = b.target.y;
        if (b.target.hp <= 0) b.timer = 0;
      } else if (b.mode === "hunter") {
        if (!b.target || b.target.hp <= 0 || !w.enemies.includes(b.target)) b.target = WYD.world.nearestEnemy(w, b);
        if (b.target) {
          const d = WYD.util.dist(b, b.target), step = b.speed * dt;
          if (d <= step + WYD.data.enemies[b.target.kind].radius) { b.x = b.target.x; b.y = b.target.y; b.timer = 0; }
          else { b.x += (b.target.x - b.x) / d * step; b.y += (b.target.y - b.y) / d * step; }
        }
      } else if (b.mode === "mine" && b.age >= b.armTime && w.enemies.some(e => e.hp > 0 && WYD.util.dist(e, b) <= b.triggerRadius)) b.timer = 0;
      if (b.timer <= 0) { b.done = true; ready.push(b); }
    }
    // 爆発はキューから外した後に処理し、再帰的な起爆を防ぐ。
    w.bombs = list.filter(b => !b.done);
    for (const b of ready) this.explode(w, state, stats, b);
  },
  explode(w, state, stats, b) {
    const oldExtra = WYD.world.castExtra;
    const oldSpark = WYD.vfx.suppressHit;
    WYD.world.castExtra = b.extra;
    // 範囲攻撃の各命中に巨大な火花を足さず、爆発の絵一枚で見せる。
    WYD.vfx.suppressHit = true;
    try {
      for (const e of w.enemies.slice()) if (e.hp > 0 && WYD.util.dist(e, b) <= b.radius + WYD.data.enemies[e.kind].radius)
        WYD.world.playerHit(w, state, stats, e, b.attack, "skill:" + b.source);
    } finally { WYD.world.castExtra = oldExtra; WYD.vfx.suppressHit = oldSpark; }
    const V = WYD.data.bombs.visuals;
    if (w.effects.length < WYD.data.vfx.maxEffects) {
      if (!WYD.vfx.spawn(w, "bombBurst", b.x, b.y, { size: b.radius * V.burstScale, duration: V.burstDuration }))
        w.effects.push({ type: "ring", x: b.x, y: b.y, radius: b.radius, color: "#dda2ff", time: 0, duration: V.burstDuration });
    }
    const now = w.time || 0;
    if (w.lastBombSound == null || now - w.lastBombSound >= WYD.data.bombs.soundInterval) {
      w.lastBombSound = now;
      WYD.fx.shake(w, V.shake);
      WYD.sound.play("slam");
    }
  },
  draw(ctx, w) {
    const V = WYD.data.bombs.visuals;
    for (const b of w.bombs || []) {
      const key = b.mode === "hunter" ? "bombHunter" : "bombOrb", img = WYD.vfx.img(key);
      const size = b.mode === "hunter" ? V.hunterSize : b.mode === "mine" ? V.mineSize : V.markSize;
      const y = b.y - (b.mode === "brand" ? WYD.data.enemies[b.target.kind].radius * WYD.data.map.spriteScale : 0);
      ctx.save(); ctx.globalAlpha = V.alpha + Math.sin(b.age * V.pulseSpeed) * V.pulseAlpha;
      if (b.mode !== "hunter") ctx.globalCompositeOperation = "lighter";
      if (img) {
        ctx.translate(b.x, y);
        if (b.mode === "hunter" && b.target && b.target.x < b.x) ctx.scale(-1, 1);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
      }
      else { ctx.fillStyle = "#dda2ff"; ctx.beginPath(); ctx.arc(b.x, y, size / 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  },
};
WYD.world.skillHandlers.bomb = function(w, state, stats, s, lv) {
  const used = WYD.bombs.cast(w, state, stats, s, lv);
  if (used) w.player.atkAnim = WYD.data.anim.attack.time;
  return used;
};
