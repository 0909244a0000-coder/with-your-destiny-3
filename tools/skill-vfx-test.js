// node tools/skill-vfx-test.js：画像読込、コマ境界、命中位置、7職・390px・3対3。
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));await page.click('#modal-ok');
 await page.evaluate(()=>{WYD.resetting=true;WYD.state.settings.speed=0;for(const k of Object.keys(WYD.data.vfx.atlases))WYD.vfx.img(k);});
 await page.waitForFunction(()=>Object.keys(WYD.data.vfx.atlases).every(k=>WYD.vfx.has(k)));
 const frames=await page.evaluate(()=>{
  const V=WYD.vfx,D=WYD.data.vfx,ctx=document.createElement('canvas').getContext('2d'),calls=[],native=ctx.drawImage.bind(ctx);ctx.drawImage=(...a)=>{calls.push(a.slice(1));native(...a)};
  let valid=true,maxDraws=0;for(const key of Object.keys(D.atlases))for(const t of [-1,0,.05,.5,.999,1,2]){
   const start=calls.length;V.frame(ctx,key,V.img(key),0,0,120,120,t);maxDraws=Math.max(maxDraws,calls.length-start);
   for(const a of calls.slice(start))if(a.length!==8||a.some(x=>!Number.isFinite(x))||a[0]<0||a[1]<0||a[0]+a[2]>768||a[1]+a[3]>768||a[2]!==384||a[3]!==384)valid=false;
  }
  const old=calls.length;V.draw(ctx,{key:'frostCrown',time:-.1,duration:.6});const delayed=calls.length===old;
  V.draw(ctx,{key:'holyJudgment',x:0,y:0,size:1000,time:1,duration:1,travel:1,fall:0,angle:0,spin:0,from:1,to:1,additive:true,boost:1});
  const finite=calls.every(a=>a.every(Number.isFinite)),w={effects:[]};for(let i=0;i<D.maxEffects+20;i++)V.spawn(w,'frostCrown',0,0);const bounded=w.effects.length===D.maxEffects;
  const alpha=[];ctx.drawImage=(...a)=>{alpha.push(ctx.globalAlpha);native(...a)};WYD.state.settings.quietFx=false;V.drawLoop(ctx,'stormColumn',50,50,200,.2);const normal=Math.max(...alpha);alpha.length=0;WYD.state.settings.quietFx=true;V.drawLoop(ctx,'stormColumn',50,50,200,.2);const quiet=Math.max(...alpha)<normal;WYD.state.settings.quietFx=false;
  return{valid,maxDraws,delayed,finite,bounded,quiet};
 });assert(frames.valid&&frames.delayed&&frames.finite&&frames.bounded&&frames.quiet);assert(frames.maxDraws<=2);
 // 主力技の専用絵（PR114）がある7職。傀儡師の演出は puppeteer-test.js で確認する。
 const ids=['barbarian','sorceress','necromancer','paladin','assassin','druid','bombmancer'],fixtures={},casts=[];
 for(const id of ids){await page.evaluate(id=>{WYD.resetting=true;localStorage.setItem('wyd3-active-class',id)},id);await page.reload();await page.evaluate(()=>{WYD.resetting=true;WYD.state.settings.speed=0;for(const k of Object.keys(WYD.data.vfx.atlases))WYD.vfx.img(k)});await page.waitForFunction(()=>Object.keys(WYD.data.vfx.atlases).every(k=>WYD.vfx.has(k)));
  const result=await page.evaluate(()=>{
   const id=WYD.classes.id,skill={barbarian:'whirl',sorceress:'sorc_nova',necromancer:'nec_nova',paladin:'pal_judgment',assassin:'asn_blade',druid:'dru_tornado',bombmancer:'bomb_brand'}[id];
   const s=WYD.save.newState();s.player.level=40;s.settings.speed=0;s.seenHelp=true;for(const k in WYD.data.skills){s.player.skills[k]=6;s.player.skillEnabled[k]=true;}
   const stats=WYD.stats.compute(s),w=WYD.world.create();w.town=false;Object.assign(w.player,{x:400,y:300,hp:stats.maxHp,maxHp:stats.maxHp});w.enemies=[0,1,2].map(i=>({id:100+i,kind:'preta',x:440+i*15,y:300,hp:1e9,maxHp:1e9,defense:0,stunTimer:0}));WYD.results.init(w);WYD.world.castingId=skill;
   if(id==='necromancer')w.necRemains=[{x:455,y:300,life:10}];
   const def=WYD.runes.effectiveDef(s,skill),used=WYD.world.skillHandlers[WYD.classes.kindOf(skill)].call(WYD.world,w,s,stats,def,6);WYD.vfx.cast(w,skill,w.player.x,w.player.y,def.radius);
   if(id==='bombmancer')WYD.bombs.explode(w,s,stats,{x:440,y:300,radius:80,attack:10,source:skill,extra:{}});
   const key=id==='druid'?WYD.data.vfx.stormTexture:id==='bombmancer'?WYD.data.vfx.bombTexture:id==='paladin'?WYD.data.vfx.fieldCast[skill]:WYD.data.vfx.impactSkills[skill],effect=w.effects.find(e=>e.key===key);
   const located=id==='druid'?w.classTasks.some(t=>t.mode==='storm'):!!effect&&(id!=='necromancer'||effect.x===455)&&(id!=='paladin'||effect.x===440);
   const ctx=document.createElement('canvas').getContext('2d');for(const t of [0,.08,.2,.4,.6]){for(const e of w.effects){e.time=t;WYD.render.drawEffect(ctx,e)}w.time=t;WYD.classSpecialization.draw(ctx,w);}
   return{id,used,located,key,state:s};
  });assert(result.used&&result.located,JSON.stringify(result));fixtures[id]=result.state;delete result.state;casts.push(result);
 }
 await page.evaluate(fixtures=>{for(const[id,s]of Object.entries(fixtures))localStorage.setItem(WYD.arena.key(id),JSON.stringify(s));WYD.resetting=true},fixtures);
 const arena=await page.evaluate(async()=>{const A=WYD.arena;A.open();const ids=['barbarian','sorceress','necromancer','paladin','assassin','druid'];const teams=Object.fromEntries(ids.map((id,i)=>[id,i<3?'A':'B']));const before=JSON.stringify(WYD.state);await A.start(ids,'teams',false,teams);/* 対人の不動の大盾はHP70%以下から守りの技を使う（data/arena.js の powerMods） */for(const f of A.fighters)f.engine.world.player.hp=f.engine.world.player.maxHp*.6;let seen=new Set();/* 6秒では技の出方しだいで3種そろわないことがあるので12秒見る */for(let i=0;i<240&&A.running;i++){A.advance();for(const f of A.fighters)for(const ef of f.engine.world.effects)if(WYD.data.vfx.atlases[ef.key])seen.add(ef.key);A.draw();}return{seen:[...seen],unchanged:JSON.stringify(WYD.state)===before,overflow:document.documentElement.scrollWidth>390};});assert(arena.unchanged&&!arena.overflow);assert(arena.seen.length>=3,"arena vfx "+JSON.stringify(arena));
 fs.mkdirSync(path.resolve(__dirname,'../results'),{recursive:true});await page.evaluate(()=>{document.getElementById('modal').hidden=true;WYD.arena.renderStatus(true)});await page.locator('#arena-canvas').scrollIntoViewIfNeeded();await page.screenshot({path:path.resolve(__dirname,'../results/skill-vfx-390.png')});
 await page.setViewportSize({width:1100,height:900});await page.evaluate(()=>WYD.arena.draw());await page.locator('#arena-canvas').screenshot({path:path.resolve(__dirname,'../results/skill-vfx-teams.png')});
 await page.evaluate(()=>{WYD.arena.close();const canvas=document.createElement('canvas');canvas.id='vfx-gallery';canvas.width=1000;canvas.height=Math.ceil(Object.keys(WYD.data.vfx.atlases).length/4)*300;Object.assign(canvas.style,{position:'fixed',top:0,left:0,zIndex:9999});document.body.append(canvas);const ctx=canvas.getContext('2d'),keys=Object.keys(WYD.data.vfx.atlases),bg=WYD.render.getImage(WYD.data.arena.background);ctx.fillStyle='#211c26';ctx.fillRect(0,0,1000,canvas.height);if(bg)ctx.drawImage(bg,0,0,1000,canvas.height);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,0,1000,canvas.height);keys.forEach((key,i)=>{const x=125+i%4*250,y=170+Math.floor(i/4)*300,w={effects:[]};WYD.vfx.spawn(w,key,x,y,{size:190});const e=w.effects[0];e.time=e.duration*.48;WYD.vfx.draw(ctx,e);ctx.fillStyle='#ddd6be';ctx.textAlign='center';ctx.font='16px sans-serif';ctx.fillText(key,x,y+90);});});
 await page.locator('#vfx-gallery').screenshot({path:path.resolve(__dirname,'../results/skill-vfx-gallery.png')});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({frames,casts,arena,errors},null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
