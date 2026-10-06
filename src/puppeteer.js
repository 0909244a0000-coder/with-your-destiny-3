// 傀儡師の人形は独立した味方1体。能力値は本体の最大HPと防御力から毎フレーム再計算する。
window.WYD = window.WYD || {};
WYD.puppeteer = {
  config() { return WYD.data.puppeteer; },
  active(w) { return w.allies.find(a => a.puppet && a.hp > 0 && a.timeLeft > 0); },
  canPay(w, stats, percent) {
    return !w.player.dead && w.player.hp - stats.maxHp * percent / 100 >= Math.max(1, stats.maxHp * this.config().lowHpReserve);
  },
  pay(w, stats, percent) {
    w.player.hp -= stats.maxHp * percent / 100;
    WYD.world.addText(w, w.player.x, w.player.y - 25, `-${Math.ceil(stats.maxHp * percent / 100)} HP`, '#d97083');
  },
  values(stats) {
    const d = this.config().puppet;
    return {
      maxHp: Math.round(stats.maxHp * d.hpPerBodyHp + stats.defense * d.hpPerDefense),
      attack: stats.attack * d.attackPerBodyAttack + stats.maxHp * d.attackPerBodyHp + stats.defense * d.attackPerDefense,
      defense: stats.defense * d.defensePerBodyDefense,
    };
  },
  spawn(w, stats, percent) {
    if (this.active(w) || !this.canPay(w, stats, percent)) return false;
    this.pay(w, stats, percent);
    const d = this.config().puppet;
    const a = WYD.allies.spawn(w, stats, d, 1, 'pup_thread');
    a.puppet = true;
    Object.assign(a, this.values(stats));
    a.hp = a.maxHp;
    w.puppetWasAlive = true;
    return true;
  },
  update(w, state, stats) {
    if (WYD.classes.id !== 'puppeteer' || w.player.dead) return;
    const a = this.active(w);
    if (a) {
      const v = this.values(stats);
      a.hp = Math.min(v.maxHp, a.hp + v.maxHp - a.maxHp);
      a.maxHp = v.maxHp;
      a.attack = v.attack * (1 + stats.skillDamage / 100);
      a.defense = v.defense * (a.guardUntil > w.time ? a.guardMult : 1);
      a.timeLeft = a.duration; // 戦闘中ずっといる。HPが尽きた場合のみ壊れる。
      return;
    }
    if (w.puppetWasAlive) {
      w.puppetWasAlive = false;
      w.puppetRespawnAt = w.time + this.config().respawnCooldown;
    }
    if (!w.enemies.some(e => e.hp > 0) || w.time < (w.puppetRespawnAt || 0)) return;
    this.spawn(w, stats, this.config().summonCost);
  },
  onHit(w, stats, a, damage) {
    const stitch = a.stitch;
    if (!stitch || stitch.until <= w.time || damage <= 0 || (a.nextStitchHeal || 0) > w.time) return;
    a.nextStitchHeal = w.time + stitch.interval;
    WYD.world.healPlayer(w, stats.maxHp, stats.maxHp * stitch.healPercent / 100, 'skill:pup_stitch');
  },
  cast(w, state, stats, s, lv) {
    if (WYD.classes.id !== 'puppeteer') return false;
    const p = w.player, a = this.active(w), mult = s.effectMult || 1;
    if (s.mode === 'thread') {
      if (!a) return this.spawn(w, stats, s.hpCost);
      if (a.hp >= a.maxHp || !this.canPay(w, stats, s.hpCost)) return false;
      this.pay(w, stats, s.hpCost);
      a.hp = Math.min(a.maxHp, a.hp + a.maxHp * (s.repairBase + s.repairPerLevel * (lv - 1)) * mult);
      return true;
    }
    if (!a || !this.canPay(w, stats, s.hpCost)) return false;
    const near = WYD.world.nearestEnemy(w, a);
    const nearby = radius => w.enemies.filter(e => e.hp > 0 && WYD.util.dist(a, e) <= radius + WYD.data.enemies[e.kind].radius);
    let targets = [];
    if (s.mode === 'pierce' || s.mode === 'cut') {
      if (!near || WYD.util.dist(a, near) > s.range) return false;
      targets = s.mode === 'pierce' ? w.enemies.filter(e => e.hp > 0 && WYD.util.dist(near, e) <= s.radius + WYD.data.enemies[e.kind].radius) : [near];
    } else if (['needles','bind','finale'].includes(s.mode)) {
      targets = nearby(s.radius);
      if (!targets.length) return false;
    } else if (s.mode === 'guard' && !nearby(s.range).length) return false;
    else if (s.mode === 'stitch' && !nearby(this.config().stitchRange).length) return false;
    else if (s.mode === 'swap' && p.hp / stats.maxHp * 100 > s.triggerHpPercent) return false;
    this.pay(w, stats, s.hpCost);
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
      const damage = a.attack * (s.damageBase + s.damagePerLevel * (lv - 1)) * mult;
      for (const e of targets) {
        WYD.world.playerHit(w, state, stats, e, damage);
        if (s.mode === 'bind' && e.hp > 0)
          e.stunTimer = Math.max(e.stunTimer || 0, (s.bindBase + s.bindPerLevel * (lv - 1)) * mult * (e.boss ? s.bossBindMult : 1));
      }
      if (s.mode === 'pierce') { a.x = near.x; a.y = near.y; }
      if (s.mode === 'finale') {
        a.hp = 0;
        w.puppetRespawnAt = w.time + this.config().respawnCooldown;
      }
    }
    w.effects.push({ type:'ring', x:a.x, y:a.y, radius:s.radius || 55, color:s.color, time:0, duration:0.35 });
    return true;
  },
};
WYD.world.skillHandlers.puppet = function(w, state, stats, s, lv) {
  return WYD.puppeteer.cast(w, state, stats, s, lv);
};
