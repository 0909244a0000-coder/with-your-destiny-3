// node tools/collector-test.js：蒐集者（全職業の技・同時召喚・後片づけ・検証モード・計測と比較・元職のコピー・専用演出・既存セーブ不変）。
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url='file://'+path.resolve(__dirname,'../index.html');await page.goto(url);
 // 既存キャラのセーブ（変わらないことを確かめる）
 await page.evaluate(()=>{WYD.resetting=true;localStorage.clear();localStorage.setItem('wyd3-active-class','necromancer');});await page.reload();
 await page.evaluate(()=>{WYD.resetting=true;const s=JSON.parse(JSON.stringify(WYD.state));s.player.level=33;s.player.skills.nec_raise=7;localStorage.setItem(WYD.save.KEY,JSON.stringify(s));localStorage.setItem('wyd3-active-class','collector');});
 await page.reload();
 const before=await page.evaluate(()=>localStorage.getItem('wyd3-save-v1-necromancer'));

 const core=await page.evaluate(()=>{WYD.resetting=true;const s=WYD.state,w=WYD.currentWorld,C=WYD.collector,D=WYD.data;
  const all=Object.values(D.classes).filter(c=>!c.collect).reduce((n,c)=>n+Object.keys(c.skills||WYD.classes.baseSkills).length,0);
  const sameObjects=Object.keys(D.skills).every(id=>{const c=D.classes[D.collector.owner[id]];return (c.skills||WYD.classes.baseSkills)[id]===D.skills[id];});
  const learned=Object.keys(D.skills).every(id=>s.player.skills[id]>=1);
  const defaults=C.activeIds(s).sort();
  // 人形・骸骨・狼を同時に
  s.settings.speed=0;s.player.level=40;for(const id of ['pup_thread','nec_raise','dru_wolves'])s.player.skills[id]=6;if(w.town)WYD.town.leave(w,s);
  const most={};for(let i=0;i<1200;i++){WYD.world.update(w,s,.05);const c={};for(const a of w.allies){const k=a.puppet?'puppet':a.source;c[k]=(c[k]||0)+1;}for(const k in c)most[k]=Math.max(most[k]||0,c[k]);}
  for(let i=0;i<600&&!(w.allies.some(a=>a.source==='nec_raise')&&w.allies.some(a=>a.source==='dru_wolves')&&w.allies.some(a=>a.puppet));i++)WYD.world.update(w,s,.05);   // 骸骨は時間で崩れるので、3種がそろう瞬間で確かめる
  const st=WYD.stats.compute(s),pup=w.allies.find(a=>a.puppet),pv=pup&&WYD.puppeteer.values(st);
  const rows=Object.keys(WYD.results.snapshot(w).rows);
  // 外したら残らない
  const had={skel:w.allies.some(a=>a.source==='nec_raise'),wolf:w.allies.some(a=>a.source==='dru_wolves'),pup:!!pup};
  C.setEnabled(s,'nec_raise',false,w);const skelGone=!w.allies.some(a=>a.source==='nec_raise'),wolfStays=w.allies.some(a=>a.source==='dru_wolves');
  C.setEnabled(s,'pup_thread',false,w);const pupGone=!w.allies.some(a=>a.puppet);
  // 罠・オーラ・守り・変身・床・予約攻撃も
  w.traps.push({source:'asn_sentry',x:1,y:1});w.player.auras={pal_might:{}};w.player.buff={source:'vajra'};w.player.form={id:'dru_bear'};w.fields.push({source:'skill:agni'});(w.bombs||(w.bombs=[])).push({source:'bomb_brand'});(w.classTasks||(w.classTasks=[])).push({id:'whirl'});
  for(const id of ['asn_sentry','pal_might','vajra','dru_bear','agni','bomb_brand','whirl'])C.cleanup(w,s,id);
  const leftovers=w.traps.length+Object.keys(w.player.auras).length+(w.player.buff?1:0)+(w.player.form?1:0)+w.fields.filter(f=>f.source==='skill:agni').length+w.bombs.length+w.classTasks.length;
  // ふだんは3枠
  for(const id of C.activeIds(s))C.setEnabled(s,id,false,w);const three=['whirl','sorc_meteor','nec_raise','pal_zeal'].map(id=>C.setEnabled(s,id,true,w));
  // 検証モード：制限なし・レベル自由・出ると元に戻る
  const keep=JSON.stringify({sk:s.player.skills,en:s.player.skillEnabled});C.setVerify(s,true,w);
  const many=C.bulk(s,Object.keys(D.skills).filter(id=>D.collector.owner[id]==='paladin'),true,w);C.setLevel(s,'pal_zeal',10);s.collector.noAttack=true;const blocks=C.blocksAttack(s);
  C.setVerify(s,false,w);const restored=JSON.stringify({sk:s.player.skills,en:s.player.skillEnabled})===keep&&!C.blocksAttack(s);
  // 構成の保存と呼び出し
  C.savePreset(s,0,'三つ');for(const id of C.activeIds(s))C.setEnabled(s,id,false,w);const loaded=C.loadPreset(s,0,w)&&C.activeIds(s).length===3&&s.collector.presets[0].name==='三つ';
  return{all,count:Object.keys(D.skills).length,sameObjects,learned,defaults,most,pupHp:pup&&pup.maxHp===pv.maxHp,rows,had,skelGone,wolfStays,pupGone,leftovers,three,many,blocks,restored,loaded,key:WYD.save.KEY};});
 assert.equal(core.count,core.all,'全職業の技の数');assert(core.sameObjects,'元の職業と同じデータを使う');assert(core.learned,'全部の技を最初から選べる');
 assert.deepEqual(core.defaults,['dru_wolves','nec_raise','pup_thread']);
 assert.equal(core.most.puppet,1,'人形');assert(core.most.nec_raise>=2,'骸骨');assert(core.most.dru_wolves>=2,'狼');assert(core.pupHp,'人形の能力は本体のHP・防御から');
 for(const k of ['skill:pup_thread','skill:nec_raise','skill:dru_wolves'])assert(core.rows.includes(k),'集計 '+k);
 assert.deepEqual(core.had,{skel:true,wolf:true,pup:true});assert(core.skelGone&&core.wolfStays&&core.pupGone,'外した技の召喚だけ消える');assert.equal(core.leftovers,0,'外した技のものが残る');
 assert.deepEqual(core.three,[true,true,true,false],'ふだんは3つまで');assert.equal(core.many,9);assert(core.blocks);assert(core.restored,'検証モードを出ると元に戻る');assert(core.loaded,'構成の保存・呼び出し');
 assert.equal(core.key,'wyd3-save-v1-collector');

 // 魔導書の画面：計測（同じ乱数なら同じ結果）・外して比較・元職のコピー（元のセーブは変えない）・不発の理由
 const ui=await page.evaluate(async()=>{WYD.resetting=true;const s=WYD.state,G=WYD.grimoire,C=WYD.collector;
  for(const id of C.activeIds(s))C.setEnabled(s,id,false);for(const id of ['pup_thread','nec_raise','dru_wolves'])C.setEnabled(s,id,true);
  G.open();const visible=!document.getElementById('grimoire').hidden,groups=document.querySelectorAll('.grimoire-group').length,buttons=document.querySelectorAll('.grimoire-skill').length;
  const a=await G.measure(),b=await G.measure();const cmp=await G.compare('dru_wolves');
  G.copyFrom('necromancer');G.$('grimoire-base').value='necromancer';G.$('grimoire-copy-skills').checked=true;const copied=await G.measure();
  G.$('grimoire-base').value='';G.$('grimoire-copy-skills').checked=false;
  C.setVerify(s,true);C.setEnabled(s,'vajra',true);G.$('grimoire-php').value='1';const mis=await G.measure();C.setVerify(s,false);
  const table=document.querySelectorAll('#grimoire-result tbody tr').length;G.close();
  return{visible,groups,buttons,same:a.damage===b.damage&&a.damage>0,cmp:[cmp.with.damage,cmp.without.damage],withoutRow:!cmp.without.rows['skill:dru_wolves'],copied:copied.damage>0&&!!copied.rows['skill:nec_raise'],lab:s.collector.lab.from,
   vajra:mis.misfire.vajra,table};});
 assert(ui.visible);assert.equal(ui.groups,8);assert.equal(ui.buttons,core.count);assert(ui.same,'同じ乱数で同じ結果');
 assert(ui.cmp[0]>ui.cmp[1],'外すとダメージが減る');assert(ui.withoutRow,'外した技は計測に出ない');assert(ui.copied);assert.equal(ui.lab,'necromancer');
 assert(ui.vajra&&ui.vajra.hp>0,'HP条件の不発を数える');assert(ui.table>0);

 // 専用の演出：発動の輪・命中の閃光（加算にしない・同時数を絞る）
 const fx=await page.evaluate(()=>{WYD.resetting=true;const w=WYD.currentWorld,s=WYD.state;w.effects=[];
  for(let i=0;i<40;i++){w.time=(w.time||0)+0.01;WYD.vfx.cast(w,'nec_raise',100,100,40);WYD.vfx.hitSpark(w,{x:200,y:200},'nec_raise',false);}
  const ring=w.effects.filter(e=>e.key==='collectorRing'),hit=w.effects.filter(e=>e.key==='collectorHit');
  return{ring:ring.length,hit:hit.length,additive:[...ring,...hit].some(e=>e.additive),max:WYD.data.collector.fx};});
 assert(fx.ring>=1&&fx.ring<=fx.max.ring.maxAlive);assert(fx.hit>=1&&fx.hit<=fx.max.hit.maxAlive);assert.equal(fx.additive,false,'墨黒を残すため加算しない');

 // 既存キャラのセーブは変わらない／ほかの職業では蒐集者の処理が動かない
 assert.equal(await page.evaluate(()=>localStorage.getItem('wyd3-save-v1-necromancer')),before,'コピー元のセーブが変わった');
 await page.evaluate(()=>{WYD.resetting=true;localStorage.setItem('wyd3-active-class','necromancer');});await page.reload();
 const other=await page.evaluate(()=>({open:document.getElementById('grimoire-open').hidden,slots:WYD.collector.slots(WYD.state),order:WYD.collector.order(WYD.state)===WYD.data.skillOrder,skills:Object.keys(WYD.data.skills).length}));
 assert.deepEqual(other,{open:true,slots:3,order:true,skills:9});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({core:{...core,rows:core.rows.length},ui,fx:{ring:fx.ring,hit:fx.hit}}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
