// node tools/arena-sim-test.js：アリーナの高速シミュレーター（見かたの切りかえ・描画なし・回数指定・結果の集計・途中で止める・育成データ不変）。
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));
 const ids=['barbarian','sorceress','necromancer'],fixtures={};
 for(const id of ids){await page.evaluate(id=>{WYD.resetting=true;localStorage.clear();localStorage.setItem('wyd3-active-class',id)},id);await page.reload();
  fixtures[id]=await page.evaluate(()=>{WYD.resetting=true;const s=WYD.save.newState();s.player.level=40;s.seenHelp=true;for(const id of (WYD.data.autoBuild||Object.keys(WYD.data.skills).slice(0,3)))s.player.skills[id]=6;return s;});}
 await page.evaluate(f=>{WYD.resetting=true;localStorage.clear();for(const[id,s]of Object.entries(f))localStorage.setItem(WYD.arena.key(id),JSON.stringify(s));localStorage.setItem('wyd3-active-class','barbarian');},fixtures);
 await page.reload();
 const out=await page.evaluate(async()=>{WYD.resetting=true;const A=WYD.arena,S=WYD.arenaSim;A.open();
  // 見かた：最初は観戦（開戦が見えてシミュレーターは隠れる）、切りかえると逆になる
  const shown=id=>!!document.getElementById(id).getClientRects().length,views=[];views.push([shown('arena-start'),shown('arena-canvas'),shown('arena-sim-start')]);S.view('sim');views.push([shown('arena-start'),shown('arena-canvas'),shown('arena-sim-start')]);
  const before=JSON.stringify(WYD.state),saves=JSON.stringify(Object.entries(localStorage).filter(([k])=>k.startsWith('wyd3-save')));
  let draws=0;const draw=A.draw;A.draw=function(){draws++;return draw.apply(this,arguments);};
  const options=[...document.querySelectorAll('#arena-sim-count option')].map(o=>Number(o.value));
  // 1対1を5回
  const duel=await S.run(5);const drawsDuring=draws;A.draw=draw;
  const table=document.querySelectorAll('#arena-sim-results tbody tr').length,status=document.getElementById('arena-sim-status').textContent;
  // バトルロワイヤル3人を2回
  A.$('arena-mode').value='royale';A.chooseDefaults();const royale=await S.run(2);
  // 途中で止める
  A.$('arena-mode').value='duel';A.chooseDefaults();const p=S.run(1000);await new Promise(r=>setTimeout(r,300));S.cancel=true;const stopped=await p;
  const stopText=document.getElementById('arena-sim-status').textContent;
  const buttons={start:document.getElementById('arena-sim-start').disabled,stop:document.getElementById('arena-sim-stop').disabled,arena:document.getElementById('arena-start').disabled};
  return{views,options,duel:{count:duel.count,wins:Object.values(duel.rows).reduce((a,r)=>a+r.wins,0),ties:duel.ties},drawsDuring,table,status,
   royale:{count:royale.count,wins:Object.values(royale.rows).reduce((a,r)=>a+r.wins,0),ties:royale.ties,rows:Object.keys(royale.rows).length},
   stopped:stopped.count,stopText,buttons,running:A.running||S.running,
   unchanged:JSON.stringify(WYD.state)===before,savesUnchanged:JSON.stringify(Object.entries(localStorage).filter(([k])=>k.startsWith('wyd3-save')))===saves};});
 assert.deepEqual(out.views,[[true,true,false],[false,false,true]]);
 assert.deepEqual(out.options,[10,30,100,300,1000]);
 assert.equal(out.duel.count,5);assert.equal(out.duel.wins+out.duel.ties,5,'勝ち＋引き分け＝試合数');
 assert.equal(out.drawsDuring,1,'描画は終わったときの1回だけ');
 assert.equal(out.table,2);assert.match(out.status,/完了：5 \/ 5試合/);
 assert.equal(out.royale.count,2);assert.equal(out.royale.rows,3);assert(out.royale.wins+out.royale.ties>=2);
 assert(out.stopped<1000);assert.match(out.stopText,/途中で止めました/);
 assert.deepEqual(out.buttons,{start:false,stop:true,arena:false});assert.equal(out.running,false);
 assert(out.unchanged,'今の育成データが変わった');assert(out.savesUnchanged,'保存データが変わった');
 assert.deepEqual(errors,[]);console.log(JSON.stringify(out));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
