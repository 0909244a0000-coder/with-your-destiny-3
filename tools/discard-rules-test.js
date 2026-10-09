// 捨てる設定：「全て捨てる」で捨てるものをレア度・部位・ソケット・特殊効果・宝石・強化などで選べる。画面から選べて保存される。
// node tools/discard-rules-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.evaluate(() => { WYD.resetting = true; localStorage.clear(); });
    await page.reload(); await page.click('#modal-ok');
    const r = await page.evaluate(() => {
      const s = WYD.state, I = WYD.inventory; s.settings.speed = 0;
      const make = (slot, rarity, sockets, effects, extra) => { const it = WYD.loot.create(s, 10, 0, { slot, rarity }); it.sockets = Array(sockets).fill(null); it.effects = Array.from({ length: effects }, () => ({ id: 'lifesteal', value: 1 })); it.ancient = 0; it.plus = 0; it.forged = 0; return Object.assign(it, extra || {}); };
      const items = { m0: make('ring', 'magic', 0, 0), m2: make('ring', 'magic', 2, 0), fx: make('ring', 'magic', 0, 2), leg: make('ring', 'legend', 0, 0), helm: make('head', 'magic', 0, 0), plus: make('ring', 'magic', 0, 0, { plus: 3 }), anc: make('ring', 'magic', 0, 0, { ancient: 1 }), lock: make('ring', 'magic', 0, 0, { locked: true }) };
      s.inventory = Object.values(items);
      const names = () => Object.keys(items).filter((k) => I.discardTargets(s).includes(items[k]));
      const all = names();   // 最初は前と同じ（ロック以外ぜんぶ）
      document.getElementById('discard-open').click();
      const fire = (el) => el.dispatchEvent(new Event('change', { bubbles: true }));
      const chk = (sel, on) => { const el = document.querySelector(sel); el.checked = on; fire(el); };
      chk('[data-discard-rarity="legend"]', false); chk('[data-discard-slot="head"]', false);
      const sel = (id, v) => { const el = document.querySelector(`[data-discard-num="${id}"]`); el.value = String(v); fire(el); };
      sel('keepSockets', 2); sel('keepEffects', 2);
      chk('[data-discard-flag="keepWorked"]', true); chk('[data-discard-flag="keepAncient"]', true);
      const ruled = names();
      const shown = document.querySelector('#discard-body .discard-foot b').textContent;
      WYD.save.write(s); const d = WYD.save.load().settings.discard;
      return { all, ruled, shown, saved: { legend: d.rarities.legend, helm: d.slots.head, keepSockets: d.keepSockets, keepEffects: d.keepEffects, keepWorked: d.keepWorked, keepAncient: d.keepAncient } };
    });
    assert.deepEqual(r.all, ['m0', 'm2', 'fx', 'leg', 'helm', 'plus', 'anc'], '最初はロック以外ぜんぶ捨てる');
    assert.deepEqual(r.ruled, ['m0'], 'レジェンド・兜・ソケット2・特殊効果2・強化・太古は残す');
    assert.equal(r.shown, '1個');
    assert.deepEqual(r.saved, { legend: false, helm: false, keepSockets: 2, keepEffects: 2, keepWorked: true, keepAncient: true });
    // 「この決まりで捨てる」で、決まりに当たらないものだけ捨てる
    page.once('dialog', d => d.accept());
    await page.click('[data-discard-run]');
    const left = await page.evaluate(() => WYD.state.inventory.length);
    assert.equal(left, 7);
    assert.equal(await page.textContent('#discard-body .discard-foot b'), '0個');
    await page.click('[data-discard-filter]');
    assert.equal(await page.isVisible('#filter'), true, '拾う設定へ飛べる');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify(r));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
