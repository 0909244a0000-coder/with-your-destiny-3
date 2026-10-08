// 傀儡師の人形は独立した味方1体。能力値は本体の最大HPと防御力から毎フレーム再計算する。
window.WYD = window.WYD || {};
WYD.puppeteer = {
  config() { return WYD.data.puppeteer; },
  active(w) { return w.allies.find(a => a.puppet && a.hp > 0 && a.timeLeft > 0); },
  powers(stats) { return (stats && stats.powers) || {}; },
  // 対人（アリーナ）なら PvP 用、それ以外（冒険・DPSテスト）は PvE 用の人形
  mode() { const E = WYD.arenaEngine; return this.config().modes[E && E.bridge ? 'pvp' : 'pve']; },
  // 満ちる糸巻き：人形のHPが十分あるとき、命令の消費を減らす
  costPercent(w, stats, percent) {
    const spare = this.powers(stats).puppetSpareThread, a = this.active(w);
    const base = percent * this.mode().costMult;
    return spare && a && a.hp / a.maxHp * 100 >= spare.threshold ? base * spare.costPercent / 100 : base;
  },
  // reserve：払ったあとに残す本体HPの割合。命令は lowHpReserve、呼び出しは summonHpReserve
  canPay(w, stats, percent, reserve = this.mode().lowHpReserve) {
    const cost = this.costPercent(w, stats, percent);
    return !w.player.dead && w.player.hp - stats.maxHp * cost / 100 >= Math.max(1, stats.maxHp * reserve);
  },
  pay(w, stats, percent) {
    const amount = stats.maxHp * this.costPercent(w, stats, percent) / 100;
    w.player.hp -= amount;
    WYD.world.addText(w, w.player.x, w.player.y - 25, `-${Math.ceil(amount)} HP`, '#d97083');
  },
  // 無貌座の衣装：失ったHPの割合に応じて人形の攻撃力を上げる倍率
  desperationMult(w, stats) {
    const d = this.powers(stats).puppetDesperation;
    if (!d) return 1;
    const lost = Math.max(0, 1 - w.player.hp / stats.maxHp) * 100;
    return 1 + Math.min(d.maxPercent, lost * d.perPercent) / 100;
  },
  // 本体が受けるダメージの percent% を人形が代わりに受ける。本体に残るダメージを返す
  shield(w, amount, percent) {
    const a = this.active(w);
    if (!a || !(amount > 0) || !(percent > 0)) return amount;
    const taken = Math.min(a.hp, amount * percent / 100);
    a.hp -= taken;
    return amount - taken;
  },
  // 肩代わりの割合：人形の型（PvE/PvP）と藁の心臓の大きいほう
  sharePercent(scapegoat) { return Math.max(this.mode().guardSharePercent || 0, (scapegoat && scapegoat.sharePercent) || 0); },
  // 冒険の本体被ダメージ（world.receiveDamage から）
  absorb(w, amount) {
    if (!WYD.classes.acts('puppeteer')) return amount;
    return this.shield(w, amount, this.sharePercent(w.puppetScapegoat));
  },
  values(stats, m = this.mode()) {
    const d = this.config().puppet;
    const iron = this.powers(stats).puppetIronSkin, tough = iron ? 1 + iron.percent / 100 : 1; // 不死者の鎧（傀儡師の4点）
    return {
      maxHp: Math.round((stats.maxHp * d.hpPerBodyHp + stats.defense * d.hpPerDefense) * m.hpMult * tough),
      attack: (stats.attack * d.attackPerBodyAttack + stats.maxHp * d.attackPerBodyHp + stats.defense * d.attackPerDefense) * m.attackMult,
      defense: stats.defense * d.defensePerBodyDefense * m.defenseMult * tough,
    };
  },
  spawn(w, stats, percent) {
    if (this.active(w) || !this.canPay(w, stats, percent, this.mode().summonHpReserve)) return false;
    this.pay(w, stats, percent);
    const d = this.config().puppet;
    const a = WYD.allies.spawn(w, stats, d, 1, 'pup_thread');
    a.puppet = true;
    Object.assign(a, this.values(stats));
    a.hp = a.maxHp;
    w.puppetWasAlive = true;
    const fx = this.config().effects.thread;
    WYD.vfx.spawn(w, fx.key, a.x, a.y, {size:fx.size});
    return true;
  },
  update(w, state, stats) {
    if (!WYD.classes.acts('puppeteer', state) || w.player.dead) return;   // 蒐集者も人形の技をONにしていれば動く
    w.puppetScapegoat = this.powers(stats).puppetScapegoat || null;
    const a = this.active(w);
    if (a) {
      const v = this.values(stats);
      a.hp = Math.min(v.maxHp, a.hp + v.maxHp - a.maxHp);
      a.maxHp = v.maxHp;
      a.attack = v.attack * (1 + stats.skillDamage / 100) * this.desperationMult(w, stats);
      a.defense = v.defense * (a.guardUntil > w.time ? a.guardMult : 1);
      a.timeLeft = a.duration; // 戦闘中ずっといる。HPが尽きた場合のみ壊れる。
      return;
    }
    if (w.puppetWasAlive) {
      w.puppetWasAlive = false;
      w.puppetRespawnAt = w.time + this.mode().respawnCooldown;
      // 幕引きの裁ち鋏：壊れたときに回復し、早く呼び直せる
      const curtain = this.powers(stats).puppetCurtainCall;
      if (curtain) {
        w.puppetRespawnAt = w.time + curtain.respawnSeconds;
        WYD.world.healPlayer(w, stats.maxHp, stats.maxHp * curtain.healPercent / 100, 'effect:puppetCurtainCall');
        WYD.vfx.spawn(w, this.config().effects.thread.key, w.player.x, w.player.y, {size:this.config().effects.thread.size});
      }
    }
    if (!w.enemies.some(e => e.hp > 0) || w.time < (w.puppetRespawnAt || 0)) return;
    this.spawn(w, stats, this.config().summonCost);
  },
  onHit(w, stats, a, damage, state, target) {
    if (state && target && damage > 0) this.onStrike(w, state, stats, a, target);
    const stitch = a.stitch;
    if (!stitch || stitch.until <= w.time || damage <= 0 || (a.nextStitchHeal || 0) > w.time) return;
    a.nextStitchHeal = w.time + stitch.interval;
    WYD.world.healPlayer(w, stats.maxHp, stats.maxHp * stitch.healPercent / 100, 'skill:pup_stitch');
    const fx = this.config().effects.stitch;
    WYD.vfx.spawn(w, fx.key, w.player.x, w.player.y, {size:fx.size});
  },
  // 人形の通常攻撃が当たったとき：劫火の腕輪（燃え上がる）・狂王の籠手（周りにも当たる）
  onStrike(w, state, stats, a, target) {
    const P = this.powers(stats), ember = P.puppetEmberStrike, cleave = P.puppetCleave;
    const around = (r) => w.enemies.filter(e => e !== target && e.hp > 0 && WYD.util.dist(target, e) <= r);
    if (cleave) for (const e of around(cleave.radius)) WYD.world.playerHit(w, state, stats, e, a.attack * cleave.mult, 'effect:puppetCleave');
    if (ember && Math.random() * 100 < ember.chance) {
      for (const e of [target, ...around(ember.radius)]) if (e.hp > 0) WYD.world.playerHit(w, state, stats, e, a.attack * ember.mult, 'effect:puppetEmberStrike');
      w.effects.push({ type: 'ring', x: target.x, y: target.y, radius: ember.radius, color: ember.color, time: 0, duration: 0.3 });
    }
  },
  // 雷帝の装い（傀儡師の4点）：命令が当たった敵の近くの別の敵へ雷が跳ねる
  storm(w, state, stats, hit, damage) {
    const t = this.powers(stats).puppetStormThread, from = hit.find(e => e.hp > 0) || hit[0];
    if (!t || !from) return;
    const others = w.enemies.filter(e => e.hp > 0 && !hit.includes(e) && WYD.util.dist(from, e) <= t.range)
      .sort((x, y) => WYD.util.dist(from, x) - WYD.util.dist(from, y)).slice(0, t.extraTargets);
    for (const e of others) {
      WYD.world.playerHit(w, state, stats, e, damage * t.damagePercent / 100, 'effect:puppetStormThread');
      w.effects.push({ type: 'ring', x: e.x, y: e.y, radius: 22, color: t.color, time: 0, duration: 0.3 });
    }
  },
  // 業火の遺産（傀儡師の4点）：突撃・裁断の着地点が燃える。ダメージは人形の攻撃力が基準
  pyre(w, stats, a, at) {
    const f = this.powers(stats).puppetPyreTrail;
    if (!f || !at) return;
    w.fields.push({ source: 'effect:puppetPyreTrail', x: at.x, y: at.y, radius: f.radius, timeLeft: f.duration, duration: f.duration,
      tick: f.tick, tickTimer: f.tick, mult: f.mult * a.attack / Math.max(1, stats.attack), color: f.color });
  },
  cast(w, state, stats, s, lv) {
    if (!WYD.classes.acts('puppeteer', state)) return false;
    const p = w.player, a = this.active(w), mult = s.effectMult || 1;
    if (s.mode === 'thread') {
      if (!a) return this.spawn(w, stats, s.hpCost);
      if (a.hp >= a.maxHp || !this.canPay(w, stats, s.hpCost)) return false;
      this.pay(w, stats, s.hpCost);
      a.hp = Math.min(a.maxHp, a.hp + a.maxHp * (s.repairBase + s.repairPerLevel * (lv - 1)) * mult);
      const fx = this.config().effects.thread;
      WYD.vfx.spawn(w, fx.key, a.x, a.y, {size:fx.size});
      p.atkAnim = WYD.data.anim.attack.time;
      return true;
    }
    if (!a || !this.canPay(w, stats, s.hpCost)) return false;
    if (s.mode === 'finale' && a.hp / a.maxHp * 100 > s.triggerPuppetHpPercent) return false; // まだ戦える人形は壊さない
    const near = WYD.world.nearestEnemy(w, a);
    const nearby = radius => w.enemies.filter(e => e.hp > 0 && WYD.util.dist(a, e) <= radius + WYD.data.enemies[e.kind].radius);
    let targets = [];
    const spike = s.mode === 'pierce' && this.powers(stats).puppetLongSpike; // 彷徨う刃（傀儡師）
    if (s.mode === 'pierce' || s.mode === 'cut') {
      if (!near || WYD.util.dist(a, near) > s.range * (spike ? 1 + spike.rangePercent / 100 : 1)) return false;
      const radius = s.radius * (spike ? 1 + spike.radiusPercent / 100 : 1);
      targets = s.mode === 'pierce' ? w.enemies.filter(e => e.hp > 0 && WYD.util.dist(near, e) <= radius + WYD.data.enemies[e.kind].radius) : [near];
    } else if (['needles','bind','finale'].includes(s.mode)) {
      targets = nearby(s.radius);
      if (!targets.length) return false;
    } else if (s.mode === 'guard' && !nearby(s.range).length) return false;
    else if (s.mode === 'stitch' && !nearby(this.config().stitchRange).length) return false;
    else if (s.mode === 'swap' && p.hp / stats.maxHp * 100 > s.triggerHpPercent) return false;
    this.pay(w, stats, s.hpCost);
    p.atkAnim = WYD.data.anim.attack.time;
    p.swingTarget = a;
    a.atkAnim = WYD.data.anim.attack.time;
    a.attackTarget = near;
    if (s.mode === 'guard') {
      a.guardUntil = w.time + s.duration * mult;
      a.guardMult = s.defenseMult * mult;
    } else if (s.mode === 'stitch') {
      a.stitch = { until: w.time + s.duration * mult, interval: s.healInterval,
        healPercent: (s.healPercentBase + s.healPercentPerLevel * (lv - 1)) * mult };
    } else if (s.mode === 'swap') {
      WYD.world.healPlayer(w, stats.maxHp, stats.maxHp * (s.healPercentBase + s.healPercentPerLevel * (lv - 1)) * mult / 100, 'skill:pup_swap');
      p.buff = { defense: stats.defense * s.defenseMult * mult, timeLeft: s.duration * mult, color: s.color };
      a.guardUntil = w.time + s.duration * mult;
      a.guardMult = s.puppetDefenseMult * mult;
    } else {
      const damage = a.attack * (s.damageBase + s.damagePerLevel * (lv - 1)) * mult * (spike ? 1 + spike.damagePercent / 100 : 1);
      for (const e of targets) {
        WYD.world.playerHit(w, state, stats, e, damage);
        if (s.mode === 'bind' && e.hp > 0)
          e.stunTimer = Math.max(e.stunTimer || 0, (s.bindBase + s.bindPerLevel * (lv - 1)) * mult * (e.boss ? s.bossBindMult : 1));
      }
      this.storm(w, state, stats, targets, damage);
      if (s.mode === 'pierce' || s.mode === 'cut') this.pyre(w, stats, a, near);
      if (s.mode === 'pierce') { a.x = near.x; a.y = near.y; }
      if (s.mode === 'finale') {
        a.hp = 0;
        w.puppetRespawnAt = w.time + this.mode().respawnCooldown;
      }
    }
    const fx = this.config().effects[s.mode];
    if (fx) WYD.vfx.spawn(w, fx.key, a.x, a.y, {size:fx.size});
    w.effects.push({ type:'ring', x:a.x, y:a.y, radius:s.radius || 55, color:s.color, time:0, duration:0.35 });
    return true;
  },
};
WYD.world.skillHandlers.puppet = function(w, state, stats, s, lv) {
  return WYD.puppeteer.cast(w, state, stats, s, lv);
};
