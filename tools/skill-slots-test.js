// node tools/skill-slots-test.js：同時にONにできるスキルの数（data/skills.js の skillSlots）を、読み込み・構成の読み込みでも守る。
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));
 await page.evaluate(()=>{WYD.resetting=true;localStorage.clear();localStorage.setItem('wyd3-active-class','necromancer');});await page.reload();
 // 前の版のセーブ：覚えたスキル7つが全部ON
 const seven=['nec_raise','nec_mage','nec_nova','nec_spear','nec_plague','nec_pact','nec_grasp'];
 await page.evaluate(seven=>{WYD.resetting=true;const s=JSON.parse(JSON.stringify(WYD.state));for(const id of Object.keys(WYD.data.skills)){s.player.skills[id]=10;s.player.skillEnabled[id]=seven.includes(id);}
  localStorage.setItem(WYD.save.KEY,JSON.stringify(s));},seven);
 await page.reload();
 const loaded=await page.evaluate(()=>{const pl=WYD.state.player;return Object.keys(WYD.data.skills).filter(id=>pl.skills[id]>0&&pl.skillEnabled[id]);});
 assert.equal(loaded.length,await page.evaluate(()=>WYD.data.skillSlots),'読み込み後のON数');
 // おまかせの順（autoBuild）が先に残る
 assert.deepEqual([...loaded].sort(),await page.evaluate(()=>[...WYD.data.autoBuild].sort()),'残るスキル');
 // 戦闘で実際に使うのも上限まで
 const cast=await page.evaluate(()=>{const W=WYD.world,w=WYD.currentWorld,s=WYD.state;
  if(w.town)WYD.town.leave(w,s);s.settings.speed=0;
for(let i=0;i<1200;i++)W.update(w,s,.05);
  return Object.keys(WYD.results.snapshot(w).rows).filter(k=>k.startsWith('skill:')).map(k=>k.slice(6));});
 assert(cast.length>0,'戦闘でスキルを使っていない');
 for(const id of cast)assert(loaded.includes(id),'OFFのスキルを使った '+id);
 // 構成の読み込み：4つ以上ONの構成でも上限まで
 const fromBuild=await page.evaluate(seven=>{const s=WYD.state;s.builds=s.builds||[];const b={equipment:{},skillEnabled:Object.fromEntries(seven.map(id=>[id,true])),runes:{},cube:{}};s.builds[0]=b;WYD.builds.load(s,0);
  return Object.keys(WYD.data.skills).filter(id=>s.player.skills[id]>0&&s.player.skillEnabled[id]).length;},seven);
 assert.equal(fromBuild,await page.evaluate(()=>WYD.data.skillSlots),'構成の読み込み後のON数');
 assert.deepEqual(errors,[]);console.log('ok skill slots',loaded,'cast',cast);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
