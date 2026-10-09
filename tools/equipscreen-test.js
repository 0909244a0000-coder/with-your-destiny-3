// 装備画面（試作・リネレボ風）：左右の装備の枠・キャラ・戦闘力・持ち物のタブ・下の能力・自動装備・並べ替え。マスを選ぶと装備の窓、乗せると性能、Ctrl＋クリックでロック。
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
        const bodyUnique = WYD.data.uniques.list.find((u) => !u.uberOnly && WYD.data.items.bases.find((b) => b.id === u.base).slot === 'body');   /* タブの数を決めるため、胴のユニーク */
        s.inventory = [ring, strong, WYD.loot.createUnique(s, 20, bodyUnique)];
        WYD.ui.changed(); WYD.navigation.open('bag');
        document.getElementById('character-open').click();   /* Status のアイコンで装備画面 */
        const E = WYD.equipScreen, q = (sel) => document.querySelectorAll('#equipscreen ' + sel);
        const slots = q('[data-es="slot"]').length, items = q('[data-es="item"]').length;
        const tabs = Object.fromEntries([...q('[data-es="tab"]')].map((b) => [b.dataset.tab, Number(b.querySelector('b').textContent)]));
        const power0 = Number(document.querySelector('.es-power b').textContent.replace(/,/g, ''));
        document.querySelector('[data-es="tab"][data-tab="weapon"]').click(); const weaponTab = q('[data-es="item"]').length;
        document.querySelector('[data-es="tab"][data-tab="all"]').click();
        WYD.inventory.autoEquipAll(s);   /* 自動装備のまとめ実行（右下のボタンは宝石合成に変えた） */
        const fuseOff = document.querySelector('[data-es="fuse"]').disabled; WYD.equipScreen.render();
        const equipped = s.equipment.weapon === strong && s.equipment.ring === ring, weakBack = s.inventory.includes(weak);
        const power1 = Number(document.querySelector('.es-power b').textContent.replace(/,/g, ''));
        document.querySelector('[data-es="slot"][data-slot="weapon"]').click();
        const sheet = !document.getElementById('sheet').hidden && !!document.querySelector('#sheet [data-sheet="unequip"]');
        WYD.ui.sheetAction('close');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); const closed = document.getElementById('equipscreen').hidden;
        const overflow = document.documentElement.scrollWidth > innerWidth;
        return { fuseOff, slots, items, tabs, power0, weaponTab, equipped, weakBack, power1, sheet, closed, overflow, statCount: D.stats.length };
      });
      assert.equal(r.slots, 9, '装備の枠'); assert.equal(r.items, 3);
      assert.equal(r.tabs.all, 3); assert.equal(r.tabs.weapon, 1); assert.equal(r.tabs.jewelry, 1); assert.equal(r.tabs.special, 1); assert.equal(r.weaponTab, 1);
      assert(r.fuseOff, '宝石が足りないと宝石合成は押せない'); assert(r.power0 > 0); assert(r.equipped, '自動装備'); assert(r.weakBack); assert(r.power1 > r.power0, '強い装備で戦闘力が上がる');
      assert(r.sheet, '枠を選ぶと装備の窓'); assert(r.closed, 'Escで閉じる'); assert(!r.overflow, '横にはみ出さない');
      if (viewport.width > 500) {
        // マウスを乗せると性能（持ち物は今の装備との比べも）、離すと消える。Ctrl＋クリックでロック
        await page.evaluate(() => { WYD.state.inventory = [WYD.loot.create(WYD.state, 10, 0, { slot: 'head', rarity: 'rare' })]; WYD.ui.changed(); WYD.equipScreen.open(); });
        await page.hover('#equipscreen [data-es="item"]');
        const tip = await page.evaluate(() => { const t = document.getElementById('tooltip'); return { shown: getComputedStyle(t).display !== 'none', text: t.textContent }; });
        assert(tip.shown, '性能が出ない'); assert.match(tip.text, /レア・頭/); assert.match(tip.text, /この部位は何も装備していない|いま装備中/);
        await page.hover('#equipscreen [data-es="slot"][data-slot="weapon"]');
        assert.match(await page.evaluate(() => document.getElementById('tooltip').textContent), /武器/);
        await page.mouse.move(2, 2); await page.hover('#equipscreen .es-head');
        assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('tooltip')).display), 'none', '離すと消える');
        await page.click('#equipscreen [data-es="item"]', { modifiers: ['Control'] });
        assert.equal(await page.evaluate(() => WYD.state.inventory[0].locked), true, 'Ctrl＋クリックでロック');
        // 宝石のタブ：種類ごとに1マス（数・NEW・段階の印）。乗せると性能、押すと宝石の画面ではめ先を選ぶ
        await page.evaluate(() => { const s = WYD.state; s.gems = {}; WYD.gems.gain(s, 'ruby:4', 2); s.gems['topaz:0'] = 3; WYD.ui.changed(); WYD.equipScreen.render(); document.querySelector('[data-es="tab"][data-tab="gems"]').click(); });
        const gt = await page.evaluate(() => ({ count: Number(document.querySelector('[data-es="tab"][data-tab="gems"] b').textContent), cells: [...document.querySelectorAll('#equipscreen [data-es="gem"]')].map(c => c.dataset.key), news: document.querySelectorAll('#equipscreen .es-gemcell .new-badge').length }));
        assert.deepEqual(gt, { count: 2, cells: ['ruby:4', 'topaz:0'], news: 1 });
        await page.hover('#equipscreen [data-es="gem"][data-key="ruby:4"]');
        assert.match(await page.evaluate(() => document.getElementById('tooltip').textContent), /王者の ルビー ×2/);
        assert.equal(await page.evaluate(() => WYD.gems.isNew(WYD.state, 'ruby:4')), false, '乗せると NEW が消える');
        await page.click('#equipscreen [data-es="gem"][data-key="topaz:0"]');
        assert.deepEqual(await page.evaluate(() => ({ vault: !document.getElementById('gemvault').hidden, picking: WYD.gemVault.picking })), { vault: true, picking: 'topaz:0' });
        await page.evaluate(() => WYD.gemVault.close());
        // 右下の宝石合成：量がたまると押せて、確認してから混沌の宝石を作る
        await page.evaluate(() => { const s = WYD.state; s.gems = { 'ruby:4': 10 }; WYD.ui.changed(); WYD.equipScreen.render(); });
        assert.match(await page.evaluate(() => document.querySelector('[data-es="fuse"]').textContent), /810 \/ 810/);
        page.once('dialog', d => d.accept());
        await page.click('#equipscreen [data-es="fuse"]');
        assert.deepEqual(await page.evaluate(() => Object.keys(WYD.state.gems).map(k => k.split(':')[0])), ['fused']);
      }
      // 旧60枠セーブ相当の持ち物から180枠へ。ページ移動後も元配列の位置を選び、満杯判定は全体を見る。
      const bag = await page.evaluate(() => {
        const s = WYD.state, E = WYD.equipScreen;
        s.inventory = Array.from({ length: 60 }, () => WYD.loot.create(s, 10, 0, { slot: 'head', rarity: 'rare' }));
        E.tab = 'all'; E.bagPage = 0; E.open('equip');
        const old = { count: document.getElementById('es-count').textContent, cells: document.querySelectorAll('#equipscreen .es-grid .es-cell').length, pages: document.querySelector('.es-pager span').textContent };
        for (let i = 60; i < 180; i++) s.inventory.push(WYD.loot.create(s, 10, 0, { slot: 'head', rarity: 'rare' }));
        WYD.ui.changed(); E.render();
        document.querySelector('[data-es="page"][data-step="1"]').click();
        document.querySelector('[data-es="page"][data-step="1"]').click();
        const last = { count: document.getElementById('es-count').textContent, pages: document.querySelector('.es-pager span').textContent,
          cells: document.querySelectorAll('#equipscreen .es-grid [data-es="item"]').length,
          first: document.querySelector('#equipscreen .es-grid [data-es="item"]').dataset.index,
          endDisabled: document.querySelector('[data-es="page"][data-step="1"]').disabled };
        document.querySelector('#equipscreen .es-grid [data-es="item"]').click();
        const sheet = !document.getElementById('sheet').hidden && WYD.ui.sheet?.where === 'inv' && WYD.ui.sheet?.key === 120;
        WYD.ui.sheetAction('close');
        document.querySelector('[data-es="tab"][data-tab="weapon"]').click();
        const filtered = { page: E.bagPage, pager: !!document.querySelector('.es-pager') };
        return { old, last, sheet, filtered, full: s.inventory.length >= WYD.data.items.inventorySize, size: WYD.data.items.inventorySize };
      });
      assert.deepEqual(bag.old, { count: '60 / 180', cells: 60, pages: '1 / 3' });
      assert.deepEqual(bag.last, { count: '180 / 180', pages: '3 / 3', cells: 60, first: '120', endDisabled: true });
      assert.equal(bag.size, 180); assert(bag.full); assert(bag.sheet, '3ページ目の装備を選ぶ');
      assert.deepEqual(bag.filtered, { page: 0, pager: false }, '絞り込みでページを戻す');
      // 下段ソート：装備は表示順だけ変更し、選択は元配列の位置。宝石も独立して並び替えられる。
      const sort = await page.evaluate(() => {
        const S = WYD.state, E = WYD.equipScreen;
        S.inventory = [
          WYD.loot.create(S, 10, 0, { slot: 'head', rarity: 'rare' }),
          WYD.loot.create(S, 30, 0, { slot: 'body', rarity: 'legend' }),
          WYD.loot.create(S, 20, 0, { slot: 'weapon', rarity: 'magic' }),
        ];
        S.gems = { 'ruby:0': 2, 'topaz:1': 5 };
        E.gearSort = 'default'; E.gemSort = 'tier'; E.open('sort');
        const tab = [...document.querySelectorAll('[data-es-page]')].map((b) => b.dataset.esPage);
        const builds = document.querySelector('.es-page[data-page="stats"] #builds') !== null;
        document.querySelector('[data-es="gear-sort"][data-mode="recent"]').click();
        const order = E.shown('all').map((x) => x.index);
        const preview = document.querySelector('.es-sort-preview [data-es="item"]').dataset.index;
        document.querySelector('.es-sort-preview [data-es="item"]').click();
        const selected = WYD.ui.sheet?.key;
        WYD.ui.sheetAction('close');
        document.querySelector('[data-es="gem-sort"][data-mode="count"]').click();
        const gems = E.gemKeys();
        document.querySelector('[data-es="sort-jump"][data-tab="gems"]').click();
        const shownGem = document.querySelector('.es-grid [data-es="gem"]').dataset.key;
        const inventoryUnchanged = S.inventory[0].slot === 'head' && S.inventory[2].slot === 'weapon';
        return { tab, builds, order, preview, selected, gems, shownGem, inventoryUnchanged, page: E.page, mode: E.gemSort, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert(!sort.tab.includes('builds') && sort.tab.includes('sort'), 'ビルドの下タブをソートへ');
      assert(sort.builds, '保存ビルドの操作は能力ページに残す');
      assert.deepEqual(sort.order, [2, 1, 0]); assert.equal(sort.preview, '2'); assert.equal(sort.selected, 2);
      assert.deepEqual(sort.gems, ['topaz:1', 'ruby:0']);
      assert.equal(sort.shownGem, 'topaz:1'); assert.equal(sort.mode, 'count'); assert.equal(sort.page, 'equip');
      assert(sort.inventoryUnchanged, '表示順の変更で実際の持ち物順は変えない'); assert(!sort.overflow);
      // OP指定：特殊効果と能力値の数値で並べ、OPなしを最後に。クリック先は元の添字。
      const op = await page.evaluate(() => {
        const S = WYD.state, E = WYD.equipScreen;
        S.inventory = [
          WYD.loot.create(S, 10, 0, { slot: 'head', rarity: 'magic' }),
          WYD.loot.create(S, 10, 0, { slot: 'head', rarity: 'magic' }),
          WYD.loot.create(S, 10, 0, { slot: 'head', rarity: 'magic' }),
        ];
        S.inventory[0].effects = [{ id: 'cooldown', value: 5 }];
        S.inventory[1].effects = [];
        S.inventory[2].effects = [{ id: 'cooldown', value: 12 }];
        E.open('sort');
        document.querySelector('[data-es="gear-sort"][data-mode="op"]').click();
        const effectOrder = E.shown('all').map((entry) => entry.index);
        const labels = [...document.querySelectorAll('.es-sort-card:first-child .es-sort-op-item small')].map((x) => x.textContent);
        document.querySelector('[data-es-op]').value = 'stat:attack';
        document.querySelector('[data-es-op]').dispatchEvent(new Event('change', { bubbles: true }));
        S.inventory[0].stats = [{ stat: 'attack', value: 9, main: true }];
        S.inventory[1].stats = [{ stat: 'attack', value: 15, main: true }];
        S.inventory[2].stats = [{ stat: 'defense', value: 50, main: true }];
        E.render();
        const statOrder = E.shown('all').map((entry) => entry.index);
        document.querySelector('[data-es="sort-jump"][data-tab="all"]').click();
        const first = document.querySelector('.es-grid [data-es="item"]').dataset.index;
        return { effectOrder, labels, statOrder, first, selected: E.opKey, mode: E.gearSort };
      });
      assert.deepEqual(op.effectOrder, [2, 0, 1]);
      assert.deepEqual(op.labels, ['12%', '5%', 'なし']);
      assert.deepEqual(op.statOrder, [1, 0, 2]);
      assert.equal(op.first, '1'); assert.equal(op.selected, 'stat:attack'); assert.equal(op.mode, 'op');
      const gemOp = await page.evaluate(() => {
        const S = WYD.state, E = WYD.equipScreen;
        S.gems = { 'ruby:1': 2, 'fused:fx.cooldown=3': 1, 'fused:fx.cooldown=7': 1 };
        E.gemSort = 'tier'; E.gemOpKey = 'effect:cooldown'; E.open('sort');
        document.querySelector('[data-es="gem-sort"][data-mode="op"]').click();
        const effectOrder = E.gemKeys();
        document.querySelector('[data-es-gem-op]').value = 'stat:attack';
        document.querySelector('[data-es-gem-op]').dispatchEvent(new Event('change', { bubbles: true }));
        return { effectOrder, statOrder: E.gemKeys(), mode: E.gemSort, selected: E.gemOpKey };
      });
      assert.deepEqual(gemOp.effectOrder, ['fused:fx.cooldown=7', 'fused:fx.cooldown=3', 'ruby:1']);
      assert.deepEqual(gemOp.statOrder, ['ruby:1', 'fused:fx.cooldown=7', 'fused:fx.cooldown=3']);
      assert.equal(gemOp.mode, 'op'); assert.equal(gemOp.selected, 'stat:attack');
      assert.deepEqual(errors, []);
      console.log(viewport.width, JSON.stringify(r));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
