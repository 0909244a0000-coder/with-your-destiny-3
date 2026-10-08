// 習得と装着は保存。追加攻撃は既存の有限classTasksに入り、階移動/死亡で破棄。
window.WYD=window.WYD||{};
WYD.training={
 list(state){const id=state.classId||WYD.classes.id;return WYD.data.training.arts.filter(a=>a.classId===id||WYD.data.classes[id]?.collect);},   // 蒐集者は全職業の秘技から選べる
 ensure(state){
  const pg=state.player.paragon,old=pg.training||{},owned={};
  for(const a of this.list(state))if(Number.isSafeInteger(old.owned?.[a.id])&&old.owned[a.id]>0)owned[a.id]=old.owned[a.id];
  return pg.training={owned,active:owned[old.active]?old.active:null};
 },
 current(state){const t=this.ensure(state);return this.list(state).find(a=>a.id===t.active)||null;},
 learn(state,id){const a=this.list(state).find(a=>a.id===id),t=this.ensure(state),pg=state.player.paragon,cost=WYD.data.training.cost;if(!a||t.owned[id]||pg.points<cost)return false;pg.points-=cost;t.owned[id]=cost;t.active=id;return true;},
 equip(state,id){const t=this.ensure(state);if(id!==null&&!t.owned[id])return false;t.active=id;return true;},
 refund(state){const t=this.ensure(state),points=Object.values(t.owned).reduce((n,v)=>n+v,0);state.player.paragon.points+=points;state.player.paragon.training={owned:{},active:null};return points;},
 art(w,a,cell,pos){WYD.runeSkills.art(w,{element:a.element,shape:'field',trait:'bind'},cell,pos.x,pos.y,{size:a.radius||WYD.data.training.effectSize});},
 bind(e,a){if(a.bind&&e.hp>0&&!e.shielded)e.stunTimer=Math.max(e.stunTimer||0,a.bind*(e.boss?a.bossScale:1));},
 execute(w,state,stats,t){
  const a=t.art;if(this.current(state)?.id!==a.id||w.player.dead||w.town)return;
  const E=WYD.arenaEngine,old=E?.supportSource;if(E)E.supportSource='skill:'+a.skill;
  try{for(const e of w.enemies.slice())if(e.hp>0&&WYD.util.dist(t,e)<=a.radius+(e.radius||WYD.data.enemies[e.kind]?.radius||0)){WYD.world.playerHit(w,state,stats,e,t.attack,'skill:'+a.skill);this.bind(e,a);if(w.player.dead)break;}this.art(w,a,'impact',t);}finally{if(E)E.supportSource=old;}
 },
 onCast(w,state,stats,s,lv,before){
  const a=this.current(state),p=w.player;if(!a||a.skill!==before.id||p.dead)return;
  const now=w.time||0;p.trainingReady||={};if((p.trainingReady[a.id]||0)>now)return;p.trainingReady[a.id]=now+(a.cooldown||0);
  const S=WYD.classSpecialization,scale=stats.attack*(1+stats.skillDamage/100),target=before.target;
  const queue=(pos,delay=a.delay)=>S.queue(w,{mode:'training',id:a.skill,extra:before.extra,art:a,x:pos.x,y:pos.y,delay,attack:scale*(a.mult||0)});
  if(a.mode==='pull'){
   for(const e of w.enemies)if(e.hp>0&&!e.boss&&WYD.util.dist(p,e)<=a.radius){const d=WYD.util.dist(p,e),step=Math.min(a.distance,d),M=WYD.data.map;if(d>0){e.x=WYD.util.clamp(e.x+(p.x-e.x)/d*step,WYD.data.training.border,M.width-WYD.data.training.border);e.y=WYD.util.clamp(e.y+(p.y-e.y)/d*step,WYD.data.training.border,M.height-WYD.data.training.border);this.art(w,a,'pull',e);}}
  }else if(a.mode==='area')queue(before);
  else if(a.mode==='targetArea')queue(target||before);
  else if(a.mode==='midpoint'&&target)queue({x:(p.x+target.x)/2,y:(p.y+target.y)/2});
  else if(a.mode==='pulses'){const f=w.fields[before.fields];if(f)for(let i=0;i<a.count;i++)queue(f,a.delay+i*a.interval);}
  else if(a.mode==='chain'||a.mode==='fork'){
   const origin=a.mode==='fork'?target:p;if(!origin)return;
   const E=WYD.arenaEngine,old=E?.supportSource;if(E)E.supportSource='skill:'+a.skill;
   try{for(const e of w.enemies.filter(e=>e.hp>0&&(a.mode!=='fork'||e!==target.ref)&&WYD.util.dist(origin,e)<=a.range).sort((x,y)=>WYD.util.dist(origin,x)-WYD.util.dist(origin,y)).slice(0,a.count)){
    if(p.dead)break;WYD.runeSkills.link(w,{element:a.element,shape:'chain',trait:'bind'},origin,e);WYD.world.playerHit(w,state,stats,e,scale*a.mult,'skill:'+a.skill);this.bind(e,a);
   }}finally{if(E)E.supportSource=old;}
  }else if(a.mode==='corpses'){
   const R=WYD.data.classSpecialization.skills.nec_nova,list=w.necRemains||(w.necRemains=[]);for(let i=0;i<a.count;i++){const pos={x:WYD.util.clamp(p.x+(i%2?1:-1)*a.spread,WYD.data.training.border,WYD.data.map.width-WYD.data.training.border),y:p.y,life:R.corpseLife,training:true};list.push(pos);this.art(w,a,'impact',pos);}while(list.length>R.maxCorpses)list.shift();
  }else if(a.mode==='reverseOrbit'){
   const tasks=(w.classTasks||[]).slice(before.tasks).filter(t=>t.mode==='orbit'),start=tasks[0]?.angle;if(start==null)return;
   for(const t of tasks)S.queue(w,{...t,angle:start-(t.angle-start),attack:t.attack*a.mult});
   for(const o of (w.classOrbits||[]).slice(before.orbits))if(w.classOrbits.length<WYD.data.classSpecialization.maxTasks)w.classOrbits.push({...o,speed:-o.speed});
  }else if(a.mode==='twinStorm'){
   for(const t of (w.classTasks||[]).slice(before.tasks).filter(t=>t.mode==='storm')){if(w.classTasks.length>=WYD.data.classSpecialization.maxTasks)break;const angle=Math.atan2(t.dy,t.dx),copy={...t};t.dx=Math.cos(angle-a.angle);t.dy=Math.sin(angle-a.angle);t.attack*=a.mult;copy.dx=Math.cos(angle+a.angle);copy.dy=Math.sin(angle+a.angle);copy.attack*=a.mult;S.queue(w,copy);}
  }else if(a.mode==='twinHunter'){
   for(const b of (w.bombs||[]).slice(before.bombs).filter(b=>b.mode==='hunter')){if(w.bombs.length>=WYD.data.bombs.maxActive)break;b.attack*=a.mult;b.x-=a.offset;w.bombs.push({...b,x:b.x+a.offset*2});}
  }else if(a.mode==='healFriend'){
   const E=WYD.arenaEngine,players=E?.bridge?.teamBattle?E.bridge.friends(E).map(f=>f.world.player):[],friends=[...new Set([p,...w.allies,...players])].filter(x=>x.hp>0&&!x.dead&&x.hp<x.maxHp&&WYD.util.dist(p,x)<=a.radius).sort((x,y)=>x.hp/x.maxHp-y.hp/y.maxHp),friend=friends[0];if(!friend)return;
   const amount=friend.maxHp*a.healPercent/100,source='skill:'+a.skill;
   if(friend===p)WYD.world.healPlayer(w,stats.maxHp,amount,source);else{const actual=Math.min(friend.maxHp-friend.hp,amount*(E?.bridge?E.healFactor():1));friend.hp+=actual;if(E?.bridge?.teamBattle)E.recordSupport(source,'allyHealing',actual);}this.art(w,a,'heal',friend);
  }
 },
 html(state){
  const t=this.ensure(state),D=WYD.data.training,esc=WYD.results.escape;
  return `<section class="training-arts"><h3>秘技修練</h3><p>1種類${D.cost}ポイントで習得・発動は${D.activeLimit}種類。切り替えは無料。対応するクラス技を覚えてONにすると発動します。追加ダメージは元の技のリザルトに合算。</p>${this.list(state).map(a=>{const owned=!!t.owned[a.id],active=t.active===a.id,on=state.player.skills[a.skill]>0&&state.player.skillEnabled[a.skill];return `<article class="training-card${active?' active':''}"><h4>${esc(a.name)} ${active?'〔選択中〕':owned?'〔習得済み〕':''}</h4><p>${esc(a.desc)}</p><small>対応：${esc(WYD.data.skills[a.skill]?.name||a.skill)} · ${on?'ON':'未習得 / OFF：現在は発動しません'}</small><button data-training-action="${owned?'equip':'learn'}" data-training-id="${a.id}" ${active||(!owned&&state.player.paragon.points<D.cost)?'disabled':''}>${active?'選択中':owned?'この秘技を使う':`習得して使う（${D.cost}ポイント）`}</button></article>`}).join('')}<div class="training-actions"><button data-training-action="off" ${t.active?'':'disabled'}>秘技を外す</button><button data-training-action="refund" ${Object.keys(t.owned).length?'':'disabled'}>秘技だけ振り直す（全ポイント返却）</button></div></section>`;
 }
};
for(const kind of Object.keys(WYD.world.skillHandlers)){
 const base=WYD.world.skillHandlers[kind];WYD.world.skillHandlers[kind]=function(w,state,stats,s,lv){
  const target=WYD.world.nearestEnemy(w,w.player),before={id:this.castingId,extra:this.castExtra,x:w.player.x,y:w.player.y,target:target&&{x:target.x,y:target.y,ref:target},tasks:w.classTasks?.length||0,orbits:w.classOrbits?.length||0,fields:w.fields.length,bombs:w.bombs?.length||0};
  const used=base.call(this,w,state,stats,s,lv);if(used)WYD.training.onCast(w,state,stats,s,lv,before);return used;
 };
}
