// 1コマの中でエラーが出ても、ゲームは止まらない（src/main.js の loop）。古いデータ（キャッシュ）と混ざっても宝石の画面は開ける。
// node tools/loop-safety-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage(); const errors = [], logged = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') logged.push(m.text()); });
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.evaluate(() => { WYD.resetting = true; localStorage.clear(); });
    await page.reload(); await page.click('#modal-ok');
    // 画面の描きなおしで毎コマ同じエラーが出る状態にする → それでも冒険は進み、エラーの記録は1回だけ
    const before = await page.evaluate(() => {
      const ui = WYD.ui, base = ui.frame.bind(ui);
      ui.frame = () => { base(); throw new Error('テスト用のエラー'); };
      WYD.state.settings.speed = 1; return WYD.currentWorld.time || 0;
    });
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => WYD.currentWorld.time || 0);
    assert(after > before + 0.2, `ゲームが止まった（${before} → ${after}）`);
    assert.equal(logged.filter(t => t.includes('テスト用のエラー')).length, 1, '同じエラーは1回だけ記録');
    // 古い data/gems.js（再合成の数値がない）と混ざっても、宝石の画面は開けて止まらない
    const gv = await page.evaluate(() => { delete WYD.data.gems.fusion.refuse; WYD.state.gems = { 'fused:attack=3': 1 }; WYD.gemVault.open(); return { open: !document.getElementById('gemvault').hidden, refuse: !!document.querySelector('[data-gv-act="refuse"]') }; });
    assert.deepEqual(gv, { open: true, refuse: false });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ before, after, gv }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
