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
  bossPosition(w) {
    const M = WYD.data.map;
    for (const point of WYD.data.dungeon.bossPositions) {
      const pos = {x:point.x*M.width,y:point.y*M.height};
      if (WYD.util.dist(w.player,pos) >= M.spawnMinDistance) return pos;
    }
    return this.frontPosition(w); // 距離を確保できなければ従来の出現処理へ戻す。
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
  routeDistance(w, s) {
    const r=w.dungeon, m=r&&r.move;
    const stage=r&&r.floor===s.floor?r.stage:Math.min(2,this.target(s));
    let distance=(s.floor-1)*3+stage;
    if(m){const t=WYD.util.clamp(m.time/m.duration,0,1),k=t*t*(3-2*t);distance+=((m.floor?3:m.to)-stage)*k;}
    return distance*WYD.data.dungeon.forestRoute.travel;
  },
  drawForestRoute(ctx, w, s, scene) {
    if(!this.enabled(w,s)||s.area!=='forest'||WYD.world.isBossRoom(s))return false;
    const D=WYD.data.dungeon.forestRoute,M=WYD.data.map,offset=this.routeDistance(w,s);
    const tile=WYD.render.getImage(WYD.world.area(s).groundImage);
    ctx.save();
    // 遠景は既存の森。足元は実際に流れる地面で、同じ一枚絵のパンと分離する。
    ctx.fillStyle='#33402c';ctx.fillRect(0,D.horizon,M.width,M.height-D.horizon);
    if(tile){
      const y0=offset%D.tileSize;
      for(let y=y0-D.tileSize;y<M.height;y+=D.tileSize)
        for(let x=0;x<M.width;x+=D.tileSize)ctx.drawImage(tile,x,y,D.tileSize,D.tileSize);
    }
    if(scene){
      const mist=ctx.createLinearGradient(0,0,0,D.horizon*2);
      mist.addColorStop(0,'rgba(37,48,33,0)');mist.addColorStop(1,'#33402c');
      // 遠景の帯を残し、地面との継ぎ目を霧でぼかす。
      ctx.drawImage(scene,0,0,scene.width,scene.height*.3,0,0,M.width,D.horizon);
      ctx.fillStyle=mist;ctx.fillRect(0,0,M.width,D.horizon*2);
    }
    const section=Math.min(2,Math.floor(offset/D.travel)%3);
    ctx.fillStyle=D.edge;ctx.beginPath();ctx.moveTo(M.width*.38,0);ctx.lineTo(M.width*.62,0);
    ctx.lineTo(M.width*.94,M.height);ctx.lineTo(M.width*.06,M.height);ctx.closePath();ctx.fill();
    ctx.save();ctx.beginPath();ctx.moveTo(M.width*.4,0);ctx.lineTo(M.width*.6,0);
    ctx.lineTo(M.width*.88,M.height);ctx.lineTo(M.width*.12,M.height);ctx.closePath();ctx.clip();
    if(tile){
      ctx.filter='sepia(.8) saturate(.5) brightness(1.7)';
      for(let y=offset%D.tileSize-D.tileSize;y<M.height;y+=D.tileSize)
        for(let x=0;x<M.width;x+=D.tileSize)ctx.drawImage(tile,x,y,D.tileSize,D.tileSize);
      ctx.filter='none';
    }
    ctx.globalAlpha=.3;ctx.fillStyle=D.road[section];ctx.fillRect(0,0,M.width,M.height);ctx.restore();
    // 同じ石・木を下へ送り、移動後も通過した距離を保持。描画用乱数は戦闘抽選から独立。
    const first=Math.floor((offset-M.height)/90),last=Math.ceil(offset/90);
    for(let n=first;n<=last;n++){
      const rnd=WYD.util.seededRandom(127+n*31),y=offset-n*90;
      const depth=WYD.util.clamp(y/M.height,0,1),half=M.width*(.1+.28*depth),center=M.width/2;
      ctx.fillStyle='#a59b79';ctx.globalAlpha=.28;
      for(let i=0;i<3;i++){const x=center+(rnd()-.5)*half*1.6;ctx.beginPath();ctx.ellipse(x,y+rnd()*30,3+depth*5,2+depth*3,.3,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;
      for(const side of [-1,1]){
        const x=center+side*(half+55+rnd()*45),size=D.treeSize*(.5+depth*.7);
        ctx.fillStyle='#302b21';ctx.fillRect(x-size*.07,y-size*.25,size*.14,size*.65);
        ctx.fillStyle=['#354629','#293e29','#25392b'][section];
        for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x+(i-1)*size*.23,y-size*.45-i*size*.12,size*.38,size*.32,.2,0,Math.PI*2);ctx.fill();}
      }
    }
    ctx.restore();return true;
  },
  // 森以外でも足元の道と目印が通り過ぎる。静止画のパンだけに依存しない。
  // 入口は明るい開けた空間、道中は薄霧、奥地は濃い影と光源。
  // 画像を置き換えず、ステージ遷移に合わせて背景の空気感を連続補間する。
  // 画面の外縁を通過する近景。遠景のパンより速く動くことで奥行きを作る。
  drawForegroundParallax(ctx, w, s) {
    if(!this.enabled(w,s)||WYD.world.isBossRoom(s))return false;
    const M=WYD.data.map, D=WYD.data.dungeon, profile=D.areas[s.area];
    if(!profile)return false;
    const offset=this.routeDistance(w,s)*1.65;
    const gap=175,first=Math.floor((offset-M.height)/gap),last=Math.ceil(offset/gap);
    ctx.save();
    for(let n=first;n<=last;n++){
      const y=offset-n*gap, depth=WYD.util.clamp(y/M.height,0,1);
      const rnd=WYD.util.seededRandom(M.decorationSeed+s.floor*59+n*137);
      const size=28+depth*105;
      ctx.globalAlpha=.12+depth*.34;
      for(const side of [-1,1]){
        const x=side<0?-size*.25+rnd()*size*.22:M.width+size*.25-rnd()*size*.22;
        ctx.fillStyle=profile.color;ctx.strokeStyle=profile.light;ctx.lineWidth=2;
        if(profile.kind==='tree'){
          ctx.fillStyle='#27351f';ctx.fillRect(x-size*.09,y-size*.45,size*.18,size);
          ctx.beginPath();ctx.ellipse(x,y-size*.65,size*.6,size*.65,0,0,Math.PI*2);ctx.fill();
        }else if(profile.kind==='column'||profile.kind==='grave'){
          ctx.fillRect(x-size*.25,y-size*.7,size*.5,size*1.25);
          ctx.strokeRect(x-size*.25,y-size*.7,size*.5,size*1.25);
        }else{
          ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x+size*.5,y+size*.1);
          ctx.lineTo(x+size*.15,y+size*.6);ctx.lineTo(x-size*.5,y+size*.35);
          ctx.closePath();ctx.fill();ctx.stroke();
        }
      }
    }
    ctx.restore();return true;
  },
  drawStageAtmosphere(ctx, w, s) {
    if (!this.enabled(w,s) || WYD.world.isBossRoom(s)) return false;
    const M=WYD.data.map, r=w.dungeon;
    const stage=r&&r.floor===s.floor?r.stage:Math.min(2,this.target(s));
    const m=r&&r.move, t=m?WYD.util.clamp(m.time/m.duration,0,1):0;
    const smooth=t*t*(3-2*t);
    const depth=stage+(m?((m.floor?0:m.to)-stage)*smooth:0);
    const darkness=WYD.util.clamp(depth/2,0,1);
    ctx.save();
    const shadow=ctx.createLinearGradient(0,0,0,M.height);
    shadow.addColorStop(0,'rgba(7,12,22,'+(darkness*.34).toFixed(3)+')');
    shadow.addColorStop(.6,'rgba(8,11,19,'+(darkness*.12).toFixed(3)+')');
    shadow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=shadow;ctx.fillRect(0,0,M.width,M.height);
    const fog=ctx.createLinearGradient(0,M.height*.12,0,M.height*.83);
    fog.addColorStop(0,'rgba(205,213,206,0)');
    fog.addColorStop(.55,'rgba(205,213,206,'+(.05+Math.sin(Math.PI*depth/2)*.13).toFixed(3)+')');
    fog.addColorStop(1,'rgba(205,213,206,0)');
    ctx.fillStyle=fog;ctx.fillRect(0,0,M.width,M.height);
    if(depth>1){
      const glow=ctx.createRadialGradient(M.width*.5,M.height*.2,5,M.width*.5,M.height*.2,M.width*.55);
      glow.addColorStop(0,'rgba(242,214,165,'+((depth-1)*.12).toFixed(3)+')');
      glow.addColorStop(1,'rgba(242,214,165,0)');
      ctx.fillStyle=glow;ctx.fillRect(0,0,M.width,M.height);
    }
    ctx.restore();return true;
  },
  drawBiomeRoute(ctx, w, s) {
    if (!this.enabled(w,s) || s.area==='forest' || WYD.world.isBossRoom(s)) return false;
    const D=WYD.data.dungeon, M=WYD.data.map, profile=D.areas[s.area];
    if (!profile) return false;
    const offset=this.routeDistance(w,s), section=Math.min(2,Math.floor(offset/D.forestRoute.travel)%3);
    const tint=profile.color, light=profile.light, center=M.width*.5;
    ctx.save();
    // 奥に細く手前に広がる道。地形色を透過させ、既存背景を残す。
    ctx.globalAlpha=.3;
    ctx.fillStyle=tint;
    ctx.beginPath();ctx.moveTo(center-M.width*.09,0);ctx.lineTo(center+M.width*.09,0);
    ctx.lineTo(center+M.width*.34,M.height);ctx.lineTo(center-M.width*.34,M.height);
    ctx.closePath();ctx.fill();
    ctx.globalAlpha=.22;ctx.strokeStyle=light;ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(center-M.width*.09,0);ctx.lineTo(center-M.width*.34,M.height);
    ctx.moveTo(center+M.width*.09,0);ctx.lineTo(center+M.width*.34,M.height);ctx.stroke();
    // 世界座標で固定された道標が、移動に合わせて画面下へ流れる。
    const gap=115,first=Math.floor((offset-M.height)/gap),last=Math.ceil(offset/gap);
    for(let n=first;n<=last;n++){
      const y=offset-n*gap, depth=WYD.util.clamp(y/M.height,0,1);
      const rnd=WYD.util.seededRandom(M.decorationSeed+s.floor*191+n*73);
      const half=M.width*(.11+.27*depth), size=9+depth*28;
      ctx.globalAlpha=.35+depth*.35;
      for(const side of [-1,1]){
        const x=center+side*(half+20+rnd()*32);
        ctx.fillStyle=tint;ctx.strokeStyle=light;ctx.lineWidth=1.5+depth;
        if(profile.kind==='grave'){
          ctx.beginPath();ctx.arc(x,y-size*.3,size*.38,Math.PI,0);ctx.lineTo(x+size*.38,y+size*.5);ctx.lineTo(x-size*.38,y+size*.5);ctx.closePath();ctx.fill();ctx.stroke();
        }else if(profile.kind==='crystal'||profile.kind==='ice'){
          ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x+size*.4,y+size*.3);ctx.lineTo(x,y+size*.55);ctx.lineTo(x-size*.4,y+size*.3);ctx.closePath();ctx.fill();ctx.stroke();
        }else if(profile.kind==='column'){
          ctx.fillRect(x-size*.25,y-size,size*.5,size*1.7);ctx.strokeRect(x-size*.25,y-size,size*.5,size*1.7);
        }else if(profile.kind==='lava'){
          ctx.beginPath();ctx.ellipse(x,y,size*.7,size*.28,0,0,Math.PI*2);ctx.fill();ctx.stroke();
        }
      }
      // 道の中心にある石目地も同じ速度で流す。
      ctx.globalAlpha=.17;ctx.strokeStyle=light;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(center-size*.7,y);ctx.lineTo(center+size*.7,y);ctx.stroke();
    }
    ctx.restore();return true;
  },
  drawProps(ctx, w, s) {
    if (!this.enabled(w, s)) return;
    const D = WYD.data.dungeon, M = WYD.data.map, profile = D.areas[s.area], v = this.view(s, w);
    // 区間ごとに装飾の配置を変え、同じ背景のパンだけに見えないようにする。
    // 固定シードなので描画フレームごとに揺れず、戦闘乱数にも影響しない。
    const stage = w.dungeon && w.dungeon.floor === s.floor ? w.dungeon.stage : Math.min(2, this.target(s));
    const rnd = WYD.util.seededRandom(M.decorationSeed + s.floor * 101 + stage * 1009);
    ctx.save(); ctx.globalAlpha = D.props.alpha;
    for (let i = 0; i < D.props.count; i++) {
      const x = (i % 2 ? 0.9 : 0.08) * M.width + rnd() * 35 - (v.x - 0.5) * D.props.travelX;
      const y = rnd() * M.height + (v.y - 0.5) * D.props.travelY;
      const size = D.props.size * (0.75 + rnd() * 0.5);
      // 区間を象徴する大きな目印。外周に限定し戦闘の視認性を守る。
      const landmark = i === (stage * 3 + 1) % D.props.count;
      const propSize = landmark ? size * 1.85 : size;
      // 大きな目印は地形固有のシルエットを追加。敵やドロップには干渉しない。
      if (landmark && profile.kind !== 'tree') {
        ctx.save();
        ctx.globalAlpha = Math.min(1, D.props.alpha + 0.2);
        ctx.strokeStyle = profile.light; ctx.fillStyle = profile.color; ctx.lineWidth = 3;
        if (profile.kind === 'grave') {
          ctx.beginPath();ctx.arc(x,y-propSize*.7,propSize*.55,Math.PI,0);ctx.lineTo(x+propSize*.55,y+propSize*.5);ctx.lineTo(x-propSize*.55,y+propSize*.5);ctx.closePath();ctx.fill();ctx.stroke();
          ctx.beginPath();ctx.moveTo(x,y-propSize*.9);ctx.lineTo(x,y+propSize*.1);ctx.moveTo(x-propSize*.2,y-propSize*.4);ctx.lineTo(x+propSize*.2,y-propSize*.4);ctx.stroke();
        } else if (profile.kind === 'crystal' || profile.kind === 'ice') {
          for (const [shift,scale] of [[-0.55,.65],[0,1.3],[.55,.8]]) {
            ctx.beginPath();ctx.moveTo(x+shift*propSize,y-scale*propSize*1.3);ctx.lineTo(x+(shift+.3)*propSize,y);ctx.lineTo(x+(shift-.3)*propSize,y);ctx.closePath();ctx.fill();ctx.stroke();
          }
        } else if (profile.kind === 'column') {
          ctx.fillRect(x-propSize*.75,y-propSize*1.4,propSize*1.5,propSize*.22);
          ctx.fillRect(x-propSize*.6,y-propSize*1.18,propSize*.2,propSize*1.7);
          ctx.fillRect(x+propSize*.4,y-propSize*1.18,propSize*.2,propSize*1.7);
          ctx.strokeRect(x-propSize*.75,y-propSize*1.4,propSize*1.5,propSize*.22);
        } else if (profile.kind === 'lava') {
          ctx.beginPath();ctx.ellipse(x,y,propSize*1.1,propSize*.36,0,0,Math.PI*2);ctx.fill();ctx.stroke();
          for (const shift of [-.55,0,.55]) {ctx.beginPath();ctx.moveTo(x+shift*propSize,y);ctx.lineTo(x+(shift+.2)*propSize,y-propSize*(.6+Math.abs(shift)));ctx.stroke();}
        }
        ctx.restore();
      }
      ctx.fillStyle = profile.color; ctx.strokeStyle = profile.light; ctx.lineWidth = 2;
      if (profile.kind === 'tree') {
        ctx.fillStyle = '#4a4034';ctx.fillRect(x - 4, y - propSize/2, 8, propSize*1.5);
        ctx.fillStyle = profile.color;
        for (let leaf=0;leaf<3;leaf++) { ctx.beginPath();ctx.ellipse(x+(leaf-1)*propSize/4,y-propSize/3-leaf*propSize/6,propSize/3,propSize/3,-0.3,0,Math.PI*2);ctx.fill(); }
        ctx.strokeStyle=profile.light;ctx.beginPath();ctx.moveTo(x,y+propSize);ctx.lineTo(x,y-propSize/2);ctx.stroke();
      } else if (profile.kind === 'crystal' || profile.kind === 'ice') {
        ctx.beginPath();ctx.moveTo(x, y-propSize);ctx.lineTo(x+propSize/3,y);ctx.lineTo(x-propSize/3,y);ctx.closePath();ctx.fill();ctx.stroke();
      } else {
        ctx.fillRect(x-propSize/4,y-propSize,propSize/2,propSize); ctx.strokeRect(x-propSize/4,y-propSize,propSize/2,propSize);
        if (profile.kind === 'column') { ctx.fillRect(x-propSize/3,y-propSize,propSize*2/3,5);ctx.fillRect(x-propSize/3,y-5,propSize*2/3,5); }
        if (profile.kind === 'lava') { ctx.beginPath();ctx.ellipse(x,y,propSize,propSize/3,0,0,Math.PI*2);ctx.fill(); }
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
