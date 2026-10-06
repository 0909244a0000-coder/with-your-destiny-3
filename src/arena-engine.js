// 専用フレームだけで読み込む。各職業の通常の計算・技を独立して使う。
window.WYD = window.WYD || {};
WYD.arenaEngine = {
  init(classId, snapshot, team, color, bridge) {
    this.team = team; this.classId = classId; this.bridge = bridge;
    this.support = { allyHealing: 0, auraSeconds: 0, bindSeconds: 0, rows: {} };
    this.incoming = new WeakMap();
    WYD.classes.activeId = () => classId;
    WYD.classes.apply();
    // localStorage は arena-engine.html 冒頭でメモリへ置換済み。移行もコピーにだけ行う。
    localStorage.setItem(WYD.save.KEY, JSON.stringify(snapshot));
    this.state = WYD.save.load();
    this.state.settings.autoSkill = false;
    WYD.data.map.width = WYD.data.arena.width; WYD.data.map.height = WYD.data.arena.height;
    this.world = WYD.world.create();
    WYD.state = this.state; WYD.currentWorld = this.world;
    WYD.ui = { state: this.state, world: this.world, log() {}, markDirty() {}, changed() {}, notice() {} };
    WYD.save.write = () => {};
    WYD.sound.play = () => {};
    // 同じ画像を参加人数ぶん読み込まない。能力・乱数・戦闘状態は共有しない。
    WYD.render.images = bridge.images;
    WYD.render.getImage = bridge.getImage;
    WYD.data.player.color = color;
    const p = this.world.player;
    Object.assign(p, { id: bridge.nextId(), kind: "arena:" + classId + ":hero", arenaOwner: classId, arenaTeam: team, arenaMain: true, radius: WYD.data.player.radius, stunTimer: 0 });
    this.bindControl(p);
    p.hp = WYD.stats.compute(this.state).maxHp;
    this.installCombat();
    const P = WYD.data.player;
    for (const path of [P.image, P.poses && P.poses.attack, ...(P.preloadImages || []), ...Object.values(WYD.data.vfx.textures), ...Object.values(WYD.data.skillIcons || {})]) WYD.render.getImage(path);
    this.prepare();
    return this;
  },
  installCombat() {
    const E = this, W = WYD.world;
    const damage = W.damageEnemy;
    E.nativeDamage = damage;
    const heal = W.healPlayer;
    W.healPlayer = function(w, maxHp, amount, source) {
      if (w.player.dead) return;
      const hit = E.hitContext;
      // 吸血は軽減後に実際に奪ったHPを基準にする（超過ダメージでも回復しない）。
      if (hit && (source === "effect:lifesteal" || (source === hit.source && hit.extraLifesteal))) amount *= hit.raw > 0 ? hit.actual / hit.raw : 0;
      const id = source && source.startsWith("skill:") ? source.slice(6) : null;
      const scale = WYD.data.arena.combat.skillHealScale[id] ?? 1;
      return heal.call(this, w, maxHp, amount * E.healFactor() * scale, source);
    };
    for (const key of Object.keys(W.skillHandlers)) {
      const handler = W.skillHandlers[key];
      W.skillHandlers[key] = function(...args) {
        if (E.world.player.dead) return false;
        const healing = key === "aura" && args[3].auraType === "heal";
        const allies = healing ? E.world.allies.map(a => [a, a.hp]) : [];
        const source = "skill:" + W.castingId, previous = E.supportSource;
        E.supportSource = source;
        let used;
        try { used = handler.apply(this, args); } finally { E.supportSource = previous; }
        for (const [a, before] of allies) if (a.hp > before) {
          a.hp = before + (a.hp - before) * E.healFactor();
          if (E.bridge.teamBattle) E.recordSupport(source, "allyHealing", a.hp - before);
        }
        const initiallyUsed = used;
        if (healing && E.bridge.teamBattle) {
          const [w, state, stats, skill, level] = args;
          const pct = (skill.healPercentBase + skill.healPercentPerLevel * (level - 1)) * (1 + stats.skillDamage / 100) / 100;
          for (const friend of E.bridge.friends(E)) {
            const p = friend.world.player;
            if (friend === E || p.dead || p.hp <= 0 || WYD.util.dist(w.player, p) > skill.radius) continue;
            const amount = Math.max(0, Math.min(p.maxHp - p.hp, p.maxHp * pct * E.healFactor()));
            if (amount > 0) { p.hp += amount; E.recordSupport(source, "allyHealing", amount); used = true; }
          }
        }
        // 本人が満タンでも味方本人への祈りが成功したら、秘技の反撃を発動。
        if (healing && used && !initiallyUsed) {
          const [w,state,stats,skill,level]=args;
          WYD.training.onCast(w,state,stats,skill,level,{id:W.castingId,extra:W.castExtra,x:w.player.x,y:w.player.y});
        }
        return used;
      };
    }
    E.blocked = function(w, target, actor, source) {
      const receiver = E.bridge.owner(target);
      const ward = target.arenaMain && receiver && receiver.stats.powers.projectileWard;
      if (ward && source !== "effect:thorns" && (E.projectile || actor.ranged > 0) && Math.random() * 100 < ward.chance) {
        W.addText(w, target.x, target.y, "はじいた", ward.color); return true;
      }
      return false;
    };
    const playerHit = W.playerHit;
    W.playerHit = function(w, s, stats, target, attack, source) {
      if (!target || target.hp <= 0 || target.arenaTeam === E.team || w.player.dead) return;
      // 無効化した弾では吸血・拘束・命中時の宝石も発動させない。
      if (E.blocked(w, target, w.player, source)) return;
      const previous = E.hitContext;
      E.hitContext = { target, source: source || (this.hitSkill ? "skill:" + this.hitSkill : "attack"), raw: 0, actual: 0, extraLifesteal: !!(this.castExtra && this.castExtra.lifesteal) };
      E.wardChecked = true;
      try { return playerHit.call(this, w, s, stats, target, attack, source); }
      finally { E.wardChecked = false; E.hitContext = previous; }
    };
    const explode = W.explode;
    W.explode = function(...args) {
      const previous = E.projectile; E.projectile = false;
      try { return explode.apply(this, args); } finally { E.projectile = previous; }
    };
    W.damageEnemy = function(w, s, target, amount, crit, source = "attack", canCrit = true, actor = w.player) {
      if (!target || target.hp <= 0 || target.arenaTeam === E.team || actor.hp <= 0) return;
      const receiver = E.bridge.owner(target);
      if (!receiver || receiver.world.player.dead) return;
      // 弾をはじく装備：通常遠隔弾・遠隔召喚・罠射撃に適用。範囲/反射には適用しない。
      if (!E.wardChecked && E.blocked(w, target, actor, source)) return;
      const raw = amount;
      const skill = source.startsWith("skill:") && WYD.data.skills[source.slice(6)];
      if (skill && skill.kind === "trap") amount *= WYD.data.arena.combat.trapDamageScale;
      const C = WYD.data.arena.combat;
      amount = receiver.limitDamage(target, amount * (target.arenaMain ? C.damageScale : C.summonDamageScale) * E.pressureDamage());
      const actual = Math.min(target.hp, amount);
      if (E.hitContext && E.hitContext.target === target) Object.assign(E.hitContext, { raw, actual });
      if (!(actual > 0)) return;
      damage.call(this, w, s, target, actual, crit, source, canCrit);
      receiver.recordTaken(actual, target);
      E.bridge.hit(E, receiver, target, actual, source);
      if (source !== "effect:thorns" && target.arenaMain) {
        let percent = receiver.stats.effects.thorns;
        const power = receiver.stats.powers.vajraThorns;
        if (power && target.buff) percent += power.percent;
        const C = WYD.data.arena.combat;
        const back = actual * Math.min(C.reflectRatioCap, percent / 100 * C.reflectScale);
        if (back > 0 && actor.hp > 0)
          receiver.reflect(actor, back);
      }
      if (target.arenaMain && target.hp <= 0) receiver.die();
    };
    // 対戦では討伐効果だけを再現。経験値・装備・記録・危険度・試練を進めない。
    W.enemyDied = function(w, s, target) {
      w.enemies = w.enemies.filter(e => e !== target);
      WYD.lgems.onKill(w, s, target);
      WYD.results.add(w, null, { kills: 1 });
      const stats = WYD.stats.compute(s), p = w.player;
      if (stats.effects.killHeal > 0 && p.hp > 0) W.healPlayer(w, stats.maxHp, Math.round(stats.maxHp * stats.effects.killHeal / 100), "effect:killHeal");
      const be = stats.powers.bindExplode, kn = stats.powers.killNova;
      if (be && target.stunTimer > 0 && p.hp > 0) W.explode(w, s, stats, target.x, target.y, be.radius, be.mult, be.color, "effect:bindExplode");
      if (kn && p.hp > 0 && Math.random() * 100 < kn.chance) W.explode(w, s, stats, target.x, target.y, kn.radius, kn.mult, kn.color, "effect:killNova");
    };
    const spawn = WYD.allies.spawn;
    WYD.allies.spawn = function(...args) {
      const a = spawn.apply(this, args);
      a.id = E.bridge.nextId(); a.kind = "arena:" + E.team + ":ally:" + a.id;
      a.arenaOwner = E.classId; a.arenaTeam = E.team; a.arenaMain = false; a.stunTimer = 0;
      E.bindControl(a);
      return a;
    };
    // 対人の遠距離本人だけ、壁に当たる後退を壁沿いの移動へ切り替える。
    const away = W.moveAway;
    W.moveAway = function(obj, target, step) {
      if (obj !== E.world.player || !WYD.data.player.rangedAttack || !(step > 0))
        return away.call(this, obj, target, step);
      return E.retreat(target, step);
    };
    // 遠隔弾と罠の判定を区別する（通常のスキル処理は変えない）。
    for (const [host, key] of [[W, "updateBolts"], [WYD.traps, "update"]]) {
      const original = host[key];
      host[key] = function(...args) { E.projectile = true; try { return original.apply(this, args); } finally { E.projectile = false; } };
    }
  },
  retreat(target, step) {
    const p = this.world.player, M = WYD.data.map, edge = WYD.data.arena.movement.margin;
    const inside = (x, y) => x >= edge && x <= M.width - edge && y >= edge && y <= M.height - edge;
    const distance = Math.hypot(p.x - target.x, p.y - target.y);
    const x = p.x + (p.x - target.x) / (distance || 1) * step;
    const y = p.y + (p.y - target.y) / (distance || 1) * step;
    if (distance > 0 && inside(x, y)) {
      this.retreatDirection = null;
      p.x = x; p.y = y;
      return;
    }
    // 壁に沿う方向を保持。近い相手から毎フレーム反転して角に戻らない。
    const current = this.retreatDirection;
    if (current && inside(p.x + current.x * step, p.y + current.y * step)) {
      p.x += current.x * step; p.y += current.y * step;
      return;
    }
    let best = null, score = -Infinity;
    for (const direction of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
      const nx = p.x + direction.x * step, ny = p.y + direction.y * step;
      if (!inside(nx, ny)) continue;
      // 囲まれているときは、最も近い敵への距離が大きい経路を選ぶ。
      const enemies = this.world.enemies.filter(e => e.hp > 0);
      const clearance = Math.min(...(enemies.length ? enemies : [target]).map(e => Math.hypot(nx - e.x, ny - e.y)));
      if (clearance > score) { score = clearance; best = direction; }
    }
    this.retreatDirection = best;
    if (best) { p.x += best.x * step; p.y += best.y * step; }
  },
  pressure() {
    const C = WYD.data.arena.combat;
    return WYD.util.clamp((this.bridge.time() - C.pressureStart) / C.pressureRamp, 0, 1);
  },
  pressureDamage() { return 1 + this.pressure() * (WYD.data.arena.combat.pressureDamageMax - 1); },
  healFactor() {
    const C = WYD.data.arena.combat;
    return C.healScale * (1 - this.pressure() * (1 - C.pressureHealMin));
  },
  limitDamage(target, amount) {
    const C = WYD.data.arena.combat, now = this.bridge.time();
    const log = (this.incoming.get(target) || []).filter(x => x.t > now - C.windowSeconds);
    const perWindow = target.arenaMain ? C.windowHpCap : C.summonWindowHpCap;
    const perHit = target.arenaMain ? C.hitHpCap : C.summonHitHpCap;
    const room = Math.max(0, target.maxHp * perWindow * this.pressureDamage() - log.reduce((sum, x) => sum + x.d, 0));
    const actual = Math.max(0, Math.min(amount, target.hp, target.maxHp * perHit * this.pressureDamage(), room));
    if (actual > 0) log.push({ t: now, d: actual });
    this.incoming.set(target, log);
    return actual;
  },
  bindControl(unit) {
    const E = this, C = WYD.data.arena.combat;
    let timer = 0, immuneUntil = 0;
    Object.defineProperty(unit, "stunTimer", { enumerable: true, configurable: true,
      get: () => timer,
      set(value) {
        if (!Number.isFinite(value)) return;
        if (value <= timer) { timer = Math.max(0, value); return; }
        if (timer > 0 || E.bridge.time() < immuneUntil) return;
        timer = Math.min(value * C.bindScale, C.bindMax);
        immuneUntil = E.bridge.time() + timer + C.bindImmunity;
        const actor = E.bridge.actor;
        if (actor && actor.team !== E.team && timer > 0) actor.recordSupport(actor.supportSource || actor.hitContext?.source || "effect:bind", "bindSeconds", timer);
      },
    });
  },
  prepare() {
    this.stats = WYD.stats.compute(this.state);
    if (this.bridge.teamBattle && !this.world.player.dead) {
      const aura = this.bestMight();
      this.stats.attack *= (1 + aura.percent / 100) / WYD.stats.mightMult(this.state);
      this.mightSupport = aura.engine !== this ? aura : null;
    }
    this.stats.moveSpeed *= WYD.data.arena.combat.chaseSpeed[WYD.classes.id] || 1;
    const p = this.world.player;
    p.maxHp = this.stats.maxHp; p.hp = Math.min(p.hp, p.maxHp);
    p.defense = this.stats.defense + (p.buff ? p.buff.defense : 0);
    p.attack = this.stats.attack; p.color = WYD.data.player.color;
    this.world.allies = this.world.allies.filter(a => a.hp > 0 && a.timeLeft > 0);
  },
  recordSupport(source, key, amount) {
    this.support[key] += amount;
    const row = this.support.rows[source] ||= { allyHealing: 0, auraSeconds: 0, bindSeconds: 0 };
    row[key] += amount;
  },
  mightOffer(target) {
    if (this.world.player.dead || this.world.player.hp <= 0) return { percent: 0, engine: this };
    let best = { percent: 0, engine: this };
    for (const [id, def] of Object.entries(WYD.data.skills)) {
      const lv = this.state.player.skills[id] || 0;
      if (def.kind !== "aura" || def.auraType !== "might" || !lv || !this.state.player.skillEnabled[id]) continue;
      const skill = WYD.runes.effectiveDef(this.state, id);
      if (target !== this.world.player && WYD.util.dist(this.world.player, target) > skill.radius) continue;
      const percent = skill.mightBase + skill.mightPerLevel * (lv - 1);
      if (percent > best.percent) best = { percent, engine: this, source: "skill:" + id };
    }
    return best;
  },
  bestMight() {
    let best = this.mightOffer(this.world.player);
    for (const friend of this.bridge.friends(this)) {
      const offer = friend.mightOffer(this.world.player);
      if (offer.percent > best.percent) best = offer;
    }
    return best;
  },
  units() { return [this.world.player, ...this.world.allies].filter(u => u.hp > 0 && !this.world.player.dead); },
  setEnemies(units) {
    this.world.enemies = units.filter(e => e.arenaTeam !== this.team && e.hp > 0);
    for (const e of this.world.enemies) WYD.data.enemies[e.kind] = { name: e.arenaMain ? e.arenaName : e.name || "召喚", radius: e.radius, color: e.color || "#bbb", image: e.image, poses: {} };
  },
  recordTaken(amount, target) {
    this.taken = (this.taken || 0) + amount;
    WYD.results.add(this.world, null, { taken: target.arenaMain ? amount : 0 });
  },
  reflect(actor, amount) {
    // 反射の再帰はしない。反射した側に与ダメージ、攻撃者の側に被ダメージを残す。
    const receiver = this.bridge.owner(actor), actual = receiver && receiver.limitDamage(actor, amount);
    if (!receiver || !(actual > 0)) return;
    WYD.data.enemies[actor.kind] = { name: actor.arenaName || "召喚", radius: actor.radius, color: actor.color || "#bbb", poses: {} };
    this.nativeDamage.call(WYD.world, this.world, this.state, actor, actual, false, "effect:thorns", false);
    receiver.recordTaken(actual, actor);
    this.bridge.hit(this, receiver, actor, actual, "effect:thorns");
    if (actor.arenaMain && actor.hp <= 0) receiver.die();
  },
  tick(dt) {
    const w = this.world, s = this.state, p = w.player, W = WYD.world;
    w.time = (w.time || 0) + dt;
    // 敵は他フレームの本人。相手のアニメーション時計を重ねて進めない。
    W.trackMotion({ ...w, enemies: [] }, dt); W.updateEffects(w, dt);
    if (p.dead || p.hp <= 0) return;
    WYD.results.tick(w, dt);
    WYD.forms.update(w, dt); WYD.lgems.update(w, dt);
    if (p.buff && (p.buff.timeLeft -= dt) <= 0) p.buff = null;
    if (p.haste && (p.haste.timeLeft -= dt) <= 0) p.haste = null;
    for (const id in p.auras || {}) if ((p.auras[id].timeLeft -= dt) <= 0) delete p.auras[id];
    for (const id in p.skillCooldowns) p.skillCooldowns[id] = Math.max(0, p.skillCooldowns[id] - dt);
    this.prepare();
    if (this.bridge.teamBattle && this.mightSupport?.percent > 0) this.mightSupport.engine.recordSupport(this.mightSupport.source, "auraSeconds", dt);
    W.healPlayer(w, this.stats.maxHp, this.stats.hpRegen * dt, "regen");
    W.updateFields(w, s, this.stats, dt);
    // 拘束中も設置済みの技・手下は動く。本人の新規詠唱と移動は止まる。
    const stunned = p.stunTimer > 0;
    p.stunTimer = Math.max(0, p.stunTimer - dt);
    if (!stunned && p.hp > 0) W.updatePlayer(w, s, this.stats, dt);
    if (p.dead || p.hp <= 0) { this.die(); return; }
    W.updateBolts(w, s, this.stats, dt);
    WYD.bombs.update(w, s, this.stats, dt);
    WYD.runeSkills.update(w, s, this.stats, dt);
    WYD.mercenary.update(w, s, this.stats, dt);
    WYD.puppeteer.update(w, s, this.stats, dt);
    WYD.allies.update(w, s, this.stats, dt);
    WYD.traps.update(w, s, this.stats, dt);
  },
  die() {
    const w = this.world;
    w.player.dead = true; w.player.hp = 0;
    WYD.classSpecialization.clear(w);
    w.allies = []; w.fields = []; w.traps = []; w.bolts = []; WYD.bombs.clear(w); WYD.runeSkills.clear(w);
  },
  summary() {
    const r = WYD.results.snapshot(this.world), elapsed = r.elapsed;
    const rows = { ...r.rows };
    for (const [id, support] of Object.entries(this.support.rows)) rows[id] = { ...WYD.results.emptyRow(), ...rows[id], ...support };
    return { allyHealing: this.support.allyHealing, auraSeconds: this.support.auraSeconds, bindSeconds: this.support.bindSeconds, damage: r.damage, taken: this.taken || 0, healing: r.healing, crit: WYD.results.crit(r), elapsed,
      rows: Object.entries(rows).map(([id, row]) => ({ ...row, ...WYD.results.source(id), id, crit: WYD.results.crit(row) })).sort((a, b) => b.damage - a.damage) };
  },
  drawGround(ctx) {
    for (const f of this.world.fields) WYD.vfx.drawGround(ctx, f, this.world.time || 0);
    WYD.traps.draw(ctx, this.world);
    WYD.classSpecialization.draw(ctx, this.world);
  },
  drawUnits(ctx) {
    const w = this.world, R = WYD.render;
    R.clock = w.time || 0;
    WYD.allies.draw(ctx, w); R.drawPlayer(ctx, w.player); WYD.bombs.draw(ctx, w);
    const r = WYD.data.player.rangedAttack;
    for (const b of w.bolts) {
      const img = WYD.vfx.img(r && r.texture || "fireball");
      if (img && r) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.ty - b.y, b.tx - b.x)); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(img, -r.size * 4, -r.size * 2, r.size * 8, r.size * 4); ctx.restore(); }
    }
  },
  drawEffects(ctx, limits) {
    const w = this.world;
    WYD.runeSkills.draw(ctx, w);
    for (const ef of w.effects.slice(-limits.effectsPerTeam)) WYD.render.drawEffect(ctx, ef);
    WYD.fx.draw(ctx, { ...w, particles: w.particles.slice(-limits.particlesPerTeam) });
  },
};
