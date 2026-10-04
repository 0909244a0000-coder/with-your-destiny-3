// node tools/loot-safety-test.js：自動保護、満杯、重要品保存、受取、職業別保存、旧セーブ、390px。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.click('#modal-ok');
    const checks = await page.evaluate(() => {
      const s = WYD.state, w = WYD.currentWorld, I = WYD.inventory;
      s.settings.speed = 0; s.settings.autoEquip = false;
      const make = rarity => WYD.loot.create(s, 10, 1, { rarity });
      const base = make('normal'); base.sockets = [null, null];
      const build = make('rare'); s.builds = [{ equipment: { [build.slot]: build.id } }];
      const forged = make('rare'); forged.forged = 1;
      const unique = WYD.loot.createUnique(s, 10), set = WYD.loot.createSetPiece(s, 10);
      const kept = [base, build, forged, unique, set];
      s.inventory = kept.concat(Array.from({ length: 55 }, () => { const it = make('rare'); it.locked = true; return it; }));
      s.settings.autoSalvage = 'rare';
      const noSalvage = kept.every(it => !I.shouldAutoSalvage(s, it));
      const noRoom = I.makeRoomFor(s, make('legend')) === null;
      s.equipment[build.slot] = build; s.inventory = s.inventory.filter(it => it !== build);
      const higher = make('legend'); higher.slot = build.slot; higher.stats = [{ stat: 'attack', value: 999, main: true }]; s.inventory.push(higher);
      const noEquip = !I.autoEquip(s, higher) && s.equipment[build.slot] === build;
      higher.locked = true;
      s.settings.filter = { on: true, keepSocketed: false, keepUpgrades: false, slots: { [base.slot]: 'none' } };
      const optOut = I.shouldAutoSalvage(s, base);
      s.settings.filter.keepSocketed = true;
      w.drops = [{ item: base, age: 0 }, { item: make('magic'), age: 0 }];
      WYD.world.clearDrops(w, s);
      const areaSafe = w.drops.length === 1 && w.drops[0].item === base;
      s.stash = Array.from({ length: 30 }, () => make('rare'));
      const drops = [WYD.loot.createUnique(s, 10), WYD.loot.createSetPiece(s, 10), make('normal')]; drops[2].sockets = [null, null];
      w.drops = drops.map(item => ({ item, x: 200, y: 200, age: 1 }));
      WYD.world.updateDrops(w, s, 0);
      const queued = s.pendingLoot.length === 3 && w.drops.length === 0;
      const once = s.pendingLoot.length; WYD.world.updateDrops(w, s, 0);
      const noDup = s.pendingLoot.length === once;
      const fresh = WYD.loot.createUnique(s, 10); w.drops = [{ item: fresh, x: 200, y: 200, age: 0 }];
      WYD.save.write(s);
      const saved = JSON.parse(localStorage.getItem(WYD.save.KEY));
      const earlySaved = saved.pendingLoot.length === 4;
      const restored = WYD.save.load();
      const intact = JSON.stringify(restored.pendingLoot) === JSON.stringify(saved.pendingLoot);
      // 既に所持している装備と重複した未受取を復元しない。
      saved.pendingLoot.push(saved.inventory[0], saved.pendingLoot[0], null);
      localStorage.setItem(WYD.save.KEY, JSON.stringify(saved));
      const clean = WYD.save.load(); const dedup = clean.pendingLoot.length === 4;
      // 受取待ちが多い間は敵・時間を進めず、空きができれば再開できる。
      clean.pendingLoot = Array.from({ length: WYD.data.items.pendingLootLimit }, () => WYD.loot.createUnique(clean, 10));
      const time = w.time; WYD.world.update(w, clean, 1); const stopped = w.time === time;
      clean.inventory = []; const claimed = I.claimPending(clean); const resumed = clean.pendingLoot.length === 0 && claimed === 60;
      const claimAgain = I.claimPending(clean) === 0;
      // 空の土台を装備していても育成の自動交換は続き、土台は持ち物へ戻る。
      const raw = WYD.loot.create(clean, 1, 1, { rarity: 'normal', slot: 'weapon' }); raw.sockets = [null, null];
      const upgrade = WYD.loot.create(clean, 10, 1, { rarity: 'legend', slot: 'weapon' }); upgrade.stats = [{ stat: 'attack', value: 999, main: true }];
      const temp = WYD.save.newState(); temp.equipment.weapon = raw; temp.inventory = [upgrade];
      const baseUpgrade = I.autoEquip(temp, upgrade) && temp.inventory.includes(raw) && !I.shouldAutoSalvage(temp, raw);
      // 全て捨てるは従来どおり、明示操作なら未ロック品を対象にする。
      const manual = I.discardAll(clean).count === 60;
      // 旧セーブに項目がなくても読み込める。
      const old = WYD.save.newState(); delete old.pendingLoot; localStorage.setItem(WYD.save.KEY, JSON.stringify(old));
      const migration = WYD.save.load().pendingLoot.length === 0;
      // 別職業のセーブへ漏れない。
      const ownKey = WYD.save.KEY; WYD.save.KEY = ownKey + '-sorceress'; const other = WYD.save.newState(); WYD.save.write(other);
      const isolated = WYD.save.load().pendingLoot.length === 0; WYD.save.KEY = ownKey;
      // 再読み込み用に未受取を保存。
      s.pendingLoot = drops; w.drops = []; WYD.save.write(s);
      return { noSalvage, noRoom, noEquip, optOut, areaSafe, queued, noDup, earlySaved, intact, dedup, stopped, resumed, claimAgain, baseUpgrade, manual, migration, isolated };
    });
    for (const [name, value] of Object.entries(checks)) assert.equal(value, true, name);
    await page.reload();
    assert.equal(await page.evaluate(() => WYD.state.pendingLoot.length), 3);
    await page.evaluate(() => { WYD.state.settings.speed = 0; WYD.ui.toggleBag(true); WYD.ui.changed(); });
    assert(await page.locator('#pending-loot-note').isVisible());
    assert(await page.locator('#claim-pending').isDisabled());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    assert((await page.locator('#claim-pending').boundingBox()).height >= 48);
    if (process.env.LOOT_SCREENSHOT) await page.screenshot({ path: process.env.LOOT_SCREENSHOT, fullPage: true });
    await page.evaluate(() => { WYD.state.inventory.pop(); WYD.ui.changed(); });
    await page.locator('#claim-pending').tap();
    assert.equal(await page.evaluate(() => WYD.state.pendingLoot.length), 2);
    await page.reload(); assert.equal(await page.evaluate(() => WYD.state.pendingLoot.length), 2);
    // 実際の職業切替で別職業へ漏れず、戻ると未受取が残っている。
    await Promise.all([page.waitForEvent('load'), page.evaluate(() => WYD.classes.switchTo('sorceress', WYD.state))]);
    assert.equal(await page.evaluate(() => WYD.state.pendingLoot.length), 0);
    await Promise.all([page.waitForEvent('load'), page.evaluate(() => WYD.classes.switchTo('barbarian', WYD.state))]);
    assert.equal(await page.evaluate(() => WYD.state.pendingLoot.length), 2);
    // ページ離脱時には、拾う猶予中の重要ドロップも保存される。
    await page.evaluate(() => {
      WYD.state.settings.speed = 0;
      const item = WYD.loot.createUnique(WYD.state, 10);
      WYD.currentWorld.drops = [{ item, x: 200, y: 200, age: 0 }];
      window.dispatchEvent(new Event('pagehide'));
    });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem(WYD.save.KEY)).pendingLoot.length), 3);
    assert.deepEqual(errors, []);
    console.log('ok 自動保護・土台保護OFF・満杯時の保管・保存直前ドロップ・重複除外・停止/受取・全分解・旧セーブ・職業別保存・再読み込み・390px・48px / errors 0');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
