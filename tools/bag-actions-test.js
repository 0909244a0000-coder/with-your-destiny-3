// 持ち物の全分解・賭けの長押し・スマホ操作を確認。
// node tools/bag-actions-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.click('#modal-ok');
    await page.evaluate(() => {
      const s = WYD.state; s.settings.speed = 0; s.player.level = 20; s.materials = 5000;
      const make = rarity => WYD.loot.create(s, 10, 1, { rarity });
      const unique = WYD.loot.createUnique(s, 10); unique.plus = 2; unique.enhanceSpent = 100; unique.sockets = ['ruby:0'];
      const locked = make('rare'); locked.locked = true;
      s.inventory = [make('normal'), make('magic'), unique, locked];
      s.stash = [make('rare')]; s.equipment.weapon = make('rare');
      WYD.ui.changed(); WYD.ui.toggleBag(true);
    });
    const before = await page.evaluate(() => JSON.stringify({ inventory: WYD.state.inventory, materials: WYD.state.materials, gems: WYD.state.gems, equipment: WYD.state.equipment, stash: WYD.state.stash }));
    let text = ''; page.once('dialog', async d => { text = d.message(); await d.dismiss(); });
    await page.click('#discard-all'); assert.equal(await page.evaluate(() => JSON.stringify({ inventory: WYD.state.inventory, materials: WYD.state.materials, gems: WYD.state.gems, equipment: WYD.state.equipment, stash: WYD.state.stash })), before);
    assert(text.includes('3個')); assert(text.includes('ユニーク'));
    page.once('dialog', d => d.accept()); await page.click('#discard-all');
    const after = await page.evaluate(() => ({ inv: WYD.state.inventory, stash: WYD.state.stash.length, equipment: !!WYD.state.equipment.weapon, ruby: WYD.state.gems['ruby:0'] }));
    assert.equal(after.inv.length, 1); assert(after.inv[0].locked); assert.equal(after.stash, 1); assert(after.equipment); assert.equal(after.ruby, 1);
    await page.click('#bag-gamble-open'); await page.click('[data-gamble="weapon"]');
    const count = () => page.evaluate(() => WYD.state.inventory.length);
    assert.equal(await count(), 2);
    const button = page.locator('[data-gamble="weapon"]'); const rect = await button.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down(); await page.waitForTimeout(1000); await page.mouse.up();
    const held = await count(); assert(held >= 5); await page.waitForTimeout(450); assert.equal(await count(), held);
    await page.mouse.down(); await page.waitForTimeout(600); await page.keyboard.press('Escape'); await page.mouse.up();
    const closed = await count(); await page.waitForTimeout(400); assert.equal(await count(), closed);
    await page.evaluate(() => { WYD.state.materials = WYD.gamble.cost(WYD.state) * 2; WYD.ui.changed(); });
    await page.click('#bag-gamble-open'); const r2 = await button.boundingBox(); await page.mouse.move(r2.x + r2.width / 2, r2.y + r2.height / 2);
    const n = await count(); await page.mouse.down(); await page.waitForTimeout(1200); await page.mouse.up(); assert.equal(await count(), n + 2);
    assert.equal(await page.evaluate(() => WYD.state.materials), 0);
    await page.click('#gamble-close');
    await page.evaluate(() => { const s = WYD.state; s.materials = 5000; while (s.inventory.length < WYD.data.items.inventorySize - 1) s.inventory.push(WYD.loot.create(s, 10, 1));   /* 残り1枠（数は data/items.js） */ WYD.ui.changed(); });
    await page.click('#bag-gamble-open'); const r3 = await button.boundingBox(); await page.mouse.move(r3.x + r3.width / 2, r3.y + r3.height / 2);
    const mats = await page.evaluate(() => WYD.state.materials); const cost = await page.evaluate(() => WYD.gamble.cost(WYD.state));
    await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up(); assert.equal(await count(), await page.evaluate(() => WYD.data.items.inventorySize));
    assert.equal(await page.evaluate(() => WYD.state.materials), mats - cost);
    await page.click('#gamble-close');
    await page.evaluate(() => { WYD.state.inventory = []; WYD.state.materials = 5000; WYD.ui.changed(); });
    await page.click('#bag-gamble-open'); const r4 = await button.boundingBox(); await page.mouse.move(r4.x + r4.width / 2, r4.y + r4.height / 2);
    await page.mouse.down(); await page.waitForTimeout(150); await page.mouse.move(r4.x + r4.width + 30, r4.y); await page.mouse.up(); await page.waitForTimeout(500); assert.equal(await count(), 0);
    await page.mouse.move(r4.x + r4.width / 2, r4.y + r4.height / 2); await page.mouse.down(); await page.waitForTimeout(600);
    await page.evaluate(() => window.dispatchEvent(new Event('blur'))); const blurred = await count(); await page.waitForTimeout(450); await page.mouse.up(); assert.equal(await count(), blurred);
    await page.close();
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      const mobile = await browser.newPage({ viewport, isMobile: true, hasTouch: true }); mobile.on('pageerror', e => errors.push(e.message));
      await mobile.goto('file://' + path.resolve(__dirname, '../index.html')); await mobile.locator('#modal-ok').tap();
      await mobile.evaluate(() => { WYD.state.settings.speed = 0; WYD.state.player.level = 20; WYD.state.materials = 5000; WYD.ui.changed(); WYD.ui.toggleBag(true); });
      assert.equal(await mobile.locator('#discard-mode, #discard-normal, #discard-magic').count(), 0);
      const sizes = await mobile.locator('.inv-buttons button').evaluateAll(bs => bs.map(b => b.getBoundingClientRect().height)); assert(sizes.every(h => h >= 48));
      await mobile.locator('#bag-gamble-open').tap(); await mobile.locator('[data-gamble="head"]').tap();
      assert.equal(await mobile.evaluate(() => WYD.state.inventory.length), 1);
      // Chromiumのタッチ入力で長押し・キャンセルを再現。
      const btn = mobile.locator('[data-gamble="head"]');
      const touchRect = await btn.boundingBox(); const cdp = await mobile.context().newCDPSession(mobile);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchRect.x + touchRect.width / 2, y: touchRect.y + touchRect.height / 2 }] });
      await mobile.waitForTimeout(900); await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      const held = await mobile.evaluate(() => WYD.state.inventory.length); assert(held >= 3);
      await mobile.waitForTimeout(400); assert.equal(await mobile.evaluate(() => WYD.state.inventory.length), held);
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), viewport.width);
      await mobile.locator('#gamble-close').tap(); await mobile.close();
    }
    assert.deepEqual(errors, []);
    console.log('ok 全分解の確認・取消・ロック保護・宝石返却 / 単発購入 / 長押し・離す・移動・閉じる・blurで停止 / 素材不足・60枠で停止 / 390px・横画面・48pxボタン・タッチ操作 / errors 0');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
