// 通常冒険だけの「戦闘→移動→戦闘」。戦闘座標と抽選は既存のworldを使う。
window.WYD = window.WYD || {};
WYD.dungeon = {
  enabled(w, s) {
    return !!WYD.data.dungeon.areas[s.area] && !WYD.trial.active(s) && !w.player.arenaMain && WYD.dpsEngine?.world !== w;
  },
  target(s) {
    const area = WYD.world.area(s);
    return Math.min(3, Math.floor((s.bossProgress || 0) * 3 / area.killsPerFloor));
  },
  ensure(w, s) {
    if (!this.enabled(w, s)) return null;
    if (!w.dungeon || w.dungeon.area !== s.area || w.dungeon.floor !== s.floor) {
      w.dungeon = { area: s.area, floor: s.floor, stage: Math.min(2, this.target(s)), move: null };
    }
    return w.dungeon;
  },
  cancel(w) { w.dungeon = null; w.dungeonCamp = null; },
  holdSpawns(w, s) {
    const r = this.ensure(w, s);
    if (!r) return false;
    if (w.bossDone || r.move) return true;
    if (WYD.world.isBossRoom(s)) return false;
    const next = Math.ceil((r.stage + 1) * WYD.world.area(s).killsPerFloor / 3);
    return this.target(s) > r.stage || (s.bossProgress || 0) + w.enemies.filter(e => !e.clone).length >= next;
  },
  settleDrops(w, s) {
    // 抽選せず、既存の取得・満杯・未受取・素材化を一度通す。拾えないものは地面に残す。
    for (const d of w.drops) d.age = Math.max(d.age || 0, WYD.data.items.pickupDelay);
    WYD.world.updateDrops(w, s, 0);
  },
  clearCombat(w) {
    WYD.bombs.clear(w); WYD.runeSkills.clear(w);
    for (const key of ['projectiles', 'bolts', 'hazards', 'pools', 'fields', 'traps', 'corpses']) w[key] = [];
    w.player.spriteCast = null; w.player.spriteCastNext = null; w.player.atkAnim = 0;
  },
  update(w, s, dt) {
    const r = this.ensure(w, s);
    if (s.dungeonReturn?.returned && !w.drops.length) s.dungeonReturn = null;
    if (!r || w.town || w.player.dead) return false;
    if (w.dungeonReward) w.dungeonReward.time += dt;
    if (r.move) {
      const m = r.move, D = WYD.data.dungeon;
      m.time = Math.min(m.duration, m.time + dt);
      const t = m.time / m.duration, k = t * t * (3 - 2 * t);
      const p = w.player;
      p.x = m.x + m.dx * k; p.y = m.y + m.dy * k; p.face = 1; p.moving = true;
      for (const a of m.allies) { a.unit.x = a.x + m.dx * k; a.unit.y = a.y + m.dy * k; }
      WYD.world.updateEntrance(w, dt);
      if (m.time >= m.duration) {
        r.move = null; p.moving = false;
        if (m.floor) {
          WYD.world.changeFloor(w, s, 1); this.ensure(w, s);
        } else { r.stage = m.to; w.spawnTimer = 0; }
        WYD.ui.markDirty();
      }
      return true;
    }
    if (w.bossDone && w.dungeonReward) {
      // 新規スポーンは止めるが、ボスの手下が残れば通常の戦闘で倒してから帰る。
      if (w.enemies.length || w.breach) return false;
      WYD.world.updateEntrance(w, dt);
      const seconds = s.settings.quietFx ? WYD.data.dungeon.quietRewardSeconds : WYD.data.dungeon.rewardSeconds;
      if (w.dungeonReward.time >= seconds) {
        this.settleDrops(w, s);
        if (WYD.world.battleStopped(s)) return true;
        s.floor = 1; s.bossProgress = 0;
        s.dungeonReturn = w.drops.length ? { ...s.dungeonReturn, returned: true } : null;
        w.returnTimer = null; w.descendNext = false; w.bossDone = false;
        this.clearCombat(w); WYD.town.enter(w, s);
        w.dungeonCamp = { area: s.area, remaining: WYD.data.dungeon.campSeconds };
        WYD.save.write(s);
      }
      return true;
    }
    if (WYD.world.isBossRoom(s) || w.breach || w.enemies.length || w.player.stunTimer > 0) return false;
    const to = this.target(s);
    if (to <= r.stage) return false;
    this.settleDrops(w, s);
    if (WYD.world.battleStopped(s)) return true;
    this.clearCombat(w);
    const D = WYD.data.dungeon, M = WYD.data.map, p = w.player;
    const dx = Math.min(D.walk.x, M.width - D.walk.padding - p.x);
    const dy = Math.max(D.walk.y, D.walk.padding - p.y);
    r.move = { from: r.stage, to, floor: to === 3, time: 0,
      duration: s.settings.quietFx ? D.quietMoveSeconds : D.moveSeconds,
      x: p.x, y: p.y, dx: Math.max(0, dx), dy: Math.min(0, dy),
      allies: w.allies.map(unit => ({ unit, x: unit.x, y: unit.y })) };
    WYD.ui.markDirty();
    return true;
  },
  updateCamp(w, s, dt) {
    const c = w.dungeonCamp;
    if (!c || !this.enabled(w, s) || c.area !== s.area) return;
    c.remaining -= dt;
    if (c.remaining <= 0) { w.dungeonCamp = null; w.dungeonReward = null; WYD.town.leave(w, s); }
  },
  frontPosition(w) {
    const M = WYD.data.map, p = w.player;
    // 右上（奥）から接近。距離を確保できないときは既存の出現位置を使う。
    const D = WYD.data.dungeon;
    const pos = { x: M.width - D.walk.padding - (w.nextId % D.front.columns) * D.front.spreadX, y: D.walk.padding + (w.nextId % D.front.rows) * D.front.spreadY };
    return WYD.util.dist(p, pos) >= M.spawnMinDistance ? pos : WYD.world.farPosition(w);
  },
  resourceCounts(s) {
    return { gems: Object.values(s.gems).reduce((n, v) => n + v, 0), essence: s.runeSkills?.essence || 0, maps: s.maps.length, keys: s.uber.keys };
  },
  beginReward(w, s, e) {
    if (!this.enabled(w, s) || !e.boss) return null;
    return { area: s.area, areaName: WYD.world.area(s).name, boss: WYD.data.enemies[e.kind].name,
      items: [], materials: 0, time: 0 };
  },
  rewardItem(w, reward, item, materials) {
    if (!reward) return;
    reward.items.push({ id: item.id, label: WYD.loot.label(item), rarity: item.rarity,
      status: materials == null ? '地面にドロップ' : '自動分解', materials: materials || 0 });
    if (materials != null) reward.materials += materials;
    const drop = w.drops.find(d => d.item === item);
    if (drop) drop.bossLoot = true;
  },
  finishReward(w, s, reward) {
    if (!reward) return;
    w.returnTimer = null;
    w.dungeonReward = reward; w.lastDungeonReward = reward; // 最新1件だけを保持する。
    s.dungeonReturn = { area: s.area, reward, drops: [] }; // 撃破後の再読込でボスを再生成しない。
    WYD.ui.log(`${reward.areaName}：${reward.boss}の戦利品 ${reward.items.map(i => i.label + '（' + i.status + '）').join('・')}`, '#e8c46a');
    WYD.save.write(s);
    WYD.ui.markDirty();
  },
  acquired(w, item, status, materials = 0) {
    const reward = w.lastDungeonReward;
    const row = reward && reward.items.find(i => i.id === item.id);
    if (!row) return;
    row.status = status; row.materials += materials; reward.materials += materials;
  },
  restore(w, s) {
    const c = s.dungeonReturn;
    if (!c || c.area !== s.area || !this.enabled(w, s)) { s.dungeonReturn = null; return; }
    const owned = new Set([...s.inventory, ...s.stash, ...s.pendingLoot, ...Object.values(s.equipment)].filter(Boolean).map(i => i.id));
    const ground = new Set(w.drops.filter(d => !d.picked && d.item).map(d => d.item.id));
    for (const d of c.drops || []) if (d.item && !owned.has(d.item.id) && !ground.has(d.item.id)) { w.drops.push(d); ground.add(d.item.id); }
    w.lastDungeonReward = c.reward || null;
    for (const row of w.lastDungeonReward?.items || []) {
      if (s.pendingLoot.some(it => it.id === row.id)) row.status = '未受取に保管';
      else if (owned.has(row.id)) row.status = '獲得済み';
      else if (ground.has(row.id)) row.status = '地面にドロップ';
    }
    this.settleDrops(w, s);
    if (!c.returned) { s.floor = 1; s.bossProgress = 0; }
    c.returned = true;
    s.dungeonReturn = w.drops.length ? c : null;
    WYD.ui.log('ボス戦利品を保持して野営地へ戻りました。', '#e8c46a');
  },
  view(s, w) {
    const V = WYD.data.map.scene.views, D = WYD.data.dungeon;
    const base = floor => V[Math.min(V.length - 1, Math.max(0, floor - 1))];
    const at = (floor, stage) => {
      const v = base(floor);
      if (floor > WYD.world.area(s).floors) return { ...v, zoom: v.zoom * D.sceneZoom };
      return { zoom: v.zoom * D.sceneZoom, x: WYD.util.clamp(v.x + (D.pan.x[stage] - 0.5) * D.panStrength, 0, 1), y: WYD.util.clamp(v.y + (D.pan.y[stage] - 0.5) * D.panStrength, 0, 1) };
    };
    const r = w.dungeon;
    const stage = r && r.floor === s.floor ? r.stage : Math.min(2, this.target(s));
    const a = at(s.floor, stage), m = r && r.move;
    if (!m) return a;
    const b = m.floor ? at(s.floor + 1, 0) : at(s.floor, m.to);
    const t = m.time / m.duration, k = t * t * (3 - 2 * t);
    return { zoom: a.zoom + (b.zoom - a.zoom) * k, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  },
  label(w, s) {
    if (!this.enabled(w, s)) return '';
    if (w.dungeonCamp) return '自動帰還・次の周回へ';
    if (WYD.world.isBossRoom(s)) return w.bossDone ? '踏破・戦利品を回収中' : '最奥・ボスの間';
    const r = w.dungeon, stage = r ? r.stage : Math.min(2, this.target(s));
    const pct = Math.min(100, Math.floor((s.bossProgress || 0) / WYD.world.area(s).killsPerFloor * 100));
    return `${WYD.data.dungeon.sections[stage]} · ${pct}%${r && r.move ? ' · 奥へ前進中' : ''}`;
  },
  drawProps(ctx, w, s) {
    if (!this.enabled(w, s)) return;
    const D = WYD.data.dungeon, M = WYD.data.map, profile = D.areas[s.area], v = this.view(s, w);
    const rnd = WYD.util.seededRandom(M.decorationSeed + s.floor);
    ctx.save(); ctx.globalAlpha = D.props.alpha;
    for (let i = 0; i < D.props.count; i++) {
      const x = (i % 2 ? 0.9 : 0.08) * M.width + rnd() * 35 - (v.x - 0.5) * D.props.travelX;
      const y = rnd() * M.height + (v.y - 0.5) * D.props.travelY;
      const size = D.props.size * (0.75 + rnd() * 0.5);
      ctx.fillStyle = profile.color; ctx.strokeStyle = profile.light; ctx.lineWidth = 2;
      if (profile.kind === 'tree') {
        ctx.fillStyle = '#4a4034';ctx.fillRect(x - 4, y - size/2, 8, size*1.5);
        ctx.fillStyle = profile.color;
        for (let leaf=0;leaf<3;leaf++) { ctx.beginPath();ctx.ellipse(x+(leaf-1)*size/4,y-size/3-leaf*size/6,size/3,size/3,-0.3,0,Math.PI*2);ctx.fill(); }
        ctx.strokeStyle=profile.light;ctx.beginPath();ctx.moveTo(x,y+size);ctx.lineTo(x,y-size/2);ctx.stroke();
      } else if (profile.kind === 'crystal' || profile.kind === 'ice') {
        ctx.beginPath();ctx.moveTo(x, y-size);ctx.lineTo(x+size/3,y);ctx.lineTo(x-size/3,y);ctx.closePath();ctx.fill();ctx.stroke();
      } else {
        ctx.fillRect(x-size/4,y-size,size/2,size); ctx.strokeRect(x-size/4,y-size,size/2,size);
        if (profile.kind === 'column') { ctx.fillRect(x-size/3,y-size,size*2/3,5);ctx.fillRect(x-size/3,y-5,size*2/3,5); }
        if (profile.kind === 'lava') { ctx.beginPath();ctx.ellipse(x,y,size,size/3,0,0,Math.PI*2);ctx.fill(); }
      }
    }
    ctx.restore();
  },
  rewardVisible(w, s) {
    return this.enabled(w, s) && !!w.dungeonReward && !w.town && (w.dungeonReward.time >= WYD.data.boss.defeat.slowTime || WYD.world.battleStopped(s));
  },
  drawReward(ctx, w, s) {
    if (!this.rewardVisible(w, s)) return;
    const r = w.dungeonReward, D = WYD.data.dungeon.summary, M = WYD.data.map;
    const shown = ctx.canvas.clientWidth / M.width || 1, items = r.items.slice(0,D.maxItems);
    const extra = Object.entries(r.extra || {}).filter(([,n]) => n > 0).map(([key,n]) => `${({gems:'宝石',essence:'ルーン欠片',maps:'地図',keys:'奈落の鍵'})[key]} +${n}`).join(' · ');
    const rows = items.length + (extra ? 4 : 3);
    const font = Math.min(Math.max(D.font, D.minShownPx / shown), (M.height - D.minTop - D.padding - 20) / rows / 1.4);
    const width = Math.min(M.width - D.padding*2, D.width * Math.max(1, font / D.font)), x = (M.width-width)/2;
    const line = Math.max(D.rowHeight, font*1.4), height = rows * line + 20;
    const top = Math.max(D.minTop, Math.min(D.top, M.height - D.padding - height));
    ctx.save(); ctx.fillStyle='rgba(8,8,12,0.92)';ctx.fillRect(x,top,width,height);
    ctx.strokeStyle='#a88751';ctx.strokeRect(x,top,width,height);
    ctx.textAlign='left';ctx.font=`bold ${font}px sans-serif`;ctx.fillStyle='#efd49a';
    const text = (label,y) => ctx.fillText(label,x+12,y,width-24);
    text(`${r.areaName} · ${r.boss} 討伐`,top+line);
    ctx.font=`${font}px sans-serif`;
    items.forEach((it,n)=>{ctx.fillStyle=WYD.loot.rarityInfo(it.rarity).color;text(`${it.label} — ${it.status}${it.materials?' +'+it.materials+'素材':''}`,top+(n+2)*line);});
    ctx.fillStyle='#c9a0ff';text(`分解素材 +${r.materials} · 自動回収後、帰還して再周回`,top+(items.length+2)*line);
    if (extra) { ctx.fillStyle='#b8d9eb';text(extra,top+(items.length+3)*line); }
    ctx.restore();
  },
};
