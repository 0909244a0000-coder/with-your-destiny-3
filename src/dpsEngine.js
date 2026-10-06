// メモリStorageの専用フレーム。通常のPvE計算を使い、成長/報酬/敵の行動は止める。
window.WYD=window.WYD||{};
WYD.dpsEngine={
 init(classId,snapshot,options,images){
  WYD.classes.activeId=()=>classId;WYD.classes.apply();localStorage.setItem(WYD.save.KEY,JSON.stringify(snapshot));
  this.state=WYD.save.load();this.options=options;this.world=WYD.world.create();const s=this.state,w=this.world,W=WYD.world,D=WYD.data.dps;
  WYD.state=s;WYD.currentWorld=w;WYD.ui={state:s,world:w,log(){},markDirty(){},changed(){},notice(){},paused:false};WYD.save.write=()=>{};WYD.sound.play=()=>{};
  WYD.render.images=images.images;WYD.render.getImage=images.getImage;
  s.settings.autoSkill=false;s.pendingLoot=[];s.difficulty=1;w.town=false;w.time=0;
  const no=()=>{};for(const method of ['updateFloors','updateSpawns','updateEnemies','updateDrops','enemyDied','enrage'])W[method]=no;
  WYD.offline.tick=WYD.trial.tick=WYD.records.add=WYD.shrines.update=WYD.breach.update=no;WYD.trial.active=()=>false;
  const area=W.area(s);W.area=()=>({...area,name:'野営地・訓練場',sceneImage:null,groundImage:WYD.data.town.groundImage,groundTint:null,bgColor:WYD.data.town.ground});W.floorName=()=>'';
  WYD.data.enemies.dpsDummy={...D.dummy};const stats=WYD.stats.compute(s),hp=Math.max(D.minHp,stats.attack*D.hpAttackScale);
  Object.assign(w.player,{x:D.playerPos.x,y:D.playerPos.y,hp:stats.maxHp*options.playerHpRatio,maxHp:stats.maxHp});
  for(let i=0;i<options.count;i++){
   const x=D.targetPos.x+(i%2)*D.spacing,y=D.targetPos.y+(i-(options.count-1)/2)*D.spacing;
   const e={id:w.nextId++,kind:'dpsDummy',dummy:true,hp:hp*options.hpRatio,maxHp:hp,defense:options.defense,attack:0,boss:options.boss,enraged:true,stunTimer:0,hitFlash:0,attackTimer:0,moveSpeedMult:1,attackSpeedMult:1};
   Object.defineProperties(e,{x:{enumerable:true,get:()=>x,set:no},y:{enumerable:true,get:()=>y,set:no}});w.enemies.push(e);
  }
  // 残りHPで与ダメージを切らず、討伐/報酬は発生させない。HP差を使う吸血/ルーンにも対応。
  const damage=W.damageEnemy;W.damageEnemy=function(world,state,e,amount,crit,source='attack',canCrit=true){
   if(!e.dummy)return damage.call(this,world,state,e,amount,crit,source,canCrit);
   if(!Number.isFinite(amount)||amount<=0)return;
   WYD.results.add(world,source,{damage:amount,hits:1,eligible:canCrit?1:0,crits:canCrit&&crit?1:0});
   e.hp=Math.max(1,e.hp-amount);e.hitFlash=.1;this.logDamage(world,amount);this.addText(world,e.x,e.y,crit?`${Math.round(amount)}!`:`${Math.round(amount)}`,crit?'#ffd447':'#ffffff',crit);WYD.fx.hit(world,e,crit);
  };
  WYD.render.drawEnemy=(ctx,e)=>this.drawDummy(ctx,e);WYD.render.drawBossBar=no;
  WYD.results.reset(w);return this;
 },
 advance(dt){
  const w=this.world,s=this.state;w.player.hp=WYD.stats.compute(s).maxHp*this.options.playerHpRatio;for(const e of w.enemies)e.hp=e.maxHp*this.options.hpRatio;
  WYD.world.update(w,s,dt);for(const e of w.enemies){e.hp=e.maxHp*this.options.hpRatio;e.hitFlash=Math.max(0,e.hitFlash-dt);e.stunTimer=Math.max(0,e.stunTimer-dt);}
 },
 snapshot(){return WYD.results.snapshot(this.world);},
 draw(ctx){WYD.render.draw(ctx,this.world,this.state);},
 drawDummy(ctx,e){
  const V=WYD.data.dps.visual,width=V.width,height=V.height;ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle=V.wood;ctx.strokeStyle=V.edge;ctx.lineWidth=3;
  ctx.fillRect(-width/2,-height,width,height*.65);ctx.strokeRect(-width/2,-height,width,height*.65);ctx.beginPath();ctx.moveTo(0,-height*.35);ctx.lineTo(0,0);ctx.moveTo(-width*.35,0);ctx.lineTo(width*.35,0);ctx.stroke();
  ctx.strokeStyle=e.hitFlash>0?V.hit:V.target;for(const scale of [1,.55]){ctx.beginPath();ctx.arc(0,-height*.65,width*.3*scale,0,Math.PI*2);ctx.stroke();}
  const shown=ctx.canvas.clientWidth/WYD.data.map.width||1;ctx.font=`${Math.max(V.font,V.minFont/shown)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle=V.target;ctx.fillText(e.boss?'ボス標的':'訓練標的',0,-height-V.font);ctx.restore();
 }
};
