// 装備判断→加工と対象IDの安全性。実ブラウザでPC/タッチ相当を確認。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]) {
      const page = await browser.newPage({viewport,hasTouch:viewport.width < 1000,isMobile:viewport.width < 1000});
      const errors=[]; page.on('pageerror', e=>errors.push(e.message));
      await page.goto('file://' + path.resolve(__dirname,'../index.html'));
      await page.click('#modal-ok');
      await page.evaluate(() => {
        const s=WYD.state; s.settings.speed=0; s.materials=10000;
        const it=WYD.loot.create(s,10,1,{rarity:'legend'}); it.sockets=['ruby:0',null];
        s.inventory=[it,WYD.loot.create(s,10,1,{rarity:'magic'})]; s.equipment={};
        WYD.ui.changed(); WYD.ui.touchSheet('inv',0);
      });
      assert(await page.locator('#sheet-body').innerText().then(t=>t.includes('攻撃力')&&t.includes('空き部位')));
      assert.equal(await page.locator('.comparison-details').getAttribute('open'),null);
      assert.equal(await page.locator('[data-sheet="enhance"]').count(),0);
      await page.locator('.comparison-details > summary').click();
      assert(await page.locator('.comparison-details').innerText().then(t=>t.includes('全差分')));
      await page.locator('[data-sheet="work"]').click();
      await page.evaluate(() => {
        const s=WYD.state,u=WYD.ui,chosen=s.inventory[0],other=s.inventory[1];
        s.inventory.reverse(); u.sheetAction('enhance'); u.sheetAction('enhance');
        if(chosen.plus!==1||other.plus) throw Error('並べ替え・二重強化');
        if(u.sheet.mode!=='work'||u.sheet.key!==1) throw Error('加工維持');
      });
      assert(await page.locator('#sheet-body').innerText().then(t=>t.includes('現在 +1')));
      await page.evaluate(() => { WYD.ui.sheet.lastAction=0; WYD.ui.sheetAction('unsocket:0'); });
      assert.equal(await page.evaluate(()=>WYD.state.gems['ruby:0']),1);
      await page.locator('[data-sheet="gems"]').click();
      assert(await page.locator('#gemvault').isHidden());
      assert.equal(await page.locator('#sheet .gv-targets').count(),0);
      assert(await page.locator('.sheet-gem-target').innerText().then(t=>t.includes('空き 2 / 2')));
      await page.evaluate(()=>{WYD.ui.sheet.lastAction=0;});
      await page.locator('[data-sheet="socket:ruby:0"]').click();
      assert.equal(await page.evaluate(()=>WYD.ui.resolveSheet(WYD.ui.sheet).sockets[0]),'ruby:0');
      assert.equal(await page.evaluate(()=>WYD.ui.sheet.mode),'gems');
      await page.locator('[data-sheet="work"]').click();

      await page.evaluate(() => {
        WYD.ui.sheet.lastAction=0; WYD.ui.sheetAction('reroll');
        const item=WYD.ui.resolveSheet(WYD.ui.sheet); item.plus=WYD.data.crafting.enhance.max;
        WYD.state.materials=0; WYD.ui.touchSheet('inv',WYD.ui.sheet.key,'work');
      });
      assert(await page.locator('[data-sheet="enhance"]').isDisabled());
      assert(await page.locator('[data-sheet="reroll"]').isDisabled());
      await page.locator('[data-sheet="compare"]').click();
      // 移動・消失時は別アイテムに作用せず閉じる。
      await page.evaluate(() => {
        const s=WYD.state,u=WYD.ui,item=u.resolveSheet(u.sheet); s.inventory=s.inventory.filter(it=>it!==item);
        const mats=s.materials; u.sheet.lastAction=0; u.sheetAction('discard');
        if(s.inventory.length!==1||s.materials!==mats||u.sheet) throw Error('消失の安全性');
        u.touchSheet('inv',0); s.inventory[0].locked=true; u.sheet.lastAction=0; u.sheetAction('discard');
        if(s.inventory.length!==1) throw Error('ロック保護');
        u.touchSheet('inv',0); u.sheet.lastAction=0; u.sheetAction('equip');
        if(s.inventory.length!==0||!Object.values(s.equipment).length||u.sheet) throw Error('装備');
        u.touchSheet('eq',Object.keys(s.equipment)[0]); u.sheetAction('unequip');
        if(s.inventory.length!==1) throw Error('外す');
      });
      await page.evaluate(() => {
        const s=WYD.state,u=WYD.ui,set=WYD.loot.forClass(WYD.data.sets.list)[0];
        s.equipment={};
        const pieces=set.pieces.map(p=>WYD.loot.createSetPiece(s,10,set.id,p.id));
        for(const it of pieces) s.equipment[it.slot]=it;
        const old=pieces[0],candidate=WYD.loot.create(s,10,1,{rarity:'magic'}); candidate.slot=old.slot;
        const before=JSON.stringify(s); const html=u.compareHtml(candidate,old);
        if(!html.includes('完成の力 解除')||!html.includes('部位効果 解除')) throw Error('セット解除');
        if(JSON.stringify(s)!==before) throw Error('比較で状態変化');
        delete s.equipment[old.slot];
        if(!u.compareHtml(old,null).includes('完成の力 成立')) throw Error('セット成立');
        const unique=WYD.loot.createUnique(s,10);
        if(!u.compareHtml(unique,null).includes('自動評価対象外')) throw Error('固有能力');
        s.inventory=[unique]; u.touchSheet('inv',0);
      });
      const bounds=await page.locator('[data-sheet="equip"]').boundingBox();
      assert(bounds.y>=0&&bounds.y+bounds.height<=viewport.height);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width);
      await page.keyboard.press('Escape'); assert(await page.locator('#sheet').isHidden());
      assert.deepEqual(errors,[]); await page.close();
    }
    console.log('ok 全体能力・詳細・セット成立解除・固有能力 / 二層操作・強化・つけ直し・宝石返却 / ID追従・消失・連打・ロック / 装備・外す / PC・390px・横画面・Esc');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
