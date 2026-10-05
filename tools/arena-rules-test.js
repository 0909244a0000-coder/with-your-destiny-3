// node tools/arena-rules-test.js：単発/連続の上限・実ダメージ吸血/反射・拘束耐性・消耗。
const {chromium}=require('playwright'), assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.resolve(__dirname,'../index.html'));
 const checks=await page.evaluate(async()=>{
  WYD.resetting=true;const s=JSON.parse(JSON.stringify(WYD.state));s.classId='sorceress';s.player.level=40;localStorage.setItem(WYD.arena.key('sorceress'),JSON.stringify(s));
  WYD.arena.open();const A=WYD.arena;await A.start(['barbarian','sorceress'],'duel',false);
  const original=JSON.stringify(WYD.state);
  const [a,b]=A.fighters, E=a.engine,F=b.engine,D=a.frame.contentWindow.WYD,C=D.data.arena.combat,p=E.world.player,q=F.world.player;
  E.setEnemies(F.units());F.setEnemies(E.units());E.stats.powers={};F.stats.powers={};E.stats.effects.thorns=0;F.stats.effects.thorns=0;
  const near=(a,b)=>Math.abs(a-b)<1e-7,reset=()=>{E.incoming=new WeakMap();F.incoming=new WeakMap();p.hp=p.maxHp;q.hp=q.maxHp;A.time=0;};
  reset();const h=q.hp;D.world.damageEnemy(E.world,E.state,q,1e9,false);const single=near(h-q.hp,q.maxHp*C.hitHpCap);
  D.world.damageEnemy(E.world,E.state,q,1e9,false,'merc:mage');D.world.damageEnemy(E.world,E.state,q,1e9,false,'effect:thunder');
  const sharedWindow=near(h-q.hp,q.maxHp*C.windowHpCap);
  A.time=.99;const current=q.hp;D.world.damageEnemy(E.world,E.state,q,1e9,false);const sliding=q.hp===current;
  A.time=1.01;D.world.damageEnemy(E.world,E.state,q,1e9,false);const expires=q.hp<current;
  reset();F.stats.effects.thorns=1e6;const ph=p.hp;D.world.damageEnemy(E.world,E.state,q,1e9,false);const reflection=near(ph-p.hp,Math.min(q.maxHp*C.hitHpCap*C.reflectRatioCap,p.maxHp*C.hitHpCap));F.stats.effects.thorns=0;
  reset();p.hp=p.maxHp/2;const before=p.hp;D.world.castExtra={lifesteal:100};E.stats.effects.lifesteal=0;D.world.calcDamage=()=>({damage:1e9,crit:false});
  D.world.playerHit(E.world,E.state,E.stats,q,1e9,'skill:whirl');const lifesteal=near(p.hp-before,q.maxHp*C.hitHpCap*C.healScale);D.world.castExtra=null;
  reset();p.hp=p.maxHp/2;const hh=p.hp;D.world.healPlayer(E.world,p.maxHp,10,'skill:vajra');const healing=near(p.hp-hh,10*C.healScale);
  A.time=C.pressureStart+C.pressureRamp;const end=p.hp;D.world.healPlayer(E.world,p.maxHp,10,'skill:vajra');const pressureHeal=near(p.hp-end,10*C.healScale*C.pressureHealMin);const pressureDamage=near(E.pressureDamage(),C.pressureDamageMax);
  A.time=0;q.stunTimer=10;const bind=q.stunTimer===C.bindMax;q.stunTimer=q.stunTimer-.1;const remaining=q.stunTimer;q.stunTimer=10;const noExtend=q.stunTimer===remaining;
  q.stunTimer=0;A.time=C.bindMax+C.bindImmunity-.01;q.stunTimer=10;const immune=q.stunTimer===0;A.time+=.02;q.stunTimer=10;const recovery=q.stunTimer===C.bindMax;
  reset();const def=D.data.mercenary.types[0];const ally=D.allies.spawn(E.world,E.stats,{...def,hpRatio:.5,spawnSpread:0,firstAttackDelay:0,duration:20},.5,'merc');F.setEnemies(E.units());const hp=ally.hp;b.frame.contentWindow.WYD.world.damageEnemy(F.world,F.state,ally,1e9,false);const summon=near(hp-ally.hp,ally.maxHp*C.summonHitHpCap);
  const unchanged=JSON.stringify(WYD.state)===original;A.close();
  return{single,sharedWindow,sliding,expires,reflection,lifesteal,healing,pressureHeal,pressureDamage,bind,noExtend,immune,recovery,summon,unchanged};
 });for(const[k,v]of Object.entries(checks)){assert.equal(v,true,k);console.log('ok',k);}assert.deepEqual(errors,[]);console.log('errors 0');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
