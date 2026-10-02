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
      hazards: [],  // 少しして爆発する場所（精鋭の「爆砕」）
      pools: [],    // 毒の沼（ボスの技）
      allies: [],   // 味方の手下（ネクロマンサーの骸骨。src/allies.js）
      traps: [],    // 置いた罠（アサシン。src/traps.js）
      projectiles: [], // 敵が撃った弾
      particles: [],   // エフェクトの粒（src/fx.js）
      bolts: [],       // 主人公が撃った火の玉（遠くから攻撃する職業）
      shake: null,     // 画面の揺れ
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

    w.time = (w.time || 0) + dt;   // 絵の動きに使う時計
    this.trackMotion(w, dt);
    this.updateEffects(w, dt);
    for (const n of w.notices || []) n.time += dt;
    if (w.notices) w.notices = w.notices.filter((n) => n.time < WYD.data.map.notice.duration);
    WYD.offline.tick(state, dt);
    WYD.trial.tick(w, state, dt);
    WYD.records.add(state, "playSeconds", dt);

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
    WYD.lgems.update(w, dt);
    WYD.forms.update(w, dt);
    WYD.shrines.update(w, state, stats, dt);
    WYD.breach.update(w, state, stats, dt);
    // オーラの輪（ONのオーラだけ残る）
    for (const id in p.auras || {}) {
      p.auras[id].timeLeft -= dt;
      if (p.auras[id].timeLeft <= 0) delete p.auras[id];
    }
    this.updateFields(w, state, stats, dt);
    this.updateHazards(w, stats, dt);
    this.updatePools(w, dt);
    if (p.chill > 0) p.chill = Math.max(0, p.chill - dt);
    for (const id in p.skillCooldowns) p.skillCooldowns[id] = Math.max(0, p.skillCooldowns[id] - dt);

    this.updateFloors(w, state, dt);
    this.updateSpawns(w, state, dt);
    this.updatePlayer(w, state, stats, dt);
    this.updateBolts(w, state, stats, dt);
    WYD.mercenary.update(w, state, stats, dt);
    WYD.allies.update(w, state, stats, dt);
    WYD.traps.update(w, state, stats, dt);
    this.updateEnemies(w, state, stats, dt);
    if (!p.dead) this.updateProjectiles(w, state, stats, dt);
    this.updateDrops(w, state, dt);
  },

  // 絵の動きのために、動いた量・向き・攻撃してからの時間を覚えておく
  trackMotion(w, dt) {
    for (const o of [w.player].concat(w.enemies)) {
      if (o.lastX != null && dt > 0) {
        const vx = (o.x - o.lastX) / dt, vy = (o.y - o.lastY) / dt;
        o.moving = Math.hypot(vx, vy) > 5;
        if (Math.abs(vx) > 5) o.face = vx > 0 ? 1 : -1;
      }
      o.lastX = o.x;
      o.lastY = o.y;
      o.atkAnim = Math.max(0, (o.atkAnim || 0) - dt);
      o.slamAfter = Math.max(0, (o.slamAfter || 0) - dt);
    }
  },

  // ---------- 敵の出現 ----------
  updateSpawns(w, state, dt) {
    const map = WYD.data.map;
    if (WYD.trial.active(state)) return WYD.trial.updateSpawns(w, state, dt);
    const area = this.area(state);
    w.spawnTimer -= dt;

    const bossRoom = this.isBossRoom(state);
    // ボスの間：入ってすこしたつとボスが出る
    if (bossRoom && !w.bossDone && !w.enemies.some((e) => e.boss)) {
      w.bossTimer = (w.bossTimer == null ? WYD.data.boss.bossAppearDelay : w.bossTimer) - dt;
      if (w.bossTimer <= 0) {
        w.bossTimer = null;
        const boss = this.spawnEnemy(w, state, area.boss, this.farPosition(w));
        boss.boss = true;
        // 何度も倒されていたら、すこし弱くする
        const B = WYD.data.boss;
        const ease = Math.min(B.easeMax, B.easePerDeath * (state.bossDeaths[area.id] || 0));
        if (ease > 0) {
          boss.maxHp = Math.round(boss.maxHp * (1 - ease));
          boss.hp = boss.maxHp;
          boss.attack *= 1 - ease;
          WYD.ui.log(`（何度も挑んだので、ボスが弱っている：-${Math.round(ease * 100)}%）`, "#c9b48a");
        }
        const slam = WYD.data.enemies[area.boss].slam;   // 大技のないボスもいる
        if (slam) boss.slamTimer = slam.interval;
        WYD.ui.log(`ボス「${WYD.data.enemies[area.boss].name}」が現れた！`, WYD.data.boss.nameColor);
        WYD.sound.play("bossAppear");
        WYD.ui.markDirty();
      }
    }

    const maxEnemies = bossRoom ? WYD.data.boss.bossRoomMaxEnemies : map.maxEnemies;
    if (w.spawnTimer > 0 || w.enemies.length >= maxEnemies) return;
    w.spawnTimer = map.spawnInterval;

    // まれに宝物ゴブリン（同時に1体まで、ボスの間には出ない）
    const G = WYD.data.goblin;
    if (!bossRoom && Math.random() < G.chance * WYD.season.mult(state, "goblinMult") && !w.enemies.some((x) => WYD.data.enemies[x.kind].treasure)) {
      const g = this.spawnEnemy(w, state, "goblin", this.farPosition(w));
      g.fleeTimer = G.fleeTime;
      WYD.ui.notice("宝物ゴブリンが現れた！ 逃げられる前に倒せ！", G.color);
      WYD.sound.play("rareDrop");
      return;
    }
    const pick = WYD.util.pickWeighted(area.enemies, (x) => x.weight);
    const e = this.spawnEnemy(w, state, pick.kind, this.farPosition(w));
    if (Math.random() < WYD.data.elites.chance * WYD.season.mult(state, "eliteMult")) this.makeElite(e);
  },

  // 今いるエリアの設定
  area(state) {
    if (WYD.trial.active(state)) return WYD.trial.area(state);
    return WYD.data.areas.find((a) => a.id === state.area) || WYD.data.areas[0];
  },

  // 落ちる装備のアイテムレベル
  itemLevel(state) {
    return WYD.trial.active(state) ? WYD.trial.itemLevel(state) : state.difficulty + this.area(state).itemLevelBonus;
  },

  // 今いるのがボスの間か（ふつうの階の次）
  isBossRoom(state) {
    if (WYD.trial.active(state)) return false;
    return state.floor > this.area(state).floors;
  },

  // 今いる階の名前（例：地下2階、ボスの間）
  floorName(state) {
    if (WYD.trial.active(state)) return `段階${state.trialRun.level}`;
    return this.isBossRoom(state) ? "ボスの間" : `地下${state.floor}階`;
  },

  // 深い階ほど敵が強い
  floorPower(state) {
    if (WYD.trial.active(state)) return 1;
    return 1 + WYD.data.boss.floorPowerStep * (state.floor - 1);
  },

  // 階の移り変わり：数を倒したら降りる、ボスを倒したらしばらくして地下1階へ
  updateFloors(w, state, dt) {
    if (w.banner) {
      w.banner.time += dt;
      if (w.banner.time > 2.5) w.banner = null;
    }
    if (w.descendNext && !w.breach) {   // 裂け目が開いている間は、閉じてから降りる
      w.descendNext = false;
      this.changeFloor(w, state, 1);
    }
    if (w.returnTimer != null) {
      w.returnTimer -= dt;
      if (w.returnTimer <= 0) {
        w.returnTimer = null;
        this.changeFloor(w, state, 1 - state.floor);
      }
    }
  },

  // 次の階へ降りる（delta = -1 なら上がる）
  changeFloor(w, state, delta) {
    const area = this.area(state);
    state.floor = WYD.util.clamp(state.floor + delta, 1, area.floors + 1);
    w.enemies = [];
    w.projectiles = [];
    w.traps = [];
    w.fields = [];
    w.hazards = [];
    w.pools = [];
    w.drops = w.drops.filter((d) => ["unique", "set", "legend"].includes(d.item.rarity));
    w.spawnTimer = 1;
    w.bossTimer = null;
    w.bossDone = false;
    w.banner = { text: `${area.name}　${this.floorName(state)}`, time: 0 };
    WYD.ui.log(`${this.floorName(state)}へ${delta > 0 ? "降りた" : "もどった"}`, "#c9b48a");
    WYD.ui.markDirty();
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
    const d = WYD.trial.active(state) ? 0 : state.difficulty - 1;   // 試練は危険度ではなく段階で強さが決まる
    const power = this.area(state).powerMult * this.floorPower(state);
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
    WYD.daily.modifyEnemy(state, e);   // 日替わりの試練の条件
    // 季節のルール
    e.maxHp = Math.round(e.maxHp * WYD.season.mult(state, "enemyHp"));
    e.hp = e.maxHp;
    e.attack *= WYD.season.mult(state, "enemyAttack");
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

  // 精鋭の能力（業火・眷属使い・守護・瞬身）を毎コマ動かす
  updateElite(w, state, e, dt) {
    const p = w.player;
    if (this.hasAffix(e, "shielding")) {
      const A = this.eliteAffix("shielding");
      e.elite.shieldCycle = (e.elite.shieldCycle == null ? A.interval * Math.random() : e.elite.shieldCycle) + dt;
      if (e.elite.shieldCycle >= A.interval) e.elite.shieldCycle = 0;
      e.shielded = e.elite.shieldCycle < A.duration;
    }
    if (this.hasAffix(e, "blink") && !p.dead && !(e.stunTimer > 0)) {
      const A = this.eliteAffix("blink");
      e.elite.blinkTimer = (e.elite.blinkTimer == null ? A.interval : e.elite.blinkTimer) - dt;
      if (e.elite.blinkTimer <= 0 && WYD.util.dist(e, p) > A.minDistance) {
        e.elite.blinkTimer = A.interval;
        const map = WYD.data.map;
        w.effects.push({ type: "ring", x: e.x, y: e.y, radius: 26, color: A.color, time: 0, duration: 0.3 });
        const ang = Math.random() * Math.PI * 2;
        e.x = WYD.util.clamp(p.x + Math.cos(ang) * A.landDistance, 20, map.width - 20);
        e.y = WYD.util.clamp(p.y + Math.sin(ang) * A.landDistance, 20, map.height - 20);
        w.effects.push({ type: "ring", x: e.x, y: e.y, radius: 26, color: A.color, time: 0, duration: 0.3 });
      }
    }
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

  // 爆砕：時間がたったら爆発し、輪の中にいればダメージ
  updateHazards(w, stats, dt) {
    const p = w.player;
    for (const h of w.hazards) {
      h.timer -= dt;
      if (h.timer > 0) continue;
      w.effects.push({ type: "shock", x: h.x, y: h.y, radius: h.radius, color: h.color, time: 0, duration: 0.45 });
      WYD.fx.shake(w, WYD.data.fx.shakeEliteDeath);
      WYD.sound.play("slam");
      if (!p.dead && WYD.util.dist(h, p) <= h.radius) {
        const defense = stats.defense + (p.buff ? p.buff.defense : 0);
        const hit = this.calcDamage(h.damage, defense, 0);
        p.hp -= hit.damage;
        this.addText(w, p.x, p.y - 20, `-${hit.damage}`, "#ff3030");
        if (p.hp <= 0) this.playerDied(w);
      }
    }
    w.hazards = w.hazards.filter((h) => h.timer > 0);
  },

  // 爆発の輪から逃げる先：いろいろな向きを試し、画面の中で輪からいちばん遠くなる所
  escapePoint(p, h) {
    const map = WYD.data.map;
    const dirs = WYD.data.player.escapeDirections;
    const need = h.radius + WYD.data.player.radius * 2;
    let best = null, bestD = -1;
    for (let i = 0; i < dirs; i++) {
      const ang = (i / dirs) * Math.PI * 2;
      const q = {
        x: WYD.util.clamp(p.x + Math.cos(ang) * need, 20, map.width - 20),
        y: WYD.util.clamp(p.y + Math.sin(ang) * need, 20, map.height - 20),
      };
      const d = WYD.util.dist(q, h);
      if (d > bestD) { bestD = d; best = q; }
    }
    return best;
  },

  // ---------- プレイヤーの自動行動 ----------
  updatePlayer(w, state, stats, dt) {
    const p = w.player;
    const map = WYD.data.map;
    p.swing = Math.max(0, p.swing - dt);

    this.tryUseSkills(w, state, stats);

    // 精鋭の「氷結」で遅くなっている
    const slow = p.chill > 0 ? this.eliteAffix("frozen").slowMult : 1;
    dt *= slow;
    // 爆発の輪の中にいたら、まず外へ逃げる
    const danger = w.hazards.find((h) => WYD.util.dist(h, p) < h.radius + WYD.data.player.radius) ||
      w.pools.find((h) => WYD.util.dist(h, p) < h.radius + WYD.data.player.radius);
    // 突進の予告の線の上にいたら、横へよける
    const PR = WYD.data.player.radius;
    for (const e of w.enemies) {
      const c = e.charging;
      if (!c || c.phase !== "windup") continue;
      const dx = c.to.x - c.from.x, dy = c.to.y - c.from.y;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - c.from.x) * dx + (p.y - c.from.y) * dy) / len2));
      const qx = c.from.x + dx * t, qy = c.from.y + dy * t;
      const dist = Math.hypot(p.x - qx, p.y - qy);
      if (dist >= c.width + PR) continue;
      // 線と直角の向き（今いる側）へ逃げる
      const len = Math.sqrt(len2);
      let nx = -dy / len, ny = dx / len;
      if ((p.x - qx) * nx + (p.y - qy) * ny < 0) { nx = -nx; ny = -ny; }
      const map = WYD.data.map;
      const tx = p.x + nx * (c.width + PR * 2), ty = p.y + ny * (c.width + PR * 2);
      // 壁ぎわで逃げられないときは反対側へ
      const ok = tx > 20 && tx < map.width - 20 && ty > 20 && ty < map.height - 20;
      this.moveToward(p, ok ? { x: tx, y: ty } : { x: p.x - nx * 200, y: p.y - ny * 200 }, stats.moveSpeed * dt, 0);
      return;
    }
    if (danger) {
      // 逃げる先は、爆発ごとに1回だけ決める（壁ぎわでも輪の外に出られる所）
      if (!danger.escape) danger.escape = this.escapePoint(p, danger);
      this.moveToward(p, danger.escape, stats.moveSpeed * dt, 0);
      return;
    }

    // 宝物ゴブリンがいれば、まずそれを追いかける
    const target = w.enemies.find((e) => WYD.data.enemies[e.kind].treasure) || this.nearestEnemy(w, p);
    // 祠が近くにあれば、先に触りに行く
    const shrine = WYD.shrines.goal(w, target);
    if (shrine) {
      this.moveToward(p, shrine, stats.moveSpeed * dt, 0);
      return;
    }
    if (!target) {
      // 敵がいないときは真ん中へ戻る
      this.moveToward(p, { x: map.width / 2, y: map.height / 2 }, stats.moveSpeed * 0.5 * dt, 4);
      return;
    }

    const ranged = WYD.data.player.rangedAttack;
    const reach = ranged ? ranged.range : WYD.data.player.attackRange + WYD.data.enemies[target.kind].radius;
    const d = WYD.util.dist(p, target);
    if (ranged) {
      // 遠くから撃つ職業：近づきすぎたら下がり、遠すぎたら近づく
      if (d > ranged.range * 0.9) this.moveToward(p, target, stats.moveSpeed * dt, ranged.range * 0.8);
      else if (d < ranged.keepDistance) this.moveAway(p, target, stats.moveSpeed * 0.8 * dt);
    } else if (d > reach) {
      this.moveToward(p, target, stats.moveSpeed * dt, reach * 0.8);
    }

    p.attackTimer -= dt;
    if (d <= reach && p.attackTimer <= 0) {
      p.attackTimer = 1 / (stats.attackSpeed * (1 + (p.haste ? p.haste.percent : 0) / 100) * WYD.lgems.attackSpeedMult(w, state));
      p.atkAnim = WYD.data.anim.attack.time;
      p.face = target.x >= p.x ? 1 : -1;
      p.swingTarget = { x: target.x, y: target.y };
      if (ranged) {
        // 火の玉を撃つ（当たったときに通常攻撃と同じ処理をする）
        w.bolts.push({ x: p.x, y: p.y - 10, targetId: target.id, tx: target.x, ty: target.y });
        return;
      }
      p.swing = 0.15;
      WYD.vfx.spawn(w, "slash", target.x, target.y, { angle: Math.atan2(target.y - p.y, target.x - p.x) });
      this.playerHit(w, state, stats, target, stats.attack);
      this.tryThunder(w, state, stats, target);
      // 固有能力：狂王の籠手（狂戦士の怒りの間、周りにも当たる）
      const cleave = stats.powers.hasteCleave;
      if (cleave && p.haste) {
        for (const e of w.enemies.slice()) {
          if (e !== target && WYD.util.dist(target, e) <= cleave.radius) this.playerHit(w, state, stats, e, stats.attack * cleave.mult);
        }
      }
    }
  },

  // 主人公の火の玉を動かす。狙った敵を追いかけ、届いたら当たる
  updateBolts(w, state, stats, dt) {
    const R = WYD.data.player.rangedAttack;
    if (!R) return;
    for (const b of w.bolts) {
      const e = w.enemies.find((x) => x.id === b.targetId);
      if (e) { b.tx = e.x; b.ty = e.y; }
      const d = Math.hypot(b.tx - b.x, b.ty - b.y);
      const step = R.speed * dt;
      if (d <= step + 4) {
        b.done = true;
        if (e && e.hp > 0) {
          this.playerHit(w, state, stats, e, stats.attack);
          this.tryThunder(w, state, stats, e);
        }
        WYD.fx.burst(w, b.tx, b.ty, { ...WYD.data.fx.hit, count: 8 }, R.color, { glow: true });
        continue;
      }
      b.x += (b.tx - b.x) / d * step;
      b.y += (b.ty - b.y) / d * step;
      if (Math.random() < 0.6) WYD.fx.burst(w, b.x, b.y, { ...WYD.data.fx.ember, count: 1, life: 0.3 }, R.color, { glow: true });
    }
    w.bolts = w.bolts.filter((b) => !b.done);
  },

  tryUseSkills(w, state, stats) {
    const p = w.player;
    for (const id of WYD.data.skillOrder) {
      const lv = state.player.skills[id] || 0;
      if (lv <= 0 || !state.player.skillEnabled[id]) continue;
      if ((p.skillCooldowns[id] || 0) > 0) continue;
      this.castingId = id;
      // スキルの型（ルーン）を反映した数値と、おまけの効果
      const def = WYD.runes.effectiveDef(state, id);
      this.castExtra = WYD.runes.extra(state, id);
      const used = this.skillHandlers[WYD.classes.kindOf(id)].call(this, w, state, stats, def, lv);
      const extra = this.castExtra;
      this.castExtra = null;
      if (used) {
        WYD.vfx.cast(w, id, p.x, p.y, def.radius);
        p.skillCooldowns[id] = def.cooldown * (1 - stats.effects.cooldown / 100);
        // 型のおまけ：足元に燃える地面などを残す
        const lf = extra && extra.leaveField;
        if (lf) {
          w.fields.push({ texture: this.groundTexture(id), x: p.x, y: p.y, radius: lf.radius, timeLeft: lf.duration, duration: lf.duration,
            tick: lf.tick, tickTimer: lf.tick, mult: lf.mult * (1 + stats.skillDamage / 100), color: lf.color });
        }
      }
    }
  },

  // 地面に残るものの絵の名前（data/vfx.js の groundStyle。ないスキルは undefined＝燃える地面の絵、null＝絵なし）
  groundTexture(skillId) {
    const G = WYD.data.vfx.groundStyle;
    return skillId in G ? G[skillId] : undefined;
  },

  // スキルごとの処理。使ったら true を返す
  skillHandlers: {
    // 罠（アサシン。src/traps.js）
    trap(w, state, stats, s, lv) {
      return WYD.traps.place(w, state, stats, s, lv);
    },
    // 変身（ドルイド。src/forms.js）
    shift(w, state, stats, s, lv) {
      return WYD.forms.shift(w, state, stats, s, lv);
    },
    // オーラ（パラディン）：ONのあいだ、cooldown 秒ごとに効く。might は src/stats.js で攻撃力に足す
    aura(w, state, stats, s, lv) {
      const p = w.player;
      p.auras = p.auras || {};
      p.auras[this.castingId] = { radius: s.radius, color: s.color, timeLeft: s.cooldown + WYD.data.fx.auraRing.linger };
      if (s.auraType === "damage") {
        const targets = w.enemies.filter((e) => WYD.util.dist(p, e) <= s.radius + WYD.data.enemies[e.kind].radius);
        if (!targets.length) return false;
        const mult = (s.damageBase + s.damagePerLevel * (lv - 1)) * (1 + stats.skillDamage / 100);
        for (const e of targets) this.playerHit(w, state, stats, e, stats.attack * mult);
        WYD.fx.burst(w, p.x, p.y, WYD.data.fx.aura, s.color, { glow: true });
        return true;
      }
      if (s.auraType === "heal") {
        const pct = (s.healPercentBase + s.healPercentPerLevel * (lv - 1)) * (1 + stats.skillDamage / 100) / 100;
        const hurtAllies = w.allies.filter((a) => a.hp < a.maxHp && WYD.util.dist(p, a) <= s.radius);
        if (p.hp >= stats.maxHp && !hurtAllies.length) return false;
        p.hp = Math.min(stats.maxHp, p.hp + stats.maxHp * pct);
        for (const a of hurtAllies) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * pct);
        return true;
      }
      return false;   // might：いつも効いている（輪を出すだけ）
    },
    // 骸骨召喚（src/allies.js）
    raise(w, state, stats, s, lv) {
      return WYD.allies.summon(w, state, stats, s, lv);
    },
    whirl(w, state, stats, s, lv) {
      const p = w.player;
      const targets = w.enemies.filter((e) => WYD.util.dist(p, e) <= s.radius + WYD.data.enemies[e.kind].radius);
      if (targets.length < s.minTargets) return false;
      const mult = (s.damageBase + s.damagePerLevel * (lv - 1)) * (1 + stats.skillDamage / 100);
      for (const e of targets) {
        this.playerHit(w, state, stats, e, stats.attack * mult);
      }
      w.effects.push({ type: "ring", x: p.x, y: p.y, radius: s.radius, color: s.color, time: 0, duration: 0.35 });
      WYD.fx.burst(w, p.x, p.y, { ...WYD.data.fx.whirl, speed: s.radius * 2.2 }, s.color, { glow: true });
      WYD.sound.play("whirl");
      // 固有能力：劫火の腕輪（足元の地面が燃える）
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
    // 敵から敵へ跳ね返る投げ斧
    sudarshana(w, state, stats, s, lv) {
      const p = w.player;
      let cur = this.nearestEnemy(w, p);
      if (!cur || WYD.util.dist(p, cur) > s.range) return false;
      const bounce = stats.powers.chakraBounce;   // 固有能力：彷徨う刃
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
      // 絵があれば、稲妻の線や投げ斧の絵で見せる（なければ今までの線）
      const style = WYD.data.vfx.chainStyle[this.castingId];
      let drawn = false;
      if (style && style.mode === "segment") {
        for (let i = 1; i < points.length; i++) drawn = WYD.vfx.segment(w, style.key, points[i - 1], points[i]) || drawn;
      } else if (style && style.mode === "hit") {
        for (let i = 1; i < points.length; i++) drawn = WYD.vfx.spawn(w, style.key, points[i].x, points[i].y, { delay: i * 0.05 }) || drawn;
      }
      if (!drawn || style.mode === "hit") w.effects.push({ type: "chain", points, color: s.color, time: 0, duration: 0.3 });
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
      // メテオ：隕石が落ちてきて、着地で爆発する（絵があるときだけ）
      if (this.castingId === "sorc_meteor" && WYD.vfx.spawn(w, "meteor", best.x, best.y, { size: s.radius, fall: 240, duration: WYD.data.vfx.meteorFall })) {
        WYD.vfx.spawn(w, "fireBurst", best.x, best.y, { size: s.radius * 2.2, delay: WYD.data.vfx.meteorFall });
      } else {
        WYD.vfx.spawn(w, "fireBurst", best.x, best.y, { size: s.radius * 2 });
      }
      w.fields.push({ texture: this.groundTexture(this.castingId), x: best.x, y: best.y, radius: s.radius, timeLeft: s.duration, duration: s.duration,
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
      if (def.treasure) {
        // 宝物ゴブリン：主人公から逃げ、時間がたつと消える
        this.moveAway(e, p, def.moveSpeed * e.moveSpeedMult * dt);
        e.fleeTimer -= dt;
        if (e.fleeTimer <= 0) {
          w.enemies = w.enemies.filter((x) => x !== e);
          w.effects.push({ type: "ring", x: e.x, y: e.y, radius: def.radius * 2.5, color: WYD.data.goblin.color, time: 0, duration: 0.4 });
          WYD.ui.log("宝物ゴブリンに逃げられた…", "#c9b48a");
        }
        continue;
      }
      const reach = def.range + WYD.data.player.radius;
      const d = WYD.util.dist(e, p);
      if (def.barrage && !e.clone) this.updateBarrage(w, e, def.barrage, dt);
      if (e.boss && !e.clone && this.updateBossSkills(w, state, e, def, stats, dt)) {
        if (p.dead) return;
        continue;   // 突進の準備中・走っている間は、ほかのことをしない
      }
      if (def.slam && !e.clone && this.updateSlam(w, e, def.slam, stats, d, dt)) {
        if (p.dead) return;
        continue;   // 大技の準備中は動かない
      }
      if (def.ranged) {
        this.updateRanged(w, e, def, d, dt);
        continue;
      }
      // 近接の敵は、主人公より近い手下がいれば手下をねらう
      const tgt = WYD.allies.targetFor(w, e);
      const tReach = tgt === p ? reach : def.range + tgt.radius;
      const td = tgt === p ? d : WYD.util.dist(e, tgt);
      if (td > tReach) this.moveToward(e, tgt, def.moveSpeed * e.moveSpeedMult * dt, tReach * 0.8);

      e.attackTimer -= dt;
      if (tgt !== p && td <= tReach && e.attackTimer <= 0) {
        e.attackTimer = 1 / (def.attackSpeed * e.attackSpeedMult);
        e.atkAnim = WYD.data.anim.attack.time;
        e.face = tgt.x >= e.x ? 1 : -1;
        WYD.allies.hit(w, e, tgt);
        continue;
      }
      if (tgt === p && d <= reach && e.attackTimer <= 0) {
        e.attackTimer = 1 / (def.attackSpeed * e.attackSpeedMult);
        e.atkAnim = WYD.data.anim.attack.time;
        e.face = p.x >= e.x ? 1 : -1;
        const defense = stats.defense + (p.buff ? p.buff.defense : 0);
        const hit = this.calcDamage(e.attack, defense, 0);
        p.hp -= hit.damage;
        this.addText(w, p.x, p.y - 20, `-${hit.damage}`, "#ff6b6b");
        WYD.fx.burst(w, p.x, p.y, WYD.data.fx.playerHit, null, { gravity: true });
        WYD.sound.play("hurt");
        // 精鋭の能力：吸血
        if (this.hasAffix(e, "vampiric")) {
          e.hp = Math.min(e.maxHp, e.hp + hit.damage * this.eliteAffix("vampiric").lifestealPercent / 100);
        }
        // 精鋭の能力：氷結
        if (this.hasAffix(e, "frozen")) p.chill = this.eliteAffix("frozen").chillSeconds;
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

  // 受けたダメージを敵に返す（特殊効果：茨の鎧、固有能力：不壊の指輪）
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
    WYD.vfx.spawn(w, "fireBurst", x, y, { size: radius * 2 });
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
      e.atkAnim = WYD.data.anim.attack.time;
      e.face = p.x >= e.x ? 1 : -1;
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
      // 固有能力：流星避けの指輪（弾をはじく）
      const ward = stats.powers.projectileWard;
      if (ward && Math.random() * 100 < ward.chance) {
        this.addText(w, p.x, p.y - 20, "はじいた", ward.color);
        continue;
      }
      const defense = stats.defense + (p.buff ? p.buff.defense : 0);
      const hit = this.calcDamage(b.attack, defense, 0);
      p.hp -= hit.damage;
      this.addText(w, p.x, p.y - 20, `-${hit.damage}`, "#ff6b6b");
      // 特殊効果：茨の鎧（撃った敵が生きていれば返す）
      const owner = w.enemies.find((e) => e.id === b.ownerId);
      if (owner) this.reflect(w, state, stats, owner, hit.damage);
      if (p.hp <= 0) this.playerDied(w);
    }
    w.projectiles = w.projectiles.filter((b) => b.life > 0);
  },

  // ボス専用の技（分身・突進・毒の沼）。突進の準備中・走っている間は true
  updateBossSkills(w, state, e, def, stats, dt) {
    const p = w.player;
    e.skillTimers = e.skillTimers || {};
    const ready = (name, spec) => {
      const t = e.skillTimers[name] = (e.skillTimers[name] == null ? spec.firstDelay : e.skillTimers[name]) - dt;
      if (t > 0) return false;
      e.skillTimers[name] = spec.interval * (e.slamIntervalMult || 1);
      return true;
    };
    // 分身
    const C = def.clone;
    if (C && ready("clone", C) && w.enemies.filter((x) => x.clone).length < C.max) {
      for (let i = 0; i < C.count; i++) {
        const c = this.spawnEnemy(w, state, e.kind, this.farPosition(w));
        c.clone = true;
        c.maxHp = Math.round(e.maxHp * C.hpRatio);
        c.hp = c.maxHp;
        c.attack = e.attack * C.attackMult;
        w.effects.push({ type: "ring", x: c.x, y: c.y, radius: 40, color: def.color, time: 0, duration: 0.4 });
      }
      WYD.ui.log(`${def.name}が分身した！`, WYD.data.boss.nameColor);
    }
    // 毒の沼
    const P = def.pools;
    if (P && !p.dead && ready("pools", P)) {
      for (let i = 0; i < P.count; i++) {
        w.pools.push({ x: p.x + WYD.util.rand(-P.spread, P.spread), y: p.y + WYD.util.rand(-P.spread, P.spread),
          radius: P.radius, timeLeft: P.duration, duration: P.duration, dps: e.attack * P.dpsMult, color: P.color });
      }
    }
    // 突進
    const H = def.charge;
    if (!H) return false;
    const c = e.charging;
    if (c) {
      if (c.phase === "windup") {
        c.t -= dt;
        if (c.t <= 0) c.phase = "dash";
        return true;
      }
      const step = H.speed * dt;
      const left = WYD.util.dist(e, c.to);
      const move = Math.min(step, left);
      e.x += (c.to.x - e.x) / (left || 1) * move;
      e.y += (c.to.y - e.y) / (left || 1) * move;
      if (!c.hit && !p.dead && WYD.util.dist(e, p) < H.width + WYD.data.player.radius) {
        c.hit = true;
        const hit = this.calcDamage(e.attack * H.damageMult, stats.defense + (p.buff ? p.buff.defense : 0), 0);
        p.hp -= hit.damage;
        this.addText(w, p.x, p.y - 20, `-${hit.damage}`, "#ff3030");
        WYD.fx.shake(w, WYD.data.fx.shakeSlam);
        if (p.hp <= 0) this.playerDied(w);
      }
      if (left <= step) e.charging = null;
      return true;
    }
    if (!p.dead && ready("charge", H)) {
      const map = WYD.data.map;
      const d = WYD.util.dist(e, p) || 1;
      const to = {
        x: WYD.util.clamp(e.x + (p.x - e.x) / d * H.length, 20, map.width - 20),
        y: WYD.util.clamp(e.y + (p.y - e.y) / d * H.length, 20, map.height - 20),
      };
      e.charging = { phase: "windup", t: H.windup, from: { x: e.x, y: e.y }, to, width: H.width, color: H.color };
      return true;
    }
    return false;
  },

  // 毒の沼：中にいるとダメージ。時間で消える
  updatePools(w, dt) {
    const p = w.player;
    for (const pool of w.pools) {
      pool.timeLeft -= dt;
      if (!p.dead && WYD.util.dist(pool, p) < pool.radius) {
        p.hp -= pool.dps * dt;
        if (p.hp <= 0) this.playerDied(w);
      }
    }
    w.pools = w.pools.filter((x) => x.timeLeft > 0);
  },

  // ボスの弾幕：一定時間ごとに、まわりへ弾をたくさん撃つ（怒ると間隔が短くなる）
  updateBarrage(w, e, b, dt) {
    e.barrageTimer = (e.barrageTimer == null ? b.interval : e.barrageTimer) - dt;
    if (e.barrageTimer > 0) return;
    e.barrageTimer = b.interval * (e.slamIntervalMult || 1);
    const offset = Math.random() * Math.PI * 2;
    for (let i = 0; i < b.count; i++) {
      const ang = offset + (i / b.count) * Math.PI * 2;
      w.projectiles.push({
        x: e.x, y: e.y, vx: Math.cos(ang) * b.speed, vy: Math.sin(ang) * b.speed,
        size: b.size, color: b.color, attack: e.attack * b.damageMult, ownerId: e.id,
        life: WYD.data.map.projectileLifetime,
      });
    }
    WYD.sound.play("thunder");
  },

  // ボスの大技：予告の輪が出たあと、範囲内にいると大ダメージ。準備中なら true を返す
  updateSlam(w, e, slam, stats, d, dt) {
    const p = w.player;
    if (e.slamCharge != null) {
      e.slamCharge -= dt;
      if (e.slamCharge > 0) return true;
      e.slamCharge = null;
      e.slamAfter = 0.3;
      w.effects.push({ type: "ring", x: e.x, y: e.y, radius: slam.radius, color: WYD.data.boss.warnColor, time: 0, duration: 0.4 });
      w.effects.push({ type: "shock", x: e.x, y: e.y, radius: slam.radius, color: WYD.data.boss.warnColor, time: 0, duration: 0.5 });
      WYD.vfx.spawn(w, "shockwave", e.x, e.y, { size: slam.radius * 2.2 });
      WYD.fx.burst(w, e.x, e.y, { ...WYD.data.fx.slamDust, speed: slam.radius * 2.4 }, null, {});
      WYD.fx.shake(w, WYD.data.fx.shakeSlam);
      WYD.sound.play("slam");
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
      e.slamTimer = slam.interval * (e.slamIntervalMult || 1);
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
        WYD.records.found(state, drop.item);
        if (state.settings.autoEquip && WYD.inventory.autoEquip(state, drop.item)) {
          WYD.ui.log(`${WYD.loot.label(drop.item)}のほうが強いので、自動で装備した`, "#7dff8a");
        }
        WYD.records.check(state);
        const r = WYD.loot.rarityInfo(drop.item.rarity);
        if (drop.item.ancient) WYD.ui.notice(`${WYD.loot.label(drop.item)}を拾った！`, WYD.data.items.ancient.colors[drop.item.ancient]);
        else WYD.ui.log(`${WYD.loot.label(drop.item)}（${r.name}）を拾った`, r.color);
        WYD.ui.markDirty();
      } else if (D.fullSalvage.includes(drop.item.rarity)) {
        // 持ち物がいっぱい：ノーマル・マジックは拾ったその場で素材にする
        drop.picked = true;
        const n = WYD.inventory.salvage(state, drop.item);
        if (n > 0) this.addText(w, drop.x, drop.y - 10, `+${n}`, WYD.data.crafting.materialColor);
        this.fullWarning(w, `持ち物がいっぱいなので、ノーマル・マジックは素材にしています（いらない装備を捨てるか、「拾う・装備」で自動分解をONに）`);
        WYD.ui.markDirty();
      } else if (!drop.warned) {
        drop.warned = true;
        this.fullWarning(w, "持ち物がいっぱいで拾えない！");
      }
    }
    w.drops = w.drops.filter((d) => !d.picked && d.age < D.groundLifetime);
  },

  // 持ち物がいっぱいの知らせは、しばらく出しすぎない
  fullWarning(w, text) {
    if (w.time - (w.fullWarnAt == null ? -Infinity : w.fullWarnAt) < WYD.data.items.fullWarnInterval) return;
    w.fullWarnAt = w.time;
    WYD.ui.log(text, "#ff6b6b");
  },

  updateEffects(w, dt) {
    for (const ef of w.effects) ef.time += dt;
    w.effects = w.effects.filter((ef) => ef.time < ef.duration);
    const T = WYD.data.fx.text;
    for (const t of w.texts) { t.time += dt; t.y -= T.rise * dt; }
    w.texts = w.texts.filter((t) => t.time < T.life);
    WYD.fx.update(w, dt);
  },

  // ---------- 共通の処理 ----------
  calcDamage(attack, defense, critChance, critMultiplier) {
    const C = WYD.data.combat;
    let dmg = Math.max(attack * C.minDamageRatio, attack - defense * C.defenseFactor);
    dmg *= 1 + WYD.util.rand(-C.damageVariance, C.damageVariance);
    const crit = Math.random() * 100 < critChance;
    if (crit) dmg *= critMultiplier || WYD.data.player.critMultiplier;
    return { damage: Math.max(C.minDamage, Math.round(dmg)), crit };
  },

  // プレイヤーの攻撃が当たったとき（特殊効果：背水の怒り・吸血）
  playerHit(w, state, stats, e, attack) {
    if (e.hp <= 0) return;
    const p = w.player;
    const fx = stats.effects;
    const wrath = WYD.loot.effectInfo("wrath");
    if (fx.wrath > 0 && wrath && p.hp / stats.maxHp * 100 <= wrath.hpPercent) attack *= 1 + fx.wrath / 100;
    // 固有能力：狩人の籠手（精鋭とボスに強い）
    const hunter = stats.powers.eliteHunter;
    if (hunter && (e.elite || e.boss)) attack *= 1 + hunter.percent / 100;
    attack *= WYD.lgems.damageMult(w, state, e);   // 伝説の宝石
    WYD.lgems.onHit(w, state);
    const hit = this.calcDamage(attack, e.defense, stats.critChance, stats.critMultiplier);
    this.damageEnemy(w, state, e, hit.damage, hit.crit);
    // スキルの型のおまけ：吸血・縛る（スキルを使っている最中だけ）
    const ex = this.castExtra;
    if (ex) {
      if (ex.lifesteal && !p.dead) p.hp = Math.min(stats.maxHp, p.hp + hit.damage * ex.lifesteal / 100);
      if (ex.bind && e.hp > 0) e.stunTimer = Math.max(e.stunTimer || 0, e.boss ? ex.bind * WYD.data.runes.bossBindMult : ex.bind);
    }
    if (fx.lifesteal > 0 && !p.dead) {
      p.hp = Math.min(stats.maxHp, p.hp + hit.damage * fx.lifesteal / 100);
    }
  },

  // 特殊効果：雷鳴（通常攻撃のときに確率で発動）
  tryThunder(w, state, stats, e) {
    const chance = stats.effects.thunder;
    if (e.hp <= 0 || chance <= 0 || Math.random() * 100 >= chance) return;
    const def = WYD.loot.effectInfo("thunder");
    if (!WYD.vfx.segment(w, "lightning", { x: e.x + 8, y: e.y - 110 }, { x: e.x, y: e.y })) {
      w.effects.push({ type: "bolt", x: e.x, y: e.y, color: def.color, time: 0, duration: 0.25 });
    }
    WYD.sound.play("thunder");
    const hit = this.calcDamage(stats.attack * def.power, e.defense, 0);
    this.damageEnemy(w, state, e, hit.damage, false);
  },

  damageEnemy(w, state, e, damage, crit) {
    if (e.hp <= 0) return;
    // 精鋭の「守護」：盾の間はダメージを受けない
    if (e.shielded) {
      if (!e.blockTextCd || w.time - e.blockTextCd > 0.4) {
        e.blockTextCd = w.time;
        this.addText(w, e.x, e.y - 16, "無効", this.eliteAffix("shielding").color);
      }
      return;
    }
    e.hp -= damage;
    e.hitFlash = 0.1;
    this.logDamage(w, damage);
    this.addText(w, e.x, e.y - 16, crit ? `${damage}!` : `${damage}`, crit ? "#ffd447" : "#ffffff", crit);
    WYD.fx.hit(w, e, crit);
    if (e.boss && !e.enraged && e.hp > 0 && e.hp <= e.maxHp * WYD.data.boss.enrage.hpRatio) this.enrage(w, state, e);
    if (e.hp <= 0) this.enemyDied(w, state, e);
  },

  // 与えたダメージを記録する（秒間ダメージの表示用。手下や燃える地面もふくむ）
  logDamage(w, damage) {
    const win = WYD.data.combat.dpsWindow;
    w.dmgLog = w.dmgLog || [];
    w.dmgLog.push({ t: w.time || 0, d: damage });
    while (w.dmgLog.length && w.dmgLog[0].t < (w.time || 0) - win) w.dmgLog.shift();
  },

  // 直近の秒間ダメージ
  dps(w) {
    const win = WYD.data.combat.dpsWindow;
    const now = w.time || 0;
    const log = (w.dmgLog || []).filter((x) => x.t >= now - win);
    if (!log.length) return 0;
    const span = Math.max(1, Math.min(win, now - log[0].t));
    return log.reduce((a, x) => a + x.d, 0) / span;
  },

  // ボスの怒り：強くなり、手下を呼ぶ（data/areas.js の boss.enrage）
  enrage(w, state, e) {
    const R = WYD.data.boss.enrage;
    const def = WYD.data.enemies[e.kind];
    e.enraged = true;
    e.attack *= R.attackMult;
    e.attackSpeedMult *= R.attackSpeedMult;
    e.moveSpeedMult *= R.moveSpeedMult;
    e.slamIntervalMult = R.slamIntervalMult;
    if (e.slamCharge == null) e.slamTimer = Math.min(e.slamTimer, R.firstSlamDelay);
    const pool = this.area(state).enemies;
    for (let i = 0; i < R.summonCount; i++) {
      const pick = WYD.util.pickWeighted(pool, (x) => x.weight);
      this.spawnEnemy(w, state, pick.kind, {
        x: WYD.util.clamp(e.x + WYD.util.rand(-R.summonSpread, R.summonSpread), 20, WYD.data.map.width - 20),
        y: WYD.util.clamp(e.y + WYD.util.rand(-R.summonSpread, R.summonSpread), 20, WYD.data.map.height - 20),
      });
    }
    w.effects.push({ type: "shock", x: e.x, y: e.y, radius: def.radius * 4, color: R.color, time: 0, duration: 0.6 });
    WYD.fx.shake(w, WYD.data.fx.shakeSlam);
    WYD.sound.play("bossAppear");
    WYD.ui.notice(`${def.name}が怒り狂った！（速く・強くなり、手下を呼んだ）`, R.color);
  },

  enemyDied(w, state, e) {
    const def = WYD.data.enemies[e.kind];
    if (e.clone) {
      // 分身：消えるだけ
      w.enemies = w.enemies.filter((x) => x !== e);
      w.effects.push({ type: "ring", x: e.x, y: e.y, radius: 30, color: def.color, time: 0, duration: 0.3 });
      return;
    }
    WYD.lgems.onKill(w, state, e);
    WYD.fx.death(w, e);
    const diff = WYD.data.difficulty;
    const inTrial = WYD.trial.active(state);
    const d = inTrial ? 0 : state.difficulty - 1;
    w.enemies = w.enemies.filter((x) => x !== e);

    const area = this.area(state);
    const expMult = (e.elite ? WYD.data.elites.expMult : 1) * area.powerMult * this.floorPower(state);
    this.gainExp(state, Math.round(def.exp * (1 + diff.expGrowth * d) * expMult * WYD.season.mult(state, "expMult") * WYD.shrines.expMult() * WYD.breach.expMult(e)));

    WYD.records.add(state, "kills");
    if (this.hasAffix(e, "explosive")) {
      const A = this.eliteAffix("explosive");
      w.hazards.push({ x: e.x, y: e.y, radius: A.radius, timer: A.delay, delay: A.delay, damage: e.attack * A.damageMult, color: A.color });
    }
    if (e.elite) WYD.records.add(state, "eliteKills");
    if (e.boss) WYD.records.add(state, "bossKills");

    if (inTrial) {
      WYD.trial.onKill(w, state, e);
    } else if (e.boss) {
      w.bossDone = true;
      delete state.bossDeaths[area.id];
      this.bossDefeated(state, area, def);
      // ボスを倒したら、すこしして地下1階にもどる（もう一度もぐって集められる）
      w.returnTimer = WYD.data.boss.bossAppearDelay * 2;
    } else if (!this.isBossRoom(state)) {
      state.bossProgress = Math.min(area.killsPerFloor, state.bossProgress + 1);
      if (state.bossProgress >= area.killsPerFloor) {
        state.bossProgress = 0;
        w.descendNext = true;   // 倒した敵の処理が終わってから降りる
      }
    }

    // 特殊効果：血の饗宴（倒すとHP回復）
    const stats = WYD.stats.compute(state);
    const p = w.player;
    if (stats.effects.killHeal > 0 && !p.dead) {
      const heal = Math.round(stats.maxHp * stats.effects.killHeal / 100);
      p.hp = Math.min(stats.maxHp, p.hp + heal);
      this.addText(w, p.x, p.y - 24, `+${heal}`, "#7dff8a");
    }

    // 固有能力：鎖の王冠（縛られた敵が爆発）／屍爆の印章（死体が爆発）
    const be = stats.powers.bindExplode;
    if (be && e.stunTimer > 0 && !p.dead) this.explode(w, state, stats, e.x, e.y, be.radius, be.mult, be.color);
    const kn = stats.powers.killNova;
    if (kn && !p.dead && Math.random() * 100 < kn.chance) this.explode(w, state, stats, e.x, e.y, kn.radius, kn.mult, kn.color);

    // 「自動」がONで最高より下にいるなら、しばらく倒し続けたら1つ上げる（試練の最中はしない）
    if (!inTrial && state.settings.autoDifficulty && state.difficulty < state.maxDifficulty) {
      w.autoKills = (w.autoKills || 0) + 1;
      if (w.autoKills >= diff.autoUpAfterKills) {
        w.autoKills = 0;
        w.autoDeaths = 0;
        state.difficulty++;
        this.resetEnemies(w, state, true);
        WYD.ui.log(`危険度を自動で ${state.difficulty} に上げた`, "#ff8a2a");
        WYD.ui.changed();
      }
    }

    // 最高危険度で倒すと、次の危険度に近づく
    if (!inTrial && state.difficulty === state.maxDifficulty && state.maxDifficulty < diff.max) {
      state.killsAtMax++;
      if (state.killsAtMax >= diff.killsToUnlockNext) {
        state.maxDifficulty++;
        state.killsAtMax = 0;
        WYD.ui.log(`危険度 ${state.maxDifficulty} が解放された！`, "#ff8a2a");
        // 「自動」がONなら、解放された危険度へすぐ上げる
        if (state.settings.autoDifficulty) {
          state.difficulty = state.maxDifficulty;
          w.autoDeaths = 0;
          this.resetEnemies(w, state, true);
          WYD.ui.log(`危険度を自動で ${state.difficulty} に上げた`, "#ff8a2a");
        }
      }
      WYD.ui.markDirty();
    }

    // 精鋭は必ず数個落とし、レアも出やすい
    const E = WYD.data.elites;
    const bonus = def.rarityBonus * (1 + diff.rarityGrowth * d) * (e.elite ? E.rarityBonusMult : 1) *
      (inTrial ? WYD.data.trial.rarityBonus : 1) * (1 + stats.magicFind / 100) * WYD.season.mult(state, "rarityMult");
    let count = e.elite ? E.dropCount : (Math.random() < def.dropChance ? 1 : 0);
    if (e.boss) count = WYD.data.boss.dropCount;
    if (e.elite) WYD.ui.log(`精鋭「${e.name}」を倒した！`, E.color);
    // ボスと精鋭は、まれにユニーク装備を落とす
    const U = WYD.data.uniques;
    const uniqueChance = e.boss ? U.chanceFromBoss : e.elite ? U.chanceFromElite : 0;
    if (Math.random() < uniqueChance) {
      const item = WYD.loot.createUnique(state, this.itemLevel(state));
      w.drops.push({ x: e.x, y: e.y, item, age: 0 });
      WYD.ui.notice(`ユニーク装備「${item.name}」が落ちた！`, U.color);
      WYD.sound.play("uniqueDrop");
    }
    // ボスと精鋭は、まれにセット装備を落とす
    const SE = WYD.data.sets;
    const setChance = e.boss ? SE.chanceFromBoss : e.elite ? SE.chanceFromElite : 0;
    if (Math.random() < setChance) {
      const item = WYD.loot.createSetPiece(state, this.itemLevel(state));
      w.drops.push({ x: e.x + 12, y: e.y + 8, item, age: 0 });
      WYD.ui.notice(`セット装備「${item.name}」が落ちた！`, SE.color);
      WYD.sound.play("uniqueDrop");
    }
    for (let i = 0; i < count; i++) {
      const item = WYD.loot.create(state, this.itemLevel(state), bonus);
      // 自動分解：拾わずにその場で素材にする
      if (WYD.inventory.shouldAutoSalvage(state, item)) {
        const n = WYD.inventory.salvage(state, item);
        WYD.offline.record("mats", n);
        if (n > 0) this.addText(w, e.x, e.y - 30, `+${n}`, WYD.data.crafting.materialColor);
        WYD.ui.markDirty();
        continue;
      }
      if (item.rarity === "legend") WYD.sound.play("rareDrop");
      const spread = count > 1 ? 10 + count * 4 : 0;
      w.drops.push({ x: e.x + WYD.util.rand(-spread, spread), y: e.y + WYD.util.rand(-spread, spread), item, age: 0 });
    }
    if (def.treasure) this.goblinTreasure(w, state, e);
    WYD.gems.onKill(w, state, e);
    WYD.maps.onKill(w, state, e);
    WYD.uber.onKill(w, state, e);
    WYD.breach.onKill(w, state, e);
    WYD.records.check(state);
  },

  // 宝物ゴブリンを倒したときのごほうび
  goblinTreasure(w, state, e) {
    const G = WYD.data.goblin;
    for (let i = 0; i < G.dropCount; i++) {
      const item = WYD.loot.create(state, this.itemLevel(state), G.rarityBonus);
      w.drops.push({ x: e.x + WYD.util.rand(-G.dropSpread, G.dropSpread), y: e.y + WYD.util.rand(-G.dropSpread, G.dropSpread), item, age: 0 });
    }
    const mats = G.materials + G.materialsPerDifficulty * (state.difficulty - 1);
    state.materials += mats;
    for (let i = 0; i < G.gems; i++) WYD.gems.add(state, WYD.gems.key(WYD.util.pick(WYD.data.gems.gems).id, WYD.gems.dropTier(state)));
    WYD.records.add(state, "goblinKills");
    WYD.fx.burst(w, e.x, e.y, WYD.data.fx.levelUp, G.color, { glow: true });
    WYD.sound.play("uniqueDrop");
    WYD.ui.log(`宝物ゴブリンを倒した！ 装備${G.dropCount}個・${WYD.data.crafting.materialName} +${mats}・宝石${G.gems}個`, G.color);
  },

  // ボスを倒したら次のエリアを解放する
  bossDefeated(state, area, def) {
    WYD.ui.log(`ボス「${def.name}」を倒した！`, WYD.data.boss.nameColor);
    const list = WYD.data.areas;
    const next = list[list.indexOf(area) + 1];
    if (next && !state.unlockedAreas.includes(next.id)) {
      state.unlockedAreas.push(next.id);
      WYD.ui.log(`新しいエリア「${next.name}」に行けるようになった！（上の「エリア ▶」で移動）`, "#ff8a2a");
    }
    // 最後のエリアのボスを初めて倒したらクリア
    if (!next && !state.cleared) {
      state.cleared = true;
      WYD.ui.showStory("clear");
    }
    WYD.ui.changed();
  },

  gainExp(state, amount) {
    const pl = state.player;
    const P = WYD.data.player;
    WYD.offline.record("exp", amount);
    if (pl.level >= P.maxLevel) return this.gainParagon(state, amount);
    pl.exp += amount;
    while (pl.level < P.maxLevel && pl.exp >= WYD.stats.expToNext(pl.level)) {
      pl.exp -= WYD.stats.expToNext(pl.level);
      pl.level++;
      pl.skillPoints += P.skillPointsPerLevel;
      WYD.ui.log(`レベルアップ！ Lv${pl.level}（スキルポイント+${P.skillPointsPerLevel}）`, "#7dff8a");
      WYD.ui.onLevelUp();
    }
    if (pl.level >= P.maxLevel) {
      const extra = pl.exp;
      pl.exp = 0;
      if (extra > 0) this.gainParagon(state, extra);
    }
    WYD.ui.markDirty();
  },

  // レベル上限のあとの経験値：修練レベルを上げ、修練ポイントをもらう
  gainParagon(state, amount) {
    const pg = state.player.paragon;
    const G = WYD.data.player.paragon;
    pg.exp += amount;
    while (pg.exp >= WYD.stats.paragonToNext(pg.level)) {
      pg.exp -= WYD.stats.paragonToNext(pg.level);
      pg.level++;
      pg.points += G.pointsPerLevel;
      WYD.ui.log(`修練レベル ${pg.level}！（修練ポイント+${G.pointsPerLevel}）`, "#e0c070");
      WYD.ui.onLevelUp();
    }
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
    WYD.records.add(state, "deaths");
    const map = WYD.data.map;
    const p = w.player;
    // 「自動」がONなら、同じ危険度で何度も倒れたら1つ下げる
    if (!WYD.trial.active(state) && state.settings.autoDifficulty && state.difficulty > 1) {
      w.autoDeaths = (w.autoDeaths || 0) + 1;
      if (w.autoDeaths >= WYD.data.difficulty.autoDownAfterDeaths) {
        w.autoDeaths = 0;
        w.autoKills = 0;
        state.difficulty--;
        WYD.ui.log(`倒れ続けたので、危険度を自動で ${state.difficulty} に下げた`, "#ff8a2a");
        WYD.ui.changed();
      }
    }
    WYD.trial.onDeath(w, state);
    // ボスの間で倒れたら、1つ上の階にもどる（すこし倒せばまた降りられる）
    if (this.isBossRoom(state)) {
      const area = this.area(state);
      state.bossDeaths[area.id] = (state.bossDeaths[area.id] || 0) + 1;
      this.changeFloor(w, state, -1);
      state.bossProgress = Math.floor(area.killsPerFloor * WYD.data.boss.retryProgressRatio);
    }
    p.dead = false;
    p.hp = stats.maxHp;
    p.x = map.width / 2;
    p.y = map.height / 2;
    p.buff = null;
    p.haste = null;
    p.chill = 0;
    w.allies = [];
    w.traps = [];
    w.mercTimer = null;   // 傭兵は少したってから戻る
    w.fields = [];
    w.hazards = [];
    w.pools = [];
    w.projectiles = [];
    w.bolts = [];
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

  // （前の作り：ボスがいたら少し倒せばまた出てくる）。今はボスの間にいれば自動でまた出るので何もしない
  keepBoss() {},

  nearestEnemy(w, from) {
    let best = null, bestD = Infinity;
    for (const e of w.enemies) {
      const d = WYD.util.dist(from, e);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  },

  // target から遠ざかる（マップの外には出ない）
  moveAway(obj, target, step) {
    const map = WYD.data.map;
    const d = WYD.util.dist(obj, target) || 1;
    obj.x = WYD.util.clamp(obj.x + (obj.x - target.x) / d * step, 20, map.width - 20);
    obj.y = WYD.util.clamp(obj.y + (obj.y - target.y) / d * step, 20, map.height - 20);
  },

  moveToward(obj, target, step, stopAt) {
    const d = WYD.util.dist(obj, target);
    if (d <= stopAt) return;
    const s = Math.min(step, d - stopAt);
    obj.x += (target.x - obj.x) / d * s;
    obj.y += (target.y - obj.y) / d * s;
  },

  addText(w, x, y, text, color, big) {
    w.texts.push({ x: x + WYD.util.rand(-6, 6), y, text, color, time: 0, big: !!big });
  },
};
