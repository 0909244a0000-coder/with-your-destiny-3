const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 try {
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));await page.locator('#modal-ok').click();
 await page.evaluate(()=>{WYD.state.player.level=50;WYD.ui.renderPanels();});
 await page.locator('#bag-open').click();assert(await page.locator('#inventory').isVisible());assert(!await page.locator('#equipment').isVisible());assert(!await page.locator('#stash-panel').isVisible());
 await page.locator('#bag-gamble-open').click();assert(await page.locator('#gamble').isVisible());await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.locator('#character-open').click();assert(await page.locator('#stats').isVisible());assert(await page.locator('#equipment').isVisible());assert(!await page.locator('#rune-open').isVisible());assert(!await page.locator('#skills').isVisible());await page.keyboard.press('Escape');
 await page.locator('#skills-open').click();assert(await page.locator('#skills').isVisible());assert(!await page.locator('#equipment').isVisible());await page.locator('#rune-open').click();assert(await page.locator('#rune-lab').isVisible());await page.keyboard.press('Escape');assert(await page.locator('#skills').isVisible());await page.keyboard.press('Escape');
 // 装備の窓：かばん・装備欄のどこから選んでも同じ窓で、装備する／外す・強化・つけ直し・鍛造（強化の画面とモードはなくした）
 assert.equal(await page.locator('#upgrade-open').count(),0);
 await page.evaluate(()=>{const s=WYD.state;s.materials=1e6;s.inventory=[WYD.loot.create(s,10,1,{rarity:'rare',slot:'ring'})];WYD.ui.changed();});
 await page.locator('#bag-open').click();await page.locator('#inventory [data-index="0"]').click();assert(await page.locator('#sheet').isVisible());
 const acts=await page.evaluate(()=>[...document.querySelectorAll('#sheet [data-sheet]')].map(b=>b.dataset.sheet));for(const a of ['equip','enhance','reroll','forge','lock','discard','close'])assert(acts.includes(a),a);
 await page.locator('#sheet [data-sheet="enhance"]').click();assert(await page.locator('#sheet').isVisible(),'強化のあとも窓は開いたまま');assert.equal(await page.evaluate(()=>WYD.state.inventory[0].plus),1);
 await page.locator('#sheet [data-sheet="equip"]').click();assert(!await page.locator('#sheet').isVisible());assert.equal(await page.evaluate(()=>WYD.state.equipment.ring&&WYD.state.equipment.ring.plus),1);await page.keyboard.press('Escape');
 await page.locator('#character-open').click();await page.locator('#equipment [data-slot="ring"]').click();assert(await page.locator('#sheet [data-sheet="unequip"]').isVisible());
 await page.locator('#sheet [data-sheet="forge"]').click();assert(await page.locator('#forge').isVisible());await page.locator('#forge-close').click();await page.keyboard.press('Escape');
 assert(await page.locator('#home-panel #dps-open').isVisible());await page.locator('#dps-open').click();assert(await page.locator('#dps-test').isVisible());await page.keyboard.press('Escape');
 await page.locator('#home-depart').click();await page.locator('#home-panel').waitFor({state:'hidden'});await page.locator('#town-btn').click();assert(await page.locator('#home-panel').isVisible());
 for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[844,390],[768,1024],[390,844]]){
 await page.setViewportSize({width,height});await page.waitForTimeout(150);
 const r=await page.evaluate(()=>[...document.querySelectorAll('.nav-icon')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {id:e.id,ok:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&r.width===r.height&&getComputedStyle(e).borderRadius==='50%'&&!/[\u3040-\u30ff\u4e00-\u9fff]/.test(e.getAttribute('aria-label'))};}));assert(r.every(x=>x.ok),JSON.stringify({width,r}));
 if(width===1920)await page.screenshot({path:'/tmp/navigation-ui.png'});
 }
 // 旧倉庫30個を含む90個のアイテムが、60枠+未受取30個として損失なく移行する。
 await page.evaluate(()=>{const s=WYD.state;s.inventory=[];s.stash=[];s.pendingLoot=[];for(let i=0;i<90;i++){const it=WYD.loot.create(s,10,1,{rarity:'magic'});(i<60?s.inventory:s.stash).push(it);}WYD.save.write(s);});
 await page.reload();
 const migrated=await page.evaluate(()=>({inv:WYD.state.inventory.length,stash:WYD.state.stash.length,pending:WYD.state.pendingLoot.length,ids:new Set([...WYD.state.inventory,...WYD.state.pendingLoot].map(it=>it.id)).size}));assert.deepEqual(migrated,{inv:60,stash:0,pending:30,ids:90});
 await page.evaluate(()=>WYD.save.write(WYD.state));await page.reload();assert.equal(await page.evaluate(()=>WYD.state.pendingLoot.length),30);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({navigation:true,migrated,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
