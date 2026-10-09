// 装備画面（試作・リネレボ風）：左右の装備の枠・キャラ・戦闘力・持ち物のタブ・下の能力・自動装備・並べ替え。マスを選ぶと装備の窓。
// node tools/equipscreen-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport }); const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('file://' + path.resolve(__dirname, '../index.html'));
      await page.evaluate(() => { WYD.resetting = true; localStorage.clear(); });
      await page.reload(); await page.click('#modal-ok');
      const r = await page.evaluate(() => {
        const s = WYD.state, D = WYD.data.equipScreen;
        s.settings.speed = 0; s.equipment = {};
        const weak = WYD.loot.create(s, 5, 0, { slot: 'weapon', rarity: 'magic' }); s.equipment.weapon = weak;
        const strong = WYD.loot.create(s, 40, 0, { slot: 'weapon', rarity: 'legend' }), ring = WYD.loot.create(s, 20, 0, { slot: 'ring', rarity: 'rare' });
        s.inventory = [ring, strong, WYD.loot.createUnique(s, 20)];
        WYD.ui.changed(); WYD.navigation.open('bag');
        document.getElementById('equipscreen-open').click();
        const E = WYD.equipScreen, q = (sel) => document.querySelectorAll('#equipscreen ' + sel);
        const slots = q('[data-es="slot"]').length, items = q('[data-es="item"]').length;
        const tabs = Object.fromEntries([...q('[data-es="tab"]')].map((b) => [b.dataset.tab, Number(b.querySelector('b').textContent)]));
        const power0 = Number(document.querySelector('.es-power b').textContent.replace(/,/g, ''));
        document.querySelector('[data-es="tab"][data-tab="weapon"]').click(); const weaponTab = q('[data-es="item"]').length;
        document.querySelector('[data-es="tab"][data-tab="all"]').click();
        document.querySelector('[data-es="auto"]').click();
        const equipped = s.equipment.weapon === strong && s.equipment.ring === ring, weakBack = s.inventory.includes(weak);
        const power1 = Number(document.querySelector('.es-power b').textContent.replace(/,/g, ''));
        document.querySelector('[data-es="slot"][data-slot="weapon"]').click();
        const sheet = !document.getElementById('sheet').hidden && !!document.querySelector('#sheet [data-sheet="unequip"]');
        WYD.ui.sheetAction('close');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); const closed = document.getElementById('equipscreen').hidden;
        const overflow = document.documentElement.scrollWidth > innerWidth;
        return { slots, items, tabs, power0, weaponTab, equipped, weakBack, power1, sheet, closed, overflow, statCount: D.stats.length };
      });
      assert.equal(r.slots, 9, '装備の枠'); assert.equal(r.items, 3);
      assert.equal(r.tabs.all, 3); assert.equal(r.tabs.weapon, 1); assert.equal(r.tabs.jewelry, 1); assert.equal(r.tabs.special, 1); assert.equal(r.weaponTab, 1);
      assert(r.power0 > 0); assert(r.equipped, '自動装備'); assert(r.weakBack); assert(r.power1 > r.power0, '強い装備で戦闘力が上がる');
      assert(r.sheet, '枠を選ぶと装備の窓'); assert(r.closed, 'Escで閉じる'); assert(!r.overflow, '横にはみ出さない');
      assert.deepEqual(errors, []);
      console.log(viewport.width, JSON.stringify(r));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
