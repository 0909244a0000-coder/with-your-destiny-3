// ゲームの中身：オート戦闘・敵の出現・ドロップ・レベルアップ。
window.WYD = window.WYD || {};

WYD.world = {
  create() {
    const map = WYD.data.map;
    return {
      player: {
        x: map.width / 2, y: map.height / 2,
        hp: null, dead: false, respawnTimer: 0,
        attackTimer: 0, skillCooldowns: {}, buff: null, haste: null, swing: 0,
      },
      fields: [],   // 地面に残る炎の陣など
      projectiles: [], // 敵が撃った弾
      enemies: [],
      drops: [],
      effects: [],
      texts: [],
      spawnTimer: 0,
      nextId: 1,
    };
  },

  // 1コマ分すすめる（dt = 経過秒数）
  update(w, state, dt) {
    const stats = WYD.stats.compute(state);
    const p = w.player;
    if (p.hp === null) p.hp = stats.maxHp;
    p.hp = Math.min(p.hp, stats.maxHp);

    this.updateEffects(w, dt);

    if (p.dead) {
      p.respawnTimer -= dt;
      if (p.respawnTimer <= 0) this.respawn(w, state, stats);
      return;
    }

    p.hp = Math.min(stats.maxHp, p.hp + stats.hpRegen * dt);
    if (p.buff) {
      p.buff.timeLeft -= dt;
      if (p.buff.timeLeft <= 0) p.buff = null;
    }
    if (p.haste) {
      p.haste.timeLeft -= dt;
      if (p.haste.timeLeft <= 0) p.haste = null;
    }
    this.updateFields(w, state, stats, dt);
    for (const id in p.skillCooldowns) p.skillCooldowns[id] = Math.max(0, p.skillCooldowns[id] - dt);

    this.updateSpawns(w, state, dt);
    this.updatePlayer(w, state, stats, dt);
    this.updateEnemies(w, state, stats, dt);
    if (!p.dead) this.updateProjectiles(w, state, stats, dt);
    this.updateDrops(w, state, dt);
  },

  // ---------- 敵の出現 ----------
  updateSpawns(w, state, dt) {
    const map = WYD.data.map;
    const area = this.area(state);
    w.spawnTimer -= dt;

    // 決まった数を倒したらボスが出る
    if (state.bossProgress >= area.killsForBoss && !w.enemies.some((e) => e.boss)) {
      state.bossProgress = 0;
      const boss = this.spawnEnemy(w, state, area.boss, this.farPosition(w));
      boss.boss = true;
      boss.slamTimer = WYD.data.enemies[area.boss].slam.interval;
      WYD.ui.log(`ボス「${WYD.data.enemies[area.boss].name}」が現れた！`, WYD.data.boss.nameColor);
      WYD.ui.markDirty();
    }

    if (w.spawnTimer > 0 || w.enemies.length >= map.maxEnemies) return;
    w.spawnTimer = map.spawnInterval;

    const pick = WYD.util.pickWeighted(area.enemies, (x) => x.weight);
    const e = this.spawnEnemy(w, state, pick.kind, this.farPosition(w));
    if (Math.random() < WYD.data.elites.chance) this.makeElite(e);
  },

  // 今いるエリアの設定
  area(state) {
    return WYD.data.areas.find((a) => a.id === state.area) || WYD.data.areas[0];
  },

  // プレイヤーから離れた場所を探す
  farPosition(w) {
    const map = WYD.data.map;
    let pos;
    for (let i = 0; i < 20; i++) {
      pos = { x: WYD.util.rand(30, map.width - 30), y: WYD.util.rand(30, map.height - 30) };
      if (WYD.util.dist(pos, w.player) >= map.spawnMinDistance) break;
    }
    return pos;
  },

  // 敵を1体出す（危険度に合わせて強くする）
  spawnEnemy(w, state, kind, pos) {
    const def = WYD.data.enemies[kind];
    const diff = WYD.data.difficulty;
    const d = state.difficulty - 1;
    const power = this.area(state).powerMult;
    const maxHp = Math.round(def.hp * (1 + diff.hpGrowth * d) * power);
    const e = {
      id: w.nextId++, kind, x: pos.x, y: pos.y,
      hp: maxHp, maxHp,
      attack: def.attack * (1 + diff.attackGrowth * d) * power,
      defense: def.defense * (1 + diff.defenseGrowth * d) * power,
      moveSpeedMult: 1,
      attackSpeedMult: 1,
      attackTimer: 1,
      hitFlash: 0,
      stunTimer: 0,
    };
    w.enemies.push(e);
    return e;
  },

  // 敵を精鋭にする（能力をランダムに選んで強くする）
  makeElite(e) {
    const E = WYD.data.elites;
    const u = WYD.util;
    const count = u.randInt(E.affixCount[0], E.affixCount[1]);
    const pool = E.affixes.slice();
    const affixes = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const a = u.pickWeighted(pool, (x) => x.weight);
      pool.splice(pool.indexOf(a), 1);
      affixes.push(a);
    }
    let hpMult = E.hpMult, attackMult = E.attackMult;
    for (const a of affixes) {
      hpMult *= a.hpMult || 1;
      attackMult *= a.attackMult || 1;
      e.defense *= a.defenseMult || 1;
      e.moveSpeedMult *= a.moveSpeedMult || 1;
      e.attackSpeedMult *= a.attackSpeedMult || 1;
    }
    e.maxHp = Math.round(e.maxHp * hpMult);
    e.hp = e.maxHp;
    e.attack *= attackMult;
    e.elite = { affixes: affixes.map((a) => a.id), summonTimer: 2 };
    e.name = affixes.map((a) => a.name).join("・") + "の" + WYD.data.enemies[e.kind].name;
  },

  eliteAffix(id) {
    return WYD.data.elites.affixes.find((a) => a.id === id);
  },

  hasAffix(e, id) {
    return !!(e.elite && e.elite.affixes.includes(id));
  },

  // 精鋭の能力（業火・眷属使い）を毎コマ動かす
  updateElite(w, state, e, dt) {
    const p = w.player;
    const burning = this.eliteAffix("burning");
    if (this.hasAffix(e, "burning") && !p.dead && WYD.util.dist(e, p) <= burning.auraRadius) {
      p.hp -= e.attack * burning.auraDamage * dt;
      if (p.hp <= 0) {
        this.playerDied(w);
        return;
      }
    }
    const summoner = this.eliteAffix("summoner");
    if (this.hasAffix(e, "summoner")) {
      e.elite.summonTimer -= dt;
      const alive = w.enemies.filter((x) => x.summonedBy === e.id).length;
      if (e.elite.summonTimer <= 0 && alive < summoner.summonMax) {
        e.elite.summonTimer = summoner.summonInterval;
        const map = WYD.data.map;
        const pos = {
          x: WYD.util.clamp(e.x + WYD.util.rand(-30, 30), 20, map.width - 20),
          y: WYD.util.clamp(e.y + WYD.util.rand(-30, 30), 20, map.height - 20),
        };
        const minion = this.spawnEnemy(w, state, summoner.summonKind, pos);
        minion.summonedBy = e.id;
        w.effects.push({ type: "ring", x: pos.x, y: pos.y, radius: 24, color: WYD.data.elites.color, time: 0, duration: 0.3 });
      }
    }
  },

  // ---------- プレイヤーの自動行動 ----------
  updatePlayer(w, state, stats, dt) {
    const p = w.player;
    const map = WYD.data.map;
    p.swing = Math.max(0, p.swing - dt);

    this.tryUseSkills(w, state, stats);

    const target = this.nearestEnemy(w, p);
    if (!target) {
      // 敵がいないときは真ん中へ戻る
      this.moveToward(p, { x: map.width / 2, y: map.height / 2 }, stats.moveSpeed * 0.5 * dt, 4);
      return;
    }

    const reach = WYD.data.player.attackRange + WYD.data.enemies[target.kind].radius;
    const d = WYD.util.dist(p, target);
    if (d > reach) {
      this.moveToward(p, target, stats.moveSpeed * dt, reach * 0.8);
    }

    p.attackTimer -= dt;
    if (d <= reach && p.attackTimer <= 0) {
      p.attackTimer = 1 / (stats.attackSpeed * (1 + (p.haste ? p.haste.percent : 0) / 100));
      p.swing = 0.15;
      p.swingTarget = { x: target.x, y: target.y };
      this.playerHit(w, state, stats, target, stats.attack);
      this.tryThunder(w, state, stats, target);
      // 固有能力：猿王ハヌマーンの籠手（剛力の間、周りにも当たる）
      const cleave = stats.powers.hasteCleave;
      if (cleave && p.haste) {
        for (const e of w.enemies.slice()) {
          if (e !== target && WYD.util.dist(target, e) <= cleave.radius) this.playerHit(w, state, stats, e, stats.attack * cleave.mult);
        }
      }
    }
  },

  tryUseSkills(w, state, stats) {
    const p = w.player;
    for (const id of WYD.data.skillOrder) {
      const lv = state.player.skills[id] || 0;
      if (lv <= 0 || !state.player.skillEnabled[id]) continue;
      if ((p.skillCooldowns[id] || 0) > 0) continue;
      const used = this.skillHandlers[id].call(this, w, state, stats, WYD.data.skills[id], lv);
      if (used) p.skillCooldowns[id] = WYD.data.skills[id].cooldown * (1 - stats.effects.cooldown / 100);
    }
  },

  // スキルごとの処理。使ったら true を返す
  skillHandlers: {
    whirl(w, state, stats, s, lv) {
      const p = w.player;
      const targets = w.enemies.filter((e) => WYD.util.dist(p, e) <= s.radius + WYD.data.enemies[e.kind].radius);
      if (targets.length < s.minTargets) return false;
      const mult = (s.damageBase + s.damagePerLevel * (lv - 1)) * (1 + stats.skillDamage / 100);
      for (const e of targets) {
        this.playerHit(w, state, stats, e, stats.attack * mult);
      }
      w.effects.push({ type: "ring", x: p.x, y: p.y, radius: s.radius, color: s.color, time: 0, duration: 0.35 });
      // 固有能力：火神アグニの腕輪（足元に炎の陣）
      const fire = stats.powers.whirlFire;
      if (fire) {
        w.fields.push({ x: p.x, y: p.y, radius: fire.radius, timeLeft: fire.duration, duration: fire.duration,
          tick: fire.tick, tickTimer: fire.tick, mult: fire.mult * (1 + stats.skillDamage / 100), color: fire.color });
      }
      return true;
    },
    vajra(w, state, stats, s, lv) {
      const p = w.player;
      if (p.hp / stats.maxHp * 100 > s.triggerHpPercent) return false;
      const healPct = (s.healPercentBase + s.healPercentPerLevel * (lv - 1)) * (1 + stats.skillDamage / 100);
      const heal = Math.round(stats.maxHp * healPct / 100);
      p.hp = Math.min(stats.maxHp, p.hp + heal);
      p.buff = { defense: s.defenseBase + s.defensePerLevel * (lv - 1), timeLeft: s.duration, color: s.color };
      this.addText(w, p.x, p.y - 24, `+${heal}`, "#7dff8a");
      return true;
    },
    // 敵から敵へ飛び移る円盤
    sudarshana(w, state, stats, s, lv) {
      const p = w.player;
      let cur = this.nearestEnemy(w, p);
      if (!cur || WYD.util.dist(p, cur) > s.range) return false;
      const bounce = stats.powers.chakraBounce;   // 固有能力：ヴィシュヌの円盤
      const maxTargets = Math.floor(s.targetsBase + s.targetsPerLevel * (lv - 1)) + (bounce ? bounce.extraTargets : 0);
      const mult = (s.damageBase + s.damagePerLevel * (lv - 1)) * (1 + stats.skillDamage / 100) *
        (bounce ? 1 + bounce.damagePercent / 100 : 1);
      const hitList = [];
      const points = [{ x: p.x, y: p.y }];
      while (cur && hitList.length < maxTargets) {
        hitList.push(cur);
        points.push({ x: cur.x, y: cur.y });
        let next = null, best = s.jumpRange;
        for (const e of w.enemies) {
          if (hitList.includes(e)) continue;
          const d = WYD.util.dist(cur, e);
          if (d <= best) { best = d; next = e; }
        }
        cur = next;
      }
      for (const e of hitList) this.playerHit(w, state, stats, e, stats.attack * mult);
      w.effects.push({ type: "chain", points, color: s.color, time: 0, duration: 0.3 });
      return true;
    },
    // 敵の多い場所に炎の陣を張る
    agni(w, state, stats, s, lv) {
      const p = w.player;
      let best = null, bestCount = 0;
      for (const e of w.enemies) {
        if (WYD.util.dist(p, e) > s.range) continue;
        const count = w.enemies.filter((x) => WYD.util.dist(e, x) <= s.radius).length;
        if (count > bestCount) { best = e; bestCount = count; }
      }
      if (!best) return false;
      const mult = (s.damageBase + s.damagePerLevel * (lv - 1)) * (1 + stats.skillDamage / 100);
      w.fields.push({ x: best.x, y: best.y, radius: s.radius, timeLeft: s.duration, duration: s.duration,
        tick: s.tick, tickTimer: 0, mult, color: s.color });
      return true;
    },
    // しばらく攻撃速度アップ
    hanuman(w, state, stats, s, lv) {
      const p = w.player;
      const near = w.enemies.some((e) => WYD.util.dist(p, e) <= s.triggerRange);
      if (!near) return false;
      p.haste = { percent: s.hasteBase + s.hastePerLevel * (lv - 1), timeLeft: s.duration, color: s.color };
      this.addText(w, p.x, p.y - 24, "剛力！", s.color);
      return true;
    },
    // 周りの敵を縛る
    nagapasha(w, state, stats, s, lv) {
      const p = w.player;
      const targets = w.enemies.filter((e) => WYD.util.dist(p, e) <= s.radius + WYD.data.enemies[e.kind].radius);
      if (targets.length < s.minTargets) return false;
      const bind = s.bindBase + s.bindPerLevel * (lv - 1);
      const mult = (s.damageBase + s.damagePerLevel * (lv - 1)) * (1 + stats.skillDamage / 100);
      for (const e of targets) {
        e.stunTimer = Math.max(e.stunTimer || 0, e.boss ? bind * s.bossBindMult : bind);
        this.playerHit(w, state, stats, e, stats.attack * mult);
      }
      w.effects.push({ type: "ring", x: p.x, y: p.y, radius: s.radius, color: s.color, time: 0, duration: 0.4 });
      return true;
    },
  },

  // 炎の陣：一定時間ごとに中の敵へダメージ
  updateFields(w, state, stats, dt) {
    for (const f of w.fields) {
      f.timeLeft -= dt;
      f.tickTimer -= dt;
      if (f.tickTimer > 0) continue;
      f.tickTimer = f.tick;
      for (const e of w.enemies.slice()) {
        if (WYD.util.dist(f, e) <= f.radius) this.playerHit(w, state, stats, e, stats.attack * f.mult);
      }
    }
    w.fields = w.fields.filter((f) => f.timeLeft > 0);
  },

  // ---------- 敵の行動 ----------
  updateEnemies(w, state, stats, dt) {
    const p = w.player;
    for (const e of w.enemies.slice()) {
      if (e.hp <= 0) continue;
      const def = WYD.data.enemies[e.kind];
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.stunTimer > 0) {
        e.stunTimer -= dt;   // 縛られている間は何もできない
        continue;
      }
      if (e.elite) {
        this.updateElite(w, state, e, dt);
        if (p.dead) return;
      }
      const reach = def.range + WYD.data.player.radius;
      const d = WYD.util.dist(e, p);
      if (def.slam && this.updateSlam(w, e, def.slam, stats, d, dt)) {
        if (p.dead) return;
        continue;   // 大技の準備中は動かない
      }
      if (def.ranged) {
        this.updateRanged(w, e, def, d, dt);
        continue;
      }
      if (d > reach) this.moveToward(e, p, def.moveSpeed * e.moveSpeedMult * dt, reach * 0.8);

      e.attackTimer -= dt;
      if (d <= reach && e.attackTimer <= 0) {
        e.attackTimer = 1 / (def.attackSpeed * e.attackSpeedMult);
        const defense = stats.defense + (p.buff ? p.buff.defense : 0);
        const hit = this.calcDamage(e.attack, defense, 0);
        p.hp -= hit.damage;
        this.addText(w, p.x, p.y - 20, `-${hit.damage}`, "#ff6b6b");
        // 精鋭の能力：吸血
        if (this.hasAffix(e, "vampiric")) {
          e.hp = Math.min(e.maxHp, e.hp + hit.damage * this.eliteAffix("vampiric").lifestealPercent / 100);
        }
        this.reflect(w, state, stats, e, hit.damage);
        if (p.hp <= 0) {
          this.playerDied(w);
          return;
        }
      }
    }
    // 敵同士が重なりすぎないように少し押し合う
    for (let i = 0; i < w.enemies.length; i++) {
      for (let j = i + 1; j < w.enemies.length; j++) {
        const a = w.enemies[i], b = w.enemies[j];
        const min = WYD.data.enemies[a.kind].radius + WYD.data.enemies[b.kind].radius;
        const d = WYD.util.dist(a, b);
        if (d > 0 && d < min) {
          const push = (min - d) / 2;
          const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d;
          a.x += nx * push; a.y += ny * push;
          b.x -= nx * push; b.y -= ny * push;
        }
      }
    }
  },

  // 受けたダメージを敵に返す（特殊効果：ナーガの鱗、固有能力：インドラの金剛環）
  reflect(w, state, stats, e, damage) {
    let percent = stats.effects.thorns;
    const vt = stats.powers.vajraThorns;
    if (vt && w.player.buff) percent += vt.percent;
    const back = Math.round(damage * percent / 100);
    if (back > 0) this.damageEnemy(w, state, e, back, false);
  },

  // まわりの敵にまとめてダメージ（爆発）
  explode(w, state, stats, x, y, radius, mult, color) {
    w.effects.push({ type: "ring", x, y, radius, color, time: 0, duration: 0.3 });
    for (const e of w.enemies.slice()) {
      if (WYD.util.dist({ x, y }, e) <= radius) this.playerHit(w, state, stats, e, stats.attack * mult);
    }
  },

  // 遠くから撃つ敵：距離をとりながら、届いたら弾を撃つ
  updateRanged(w, e, def, d, dt) {
    const p = w.player;
    const r = def.ranged;
    if (d > r.keepDistance) this.moveToward(e, p, def.moveSpeed * e.moveSpeedMult * dt, r.keepDistance);
    e.attackTimer -= dt;
    if (d <= r.range && e.attackTimer <= 0) {
      e.attackTimer = 1 / (def.attackSpeed * e.attackSpeedMult);
      w.projectiles.push({
        x: e.x, y: e.y,
        vx: (p.x - e.x) / d * r.speed, vy: (p.y - e.y) / d * r.speed,
        size: r.size, color: r.color, attack: e.attack, ownerId: e.id,
        life: WYD.data.map.projectileLifetime,
      });
    }
  },

  // 弾を動かして、プレイヤーに当たったらダメージ
  updateProjectiles(w, state, stats, dt) {
    const p = w.player;
    const map = WYD.data.map;
    for (const b of w.projectiles) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < 0 || b.y < 0 || b.x > map.width || b.y > map.height) b.life = 0;
      if (b.life <= 0 || p.dead) continue;
      if (WYD.util.dist(b, p) > WYD.data.player.radius + b.size) continue;
      b.life = 0;
      const defense = stats.defense + (p.buff ? p.buff.defense : 0);
      const hit = this.calcDamage(b.attack, defense, 0);
      p.hp -= hit.damage;
      this.addText(w, p.x, p.y - 20, `-${hit.damage}`, "#ff6b6b");
      // 特殊効果：ナーガの鱗（撃った敵が生きていれば返す）
      const owner = w.enemies.find((e) => e.id === b.ownerId);
      if (owner) this.reflect(w, state, stats, owner, hit.damage);
      if (p.hp <= 0) this.playerDied(w);
    }
    w.projectiles = w.projectiles.filter((b) => b.life > 0);
  },

  // ボスの大技：予告の輪が出たあと、範囲内にいると大ダメージ。準備中なら true を返す
  updateSlam(w, e, slam, stats, d, dt) {
    const p = w.player;
    if (e.slamCharge != null) {
      e.slamCharge -= dt;
      if (e.slamCharge > 0) return true;
      e.slamCharge = null;
      w.effects.push({ type: "ring", x: e.x, y: e.y, radius: slam.radius, color: WYD.data.boss.warnColor, time: 0, duration: 0.4 });
      if (WYD.util.dist(e, p) <= slam.radius) {
        const defense = stats.defense + (p.buff ? p.buff.defense : 0);
        const hit = this.calcDamage(e.attack * slam.damageMult, defense, 0);
        p.hp -= hit.damage;
        this.addText(w, p.x, p.y - 20, `-${hit.damage}`, "#ff3030");
        if (p.hp <= 0) this.playerDied(w);
      }
      return true;
    }
    e.slamTimer -= dt;
    if (e.slamTimer <= 0 && d <= slam.radius) {
      e.slamTimer = slam.interval;
      e.slamCharge = slam.windup;
      e.slamWindup = slam.windup;
      return true;
    }
    return false;
  },

  // ---------- 落ちている装備 ----------
  updateDrops(w, state, dt) {
    const D = WYD.data.items;
    for (const drop of w.drops) {
      drop.age += dt;
      if (drop.age < D.pickupDelay || drop.picked) continue;
      if (WYD.inventory.add(state, drop.item)) {
        drop.picked = true;
        const r = WYD.loot.rarityInfo(drop.item.rarity);
        WYD.ui.log(`${drop.item.name}（${r.name}）を拾った`, r.color);
        WYD.ui.markDirty();
      } else if (!drop.warned) {
        drop.warned = true;
        WYD.ui.log("持ち物がいっぱいで拾えない！", "#ff6b6b");
      }
    }
    w.drops = w.drops.filter((d) => !d.picked && d.age < D.groundLifetime);
  },

  updateEffects(w, dt) {
    for (const ef of w.effects) ef.time += dt;
    w.effects = w.effects.filter((ef) => ef.time < ef.duration);
    for (const t of w.texts) { t.time += dt; t.y -= 30 * dt; }
    w.texts = w.texts.filter((t) => t.time < 0.8);
  },

  // ---------- 共通の処理 ----------
  calcDamage(attack, defense, critChance, critMultiplier) {
    const C = WYD.data.combat;
    let dmg = attack - defense * C.defenseFactor;
    dmg *= 1 + WYD.util.rand(-C.damageVariance, C.damageVariance);
    const crit = Math.random() * 100 < critChance;
    if (crit) dmg *= critMultiplier || WYD.data.player.critMultiplier;
    return { damage: Math.max(C.minDamage, Math.round(dmg)), crit };
  },

  // プレイヤーの攻撃が当たったとき（特殊効果：カーリーの憤怒・ラクタビージャの渇き）
  playerHit(w, state, stats, e, attack) {
    if (e.hp <= 0) return;
    const p = w.player;
    const fx = stats.effects;
    const wrath = WYD.loot.effectInfo("wrath");
    if (fx.wrath > 0 && wrath && p.hp / stats.maxHp * 100 <= wrath.hpPercent) attack *= 1 + fx.wrath / 100;
    const hit = this.calcDamage(attack, e.defense, stats.critChance, stats.critMultiplier);
    this.damageEnemy(w, state, e, hit.damage, hit.crit);
    if (fx.lifesteal > 0 && !p.dead) {
      p.hp = Math.min(stats.maxHp, p.hp + hit.damage * fx.lifesteal / 100);
    }
  },

  // 特殊効果：インドラの雷（通常攻撃のときに確率で発動）
  tryThunder(w, state, stats, e) {
    const chance = stats.effects.thunder;
    if (e.hp <= 0 || chance <= 0 || Math.random() * 100 >= chance) return;
    const def = WYD.loot.effectInfo("thunder");
    w.effects.push({ type: "bolt", x: e.x, y: e.y, color: def.color, time: 0, duration: 0.25 });
    const hit = this.calcDamage(stats.attack * def.power, e.defense, 0);
    this.damageEnemy(w, state, e, hit.damage, false);
  },

  damageEnemy(w, state, e, damage, crit) {
    if (e.hp <= 0) return;
    e.hp -= damage;
    e.hitFlash = 0.1;
    this.addText(w, e.x, e.y - 16, crit ? `${damage}!` : `${damage}`, crit ? "#ffd447" : "#ffffff");
    if (e.hp <= 0) this.enemyDied(w, state, e);
  },

  enemyDied(w, state, e) {
    const def = WYD.data.enemies[e.kind];
    const diff = WYD.data.difficulty;
    const d = state.difficulty - 1;
    w.enemies = w.enemies.filter((x) => x !== e);

    const area = this.area(state);
    const expMult = (e.elite ? WYD.data.elites.expMult : 1) * area.powerMult;
    this.gainExp(state, Math.round(def.exp * (1 + diff.expGrowth * d) * expMult));

    if (e.boss) {
      this.bossDefeated(state, area, def);
    } else if (!w.enemies.some((x) => x.boss)) {
      state.bossProgress = Math.min(area.killsForBoss, state.bossProgress + 1);
    }

    // 特殊効果：チャームンダーの饗宴（倒すとHP回復）
    const stats = WYD.stats.compute(state);
    const p = w.player;
    if (stats.effects.killHeal > 0 && !p.dead) {
      const heal = Math.round(stats.maxHp * stats.effects.killHeal / 100);
      p.hp = Math.min(stats.maxHp, p.hp + heal);
      this.addText(w, p.x, p.y - 24, `+${heal}`, "#7dff8a");
    }

    // 固有能力：蛇王ヴァースキの冠（縛られた敵が爆発）／カーリーの髑髏の数珠（死体が爆発）
    const be = stats.powers.bindExplode;
    if (be && e.stunTimer > 0 && !p.dead) this.explode(w, state, stats, e.x, e.y, be.radius, be.mult, be.color);
    const kn = stats.powers.killNova;
    if (kn && !p.dead && Math.random() * 100 < kn.chance) this.explode(w, state, stats, e.x, e.y, kn.radius, kn.mult, kn.color);

    // 最高危険度で倒すと、次の危険度に近づく
    if (state.difficulty === state.maxDifficulty && state.maxDifficulty < diff.max) {
      state.killsAtMax++;
      if (state.killsAtMax >= diff.killsToUnlockNext) {
        state.maxDifficulty++;
        state.killsAtMax = 0;
        WYD.ui.log(`危険度 ${state.maxDifficulty} が解放された！`, "#ff8a2a");
      }
      WYD.ui.markDirty();
    }

    // 精鋭は必ず数個落とし、レアも出やすい
    const E = WYD.data.elites;
    const bonus = def.rarityBonus * (1 + diff.rarityGrowth * d) * (e.elite ? E.rarityBonusMult : 1);
    let count = e.elite ? E.dropCount : (Math.random() < def.dropChance ? 1 : 0);
    if (e.boss) count = WYD.data.boss.dropCount;
    if (e.elite) WYD.ui.log(`精鋭「${e.name}」を倒した！`, E.color);
    // ボスと精鋭は、まれにユニーク装備を落とす
    const U = WYD.data.uniques;
    const uniqueChance = e.boss ? U.chanceFromBoss : e.elite ? U.chanceFromElite : 0;
    if (Math.random() < uniqueChance) {
      const item = WYD.loot.createUnique(state, state.difficulty + area.itemLevelBonus);
      w.drops.push({ x: e.x, y: e.y, item, age: 0 });
      WYD.ui.log(`ユニーク装備「${item.name}」が落ちた！`, U.color);
    }
    for (let i = 0; i < count; i++) {
      const item = WYD.loot.create(state, state.difficulty + area.itemLevelBonus, bonus);
      if (item.rarity === "normal" && state.settings.skipNormal) continue;
      const spread = count > 1 ? 10 + count * 4 : 0;
      w.drops.push({ x: e.x + WYD.util.rand(-spread, spread), y: e.y + WYD.util.rand(-spread, spread), item, age: 0 });
    }
  },

  // ボスを倒したら次のエリアを解放する
  bossDefeated(state, area, def) {
    WYD.ui.log(`ボス「${def.name}」を倒した！`, WYD.data.boss.nameColor);
    const list = WYD.data.areas;
    const next = list[list.indexOf(area) + 1];
    if (next && !state.unlockedAreas.includes(next.id)) {
      state.unlockedAreas.push(next.id);
      WYD.ui.log(`新しいエリア「${next.name}」に行けるようになった！`, "#ff8a2a");
    }
    WYD.ui.changed();
  },

  gainExp(state, amount) {
    const pl = state.player;
    const P = WYD.data.player;
    if (pl.level >= P.maxLevel) return;
    pl.exp += amount;
    while (pl.level < P.maxLevel && pl.exp >= WYD.stats.expToNext(pl.level)) {
      pl.exp -= WYD.stats.expToNext(pl.level);
      pl.level++;
      pl.skillPoints += P.skillPointsPerLevel;
      WYD.ui.log(`レベルアップ！ Lv${pl.level}（スキルポイント+${P.skillPointsPerLevel}）`, "#7dff8a");
      WYD.ui.onLevelUp();
    }
    if (pl.level >= P.maxLevel) pl.exp = 0;
    WYD.ui.markDirty();
  },

  playerDied(w) {
    const p = w.player;
    p.dead = true;
    p.hp = 0;
    p.respawnTimer = WYD.data.player.respawnSeconds;
    WYD.ui.log("倒れてしまった…", "#ff6b6b");
  },

  respawn(w, state, stats) {
    const map = WYD.data.map;
    const p = w.player;
    this.keepBoss(w, state);
    p.dead = false;
    p.hp = stats.maxHp;
    p.x = map.width / 2;
    p.y = map.height / 2;
    p.buff = null;
    p.haste = null;
    w.fields = [];
    w.projectiles = [];
    w.enemies = [];
    w.spawnTimer = 1;
  },

  // 危険度を変えたら敵を入れ替える
  // keepBoss = true のときは、いたボスがすぐまた出てくる（エリアを変えたときは false）
  resetEnemies(w, state, keepBoss) {
    if (keepBoss) this.keepBoss(w, state);
    w.enemies = [];
    w.projectiles = [];
    w.spawnTimer = 0.5;
  },

  // 敵を消す前に呼ぶ：ボスがいたら、すぐまた出てくるようにする
  keepBoss(w, state) {
    if (w.enemies.some((e) => e.boss)) state.bossProgress = this.area(state).killsForBoss;
  },

  nearestEnemy(w, from) {
    let best = null, bestD = Infinity;
    for (const e of w.enemies) {
      const d = WYD.util.dist(from, e);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  },

  moveToward(obj, target, step, stopAt) {
    const d = WYD.util.dist(obj, target);
    if (d <= stopAt) return;
    const s = Math.min(step, d - stopAt);
    obj.x += (target.x - obj.x) / d * s;
    obj.y += (target.y - obj.y) / d * s;
  },

  addText(w, x, y, text, color) {
    w.texts.push({ x: x + WYD.util.rand(-6, 6), y, text, color, time: 0 });
  },
};
