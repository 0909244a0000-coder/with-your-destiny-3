// 味方の手下（ネクロマンサーの骸骨・ユニーク装備の呼び出し）。敵を殴り、近くの敵の攻撃を引きつける。時間がたつと崩れる。
// 数値は、手下を呼んだスキル（data/classes.js の kind: "raise"）か、固有能力 periodicSummon（data/uniques.js）の数値を使う。
window.WYD = window.WYD || {};

WYD.allies = {
  // 呼べる数（骸の王冠などの固有能力で増える）
  maxCount(s, lv, stats) {
    const boost = stats && stats.powers.raiseBoost;
    return Math.max(1, Math.floor(s.countBase + s.countPerLevel * (lv - 1))) + (boost ? boost.extraCount : 0);
  },

  // スキル「骸骨召喚」：足りないぶんを呼ぶ。呼んだら true
  summon(w, state, stats, s, lv) {
    const source = WYD.world.castingId;   // 呼んだスキルごとに数える（骸骨の戦士と魔術師は別々）
    const alive = w.allies.filter((a) => a.source === source).length;
    const max = this.maxCount(s, lv, stats);
    const boost = stats.powers.raiseBoost;
    if (alive >= max) return false;
    const attackMult = (s.attackBase + s.attackPerLevel * (lv - 1)) * (1 + (boost ? boost.attackPercent : 0) / 100);
    for (let i = alive; i < max; i++) this.spawn(w, stats, s, attackMult, source);
    return true;
  },

  // 手下を1体出す（s = 手下の数値、attackMult = 主人公の攻撃力の何倍か、source = だれが呼んだか）
  spawn(w, stats, s, attackMult, source) {
    const p = w.player;
    const map = WYD.data.map;
    const ang = Math.random() * Math.PI * 2;
    const hp = Math.round(stats.maxHp * s.hpRatio);
    const a = {
      source,
      x: WYD.util.clamp(p.x + Math.cos(ang) * s.spawnSpread, 20, map.width - 20),
      y: WYD.util.clamp(p.y + Math.sin(ang) * s.spawnSpread, 20, map.height - 20),
      hp, maxHp: hp,
      attack: stats.attack * attackMult * (1 + stats.skillDamage / 100),
      defense: stats.defense * s.defenseRatio,
      timeLeft: s.duration, duration: s.duration,
      moveSpeed: s.moveSpeed, attackSpeed: s.attackSpeed, range: s.range, radius: s.radius,
      attackTimer: s.firstAttackDelay, followDistance: s.followDistance, hitFlash: 0, atkAnim: 0, face: 1,
      color: s.color, image: s.image, poses: s.poses, imageFilter: s.imageFilter, visualScale: s.visualScale || 1,
      ranged: s.rangedRange || 0, keepDistance: s.keepDistance || 0, shotColor: s.shotColor,   // 遠くから撃つ手下
    };
    w.allies.push(a);
    w.effects.push({ type: "ring", x: a.x, y: a.y, radius: s.radius * 2, color: s.color, time: 0, duration: 0.35 });
    return a;
  },

  // 固有能力 periodicSummon：敵がいるとき、一定時間ごとに味方を呼ぶ
  periodic(w, stats, dt) {
    const ps = stats.powers.periodicSummon;
    if (!ps || w.player.dead) return;
    w.summonTimer = (w.summonTimer == null ? ps.firstDelay : w.summonTimer) - dt;
    if (w.summonTimer > 0 || !w.enemies.length) return;
    w.summonTimer = ps.interval;
    for (let i = 0; i < ps.count; i++) this.spawn(w, stats, ps, ps.attackMult, "unique");
    WYD.sound.play("bossAppear");
  },

  update(w, state, stats, dt) {
    this.periodic(w, stats, dt);
    for (const a of w.allies) {
      a.timeLeft -= dt;
      a.hitFlash = Math.max(0, a.hitFlash - dt);
      a.atkAnim = Math.max(0, a.atkAnim - dt);
      if (a.stunTimer > 0) { a.stunTimer = Math.max(0, a.stunTimer - dt); continue; }
      const target = WYD.world.nearestEnemy(w, a);
      if (!target) {
        // 敵がいなければ主人公の近くへ
        WYD.world.moveToward(a, w.player, a.moveSpeed * dt, a.followDistance);
        continue;
      }
      const reach = a.ranged || a.range + WYD.data.enemies[target.kind].radius;
      const d = WYD.util.dist(a, target);
      if (d > reach) WYD.world.moveToward(a, target, a.moveSpeed * dt, reach * 0.8);
      else if (a.ranged && d < a.keepDistance) WYD.world.moveAway(a, target, a.moveSpeed * dt);
      a.attackTimer -= dt;
      if (d <= reach && a.attackTimer <= 0) {
        a.attackTimer = 1 / a.attackSpeed;
        a.atkAnim = WYD.data.anim.attack.time;
        a.attackTarget = target;
        a.face = target.x >= a.x ? 1 : -1;
        if (a.ranged) w.effects.push({ type: "chain", points: [{ x: a.x, y: a.y - 8 }, { x: target.x, y: target.y }], color: a.shotColor || a.color, time: 0, duration: 0.2 });
        const hit = WYD.world.calcDamage(a.attack, target.defense, stats.critChance, stats.critMultiplier);
        const hpBefore = target.hp;
        WYD.world.damageEnemy(w, state, target, hit.damage, hit.crit, a.source === "merc" ? "merc:" + state.mercenary.type : a.source === "unique" ? "effect:summon" : "skill:" + a.source, true, a);
        if (a.puppet) {
          WYD.puppeteer.onHit(w, stats, a, hpBefore - target.hp);
          WYD.vfx.spawn(w, "puppetSlash", target.x, target.y, {size:WYD.data.puppeteer.effects.pierce.size * 0.55});
        }
      }
    }
    // 崩れた手下を消す
    for (const a of w.allies) {
      if (a.hp <= 0 || a.timeLeft <= 0) {
        WYD.fx.burst(w, a.x, a.y, WYD.data.fx.playerHit, a.color, { gravity: true });
      }
    }
    w.allies = w.allies.filter((a) => a.hp > 0 && a.timeLeft > 0);
  },

  // 近接の敵がねらう相手：主人公より近い手下がいれば手下
  targetFor(w, e) {
    let best = w.player, bd = WYD.util.dist(e, w.player);
    for (const a of w.allies) {
      const d = WYD.util.dist(e, a);
      if (d < bd) { best = a; bd = d; }
    }
    return best;
  },

  // 敵が手下をなぐる
  hit(w, e, a) {
    const hit = WYD.world.calcDamage(e.attack, a.defense, 0);
    a.hp -= hit.damage;
    a.hitFlash = 0.1;
    WYD.world.addText(w, a.x, a.y - 16, `-${hit.damage}`, "#c9b48a");
  },

  draw(ctx, w) {
    const R = WYD.render;
    for (const a of w.allies) {
      // 手下の足元の緑の輪（味方だとわかるように）
      ctx.strokeStyle = WYD.data.player.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(a.x, a.y + a.radius * 0.6, a.radius * 1.2, a.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      R.drawCircleOrImage(ctx, a.x, a.y, a.radius * (a.visualScale || 1), a.hitFlash > 0 ? "#ffffff" : a.color, R.poseImage(a, a), a.hitFlash > 0,
        R.pose(a, a.puppet ? a.attackTarget : null, R.clock), a.imageFilter);
      // HPと残り時間
      const bw = a.radius * 2.2;
      ctx.fillStyle = "#222";
      ctx.fillRect(a.x - bw / 2, a.y - a.radius - 12, bw, 3);
      ctx.fillStyle = WYD.data.player.color;
      ctx.fillRect(a.x - bw / 2, a.y - a.radius - 12, bw * Math.max(0, a.hp / a.maxHp), 3);
      if (a.merc) {
        // 傭兵：時間で崩れないので、時間のかわりに名前
        ctx.fillStyle = a.color;
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(a.name, a.x, a.y - a.radius - 15);
        continue;
      }
      ctx.fillStyle = "#888";
      ctx.fillRect(a.x - bw / 2, a.y - a.radius - 8, bw * Math.max(0, a.timeLeft / a.duration), 1);
    }
  },
};
