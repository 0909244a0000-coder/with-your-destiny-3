// 職業の技を、保存IDや装備のkindを変えずに独自の挙動へ。
window.WYD = window.WYD || {};
WYD.classSpecialization = {
  clear(w) { w.classTasks = []; w.classOrbits = []; w.necRemains = []; w.classEpoch = (w.classEpoch || 0) + 1; },
  context(id, extra, fn) {
    const W = WYD.world, old = [W.castingId, W.hitSkill, W.castExtra];
    W.castingId = id; W.hitSkill = id; W.castExtra = extra;
    try { return fn(); } finally { [W.castingId, W.hitSkill, W.castExtra] = old; }
  },
  queue(w, task) {
    const list = w.classTasks || (w.classTasks = []);
    if (list.length < WYD.data.classSpecialization.maxTasks) list.push(task);
  },
  ring(w, pos, radius, color) {
    if (w.effects.length < WYD.data.vfx.maxEffects) w.effects.push({ type: "ring", x: pos.x, y: pos.y, radius, color, time: 0, duration: WYD.data.classSpecialization.effectDuration });
  },
  area(w, state, stats, pos, radius, attack) {
    for (const e of w.enemies.slice()) {
      if (w.player.dead) break;
      if (e.hp > 0 && WYD.util.dist(pos, e) <= radius + WYD.data.enemies[e.kind].radius) WYD.world.playerHit(w, state, stats, e, attack);
    }
  },
  cast(base, host, w, state, stats, s, lv) {
    const id = host.castingId, R = WYD.data.classSpecialization.skills[id], p = w.player;
    if (!R || p.dead) return p.dead ? false : base.call(host, w, state, stats, s, lv);
    const target = WYD.world.nearestEnemy(w, p);
    const attack = stats.attack * (s.damageBase + s.damagePerLevel * (lv - 1)) * (1 + stats.skillDamage / 100);
    const task = (mode, delay, rest = {}) => this.queue(w, { id, extra: host.castExtra, mode, delay, s, lv, ...rest });
    if (R.mode === "whirlwind") {
      const scaled = { ...s, damageBase: s.damageBase * R.hitScale, damagePerLevel: s.damagePerLevel * R.hitScale };
      if (!base.call(host, w, state, stats, scaled, lv)) return false;
      if (!p.dead) for (let i = 1; i < R.pulses; i++) task("whirl", i * R.interval, { s: scaled, base });
      return true;
    }
    if (R.mode === "charge") {
      if (!target || WYD.util.dist(p, target) > s.range) return false;
      const from = { x: p.x, y: p.y };
      WYD.world.moveToward(p, target, s.range, R.stopAt);
      WYD.vfx.segment(w, "slash", from, p);
      this.area(w, state, stats, p, s.radius, attack * R.impactScale);
      this.ring(w, p, s.radius, s.color);
      if (!p.dead) base.call(host, w, state, stats, s, lv);
      return true;
    }
    if (R.mode === "freeze") {
      const targets = w.enemies.filter(e => e.hp > 0 && WYD.util.dist(p, e) <= s.radius + WYD.data.enemies[e.kind].radius);
      if (!base.call(host, w, state, stats, s, lv)) return false;
      for (const e of targets) if (e.hp > 0 && !e.shielded) e.stunTimer = Math.max(e.stunTimer || 0, R.freeze * (e.boss ? R.bossScale : 1));
      return true;
    }
    if (R.mode === "meteor") {
      if (!base.call(host, w, state, stats, s, lv)) return false;
      const field = w.fields[w.fields.length - 1], delay = WYD.data.vfx.meteorFall;
      field.tickTimer = delay; field.timeLeft += delay; field.duration += delay;
      task("area", delay, { x: field.x, y: field.y, radius: s.radius, attack: attack * R.impactScale });
      return true;
    }
    if (R.mode === "corpses") {
      const bodies = (w.necRemains || []).filter(c => WYD.util.dist(p, c) <= R.range && w.enemies.some(e => e.hp > 0 && WYD.util.dist(c, e) <= s.radius * R.radiusScale + WYD.data.enemies[e.kind].radius)).slice(0, R.consume);
      if (!bodies.length) {
        const ally = w.allies.find(a => (a.source === "nec_raise" || a.source === "nec_mage") && a.hp > 0 && WYD.util.dist(p, a) <= R.range && w.enemies.some(e => e.hp > 0 && WYD.util.dist(a, e) <= s.radius + WYD.data.enemies[e.kind].radius));
        if (!ally) return base.call(host, w, state, stats, s, lv);
        this.area(w, state, stats, ally, s.radius, attack * R.allyScale);
        this.ring(w, ally, s.radius, s.color);
        return true;
      }
      w.necRemains = w.necRemains.filter(c => !bodies.includes(c));
      for (const c of bodies) {
        if (p.dead) break;
        this.area(w, state, stats, c, s.radius * R.radiusScale, attack * R.damageScale);
        if (!WYD.vfx.skillImpact(w, id, c.x, c.y, s.radius * R.radiusScale)) {
          WYD.vfx.spawn(w, "boneStorm", c.x, c.y, { size: s.radius * R.radiusScale * 2 });
          this.ring(w, c, s.radius * R.radiusScale, s.color);
        }
      }
      return true;
    }
    if (R.mode === "staticArc") {
      if (!target || WYD.util.dist(p, target) > R.range) return false;
      const targets = w.enemies.filter(e => e.hp > 0 && WYD.util.dist(target, e) <= s.radius + WYD.data.enemies[e.kind].radius)
        .sort((a, b) => WYD.util.dist(target, a) - WYD.util.dist(target, b)).slice(0, R.maxTargets);
      for (const e of targets) {
        WYD.world.playerHit(w, state, stats, e, attack);
        WYD.vfx.segment(w, "lightning", p, e);
      }
      this.ring(w, target, s.radius, s.color);
      return true;
    }
    if (R.mode === "minionAura") {
      const origins = [p, ...w.allies.filter(a => a.hp > 0 && (a.source === "nec_raise" || a.source === "nec_mage"))];
      const targets = w.enemies.filter(e => e.hp > 0 && origins.some(a => WYD.util.dist(a, e) <= s.radius + WYD.data.enemies[e.kind].radius));
      if (!targets.length) return false;
      for (const e of targets) WYD.world.playerHit(w, state, stats, e, attack);
      for (const a of origins) this.ring(w, a, s.radius, s.color);
      return true;
    }
    if (R.mode === "pierce") {
      if (!target || WYD.util.dist(p, target) > s.range) return false;
      const len = WYD.util.dist(p, target) || 1, dx = (target.x - p.x) / len, dy = (target.y - p.y) / len;
      const bounce = stats.powers.chakraBounce;
      const max = Math.floor(s.targetsBase + s.targetsPerLevel * (lv - 1)) + (bounce ? bounce.extraTargets : 0);
      const line = w.enemies.filter(e => {
        const x = e.x - p.x, y = e.y - p.y, t = x * dx + y * dy;
        return e.hp > 0 && t >= 0 && t <= s.range && Math.abs(x * dy - y * dx) <= s.jumpRange * R.widthRatio + WYD.data.enemies[e.kind].radius;
      }).sort((a, b) => WYD.util.dist(p, a) - WYD.util.dist(p, b)).slice(0, max);
      const bear = p.form && p.form.id === "dru_bear";
      for (const e of line) {
        if (p.dead) break;
        WYD.world.playerHit(w, state, stats, e, attack * (bounce ? 1 + bounce.damagePercent / 100 : 1) * (bear && R.bearScale || 1));
        if (e.hp > 0 && R.knockback) {
          const k = R.knockback * (e.boss ? R.bossKnockbackScale : 1), M = WYD.data.map;
          e.x = WYD.util.clamp(e.x + dx * k, 20, M.width - 20); e.y = WYD.util.clamp(e.y + dy * k, 20, M.height - 20);
        }
      }
      const end = { x: p.x + dx * s.range, y: p.y + dy * s.range };
      const style = WYD.data.vfx.chainStyle[id];
      if (!(style && WYD.vfx.segment(w, style.key, p, end))) w.effects.push({ type: "chain", points: [{ x: p.x, y: p.y }, end], color: s.color, time: 0, duration: WYD.data.classSpecialization.effectDuration });
      return true;
    }
    if (R.mode === "zeal") {
      if (!target || WYD.util.dist(p, target) > s.radius + WYD.data.enemies[target.kind].radius) return false;
      WYD.world.playerHit(w, state, stats, target, attack * R.hitScale);
      for (let i = 1; i < R.strikes && !p.dead; i++) task("strike", i * R.interval, { target, radius: s.radius, attack: attack * R.hitScale });
      this.ring(w, target, s.radius, s.color); return true;
    }
    if (R.mode === "orbit") {
      if (!target || WYD.util.dist(p, target) > s.jumpRange * R.radiusRatio + R.hitRadius + WYD.data.enemies[target.kind].radius) return false;
      const bounce = stats.powers.chakraBounce;
      const count = Math.floor(s.targetsBase + s.targetsPerLevel * (lv - 1)) + (bounce ? bounce.extraTargets : 0);
      const angle = Math.atan2(target.y - p.y, target.x - p.x);
      const orbits = w.classOrbits || (w.classOrbits = []);
      if (orbits.length < WYD.data.classSpecialization.maxTasks) orbits.push({ angle, age: 0, life: count * R.interval, radius: s.jumpRange * R.radiusRatio, speed: R.angleStep / R.interval, size: R.hitRadius });
      for (let i = 0; i < count; i++) task("orbit", i * R.interval, { angle: angle + i * R.angleStep, orbitRadius: s.jumpRange * R.radiusRatio, radius: R.hitRadius, attack: attack * R.hitScale * (bounce ? 1 + bounce.damagePercent / 100 : 1) });
      return true;
    }
    if (R.mode === "ambush") {
      if (!target || WYD.util.dist(p, target) > R.range) return false;
      const M = WYD.data.map, from = { x: p.x, y: p.y };
      const len = WYD.util.dist(p, target) || 1, dx = (target.x - p.x) / len, dy = (target.y - p.y) / len;
      p.x = WYD.util.clamp(target.x + dx * R.offset, 20, M.width - 20); p.y = WYD.util.clamp(target.y + dy * R.offset, 20, M.height - 20);
      WYD.vfx.segment(w, "slashClaw", from, p);
      return base.call(host, w, state, stats, s, lv);
    }
    if (R.mode === "storm") {
      if (!target || WYD.util.dist(p, target) > R.range) return false;
      const len = WYD.util.dist(p, target) || 1, dx = (target.x - p.x) / len, dy = (target.y - p.y) / len;
      const bear = p.form && p.form.id === "dru_bear", wolf = p.form && p.form.id === "dru_wolf";
      task("storm", 0, { x: p.x, y: p.y, dx, dy, speed: R.speed * (wolf ? R.wolfSpeedScale : 1), life: R.duration, interval: R.interval, radius: s.radius, attack: attack * R.hitScale * (bear ? R.bearScale : 1) });
      return true;
    }
    return base.call(host, w, state, stats, s, lv);
  },
  update(w, state, stats, dt) {
    if (w.player.dead || w.town) { this.clear(w); return; }
    w.necRemains = (w.necRemains || []).filter(c => (c.life -= dt) > 0);
    w.classOrbits = (w.classOrbits || []).filter(o => { o.age += dt; return o.age < o.life; });
    const tasks = w.classTasks || [], epoch = w.classEpoch || 0; w.classTasks = [];
    for (const t of tasks) {
      if (w.player.dead || epoch !== (w.classEpoch || 0)) break;
      if (t.mode === "storm") { t.x += t.dx * t.speed * dt; t.y += t.dy * t.speed * dt; t.life -= dt; }
      t.delay -= dt;
      if (t.delay > 0) { this.queue(w, t); continue; }
      this.context(t.id, t.extra, () => {
        if (t.mode === "training") WYD.training.execute(w, state, stats, t);
        else if (t.mode === "whirl") t.base.call(WYD.world, w, state, stats, t.s, t.lv);
        else if (t.mode === "strike") {
          const e = t.target.hp > 0 && w.enemies.includes(t.target) ? t.target : WYD.world.nearestEnemy(w, w.player);
          if (e && WYD.util.dist(w.player, e) <= t.radius + WYD.data.enemies[e.kind].radius) { WYD.world.playerHit(w, state, stats, e, t.attack); this.ring(w, e, t.radius, t.s.color); }
        } else {
          const p = t.mode === "orbit" ? { x: w.player.x + Math.cos(t.angle) * t.orbitRadius, y: w.player.y + Math.sin(t.angle) * t.orbitRadius } : t;
          this.area(w, state, stats, p, t.radius, t.attack);
          this.ring(w, p, t.radius, t.s.color);
          if (t.mode === "orbit") WYD.vfx.spawn(w, "hitHoly", p.x, p.y, { size: t.radius * 2 });
          if (t.mode === "storm" && t.life > 0 && !w.player.dead) { t.delay += t.interval; this.queue(w, t); }
        }
      });
    }
  },
  draw(ctx, w) {
    const draw = (key, x, y, size, angle) => {
      const img = WYD.vfx.img(key); if (!img) return;
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(img, -size / 2, -size / 2, size, size); ctx.restore();
    };
    for (const c of w.necRemains || []) if (c.training) {
      ctx.save();ctx.globalAlpha*=WYD.data.training.cacheAlpha*(WYD.state?.settings.quietFx?WYD.data.vfx.atlasQuietAlpha:1);
      draw("boneStorm",c.x,c.y,WYD.data.training.cacheSize,0);ctx.restore();
    }
    for (const t of w.classTasks || []) if (t.mode === "storm") {
      if (!WYD.vfx.drawLoop(ctx, WYD.data.vfx.stormTexture, t.x, t.y, t.radius * 2, w.time || 0)) draw("tornado", t.x, t.y, t.radius * 2, w.time || 0);
    }
    for (const o of w.classOrbits || []) {
      const angle = o.angle + o.age * o.speed;
      draw("holyHammer", w.player.x + Math.cos(angle) * o.radius, w.player.y + Math.sin(angle) * o.radius, o.size, angle);
    }
  },
};
// 共通入口をラップする。アリーナも同じ入口を利用し、後から対戦補正を適用する。
for (const kind of Object.keys(WYD.world.skillHandlers)) {
  const base = WYD.world.skillHandlers[kind];
  WYD.world.skillHandlers[kind] = function(...args) { return WYD.classSpecialization.cast(base, this, ...args); };
}
{
  const W = WYD.world, S = WYD.classSpecialization;
  const fields = W.updateFields;
  W.updateFields = function(w, state, stats, dt) { S.update(w, state, stats, dt); if (!w.player.dead) return fields.call(this, w, state, stats, dt); };
  const hit = W.playerHit;
  W.playerHit = function(w, state, stats, e, attack, source) {
    const id = (source || (this.hitSkill ? "skill:" + this.hitSkill : "attack")).replace(/^skill:/, "");
    const R = WYD.data.classSpecialization.skills[id];
    if (R && R.executeHp && e.hp / e.maxHp <= R.executeHp) attack *= R.executeScale;
    return hit.call(this, w, state, stats, e, attack, source);
  };
  const damage = W.damageEnemy;
  W.damageEnemy = function(w, state, e, ...args) {
    const before = e.hp, epoch = w.classEpoch || 0;
    const result = damage.call(this, w, state, e, ...args);
    if (WYD.classes.id === "necromancer" && before > 0 && e.hp <= 0 && epoch === (w.classEpoch || 0) && !w.player.dead) {
      const R = WYD.data.classSpecialization.skills.nec_nova;
      const corpses = w.necRemains || (w.necRemains = []);
      corpses.push({ x: e.x, y: e.y, life: R.corpseLife });
      if (corpses.length > R.maxCorpses) corpses.shift();
    }
    return result;
  };
  for (const key of ["changeFloor", "resetEnemies", "respawn", "playerDied"]) {
    if (!W[key]) continue;
    const original = W[key];
    W[key] = function(w, ...args) { S.clear(w); return original.call(this, w, ...args); };
  }
  const enter = WYD.town.enter;
  WYD.town.enter = function(w, ...args) { const result = enter.call(this, w, ...args); if (result) S.clear(w); return result; };
}
