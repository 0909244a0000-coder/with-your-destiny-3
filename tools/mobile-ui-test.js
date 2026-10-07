// スマホ縦持ちの画面の確認。node tools/mobile-ui-test.js（Playwright＋Chromium）
// 縦持ちだけスマホの画面になり、PC・横持ちは今までどおり。タブで画面全体が切り替わり、戦場は主人公を追う。
// SHOT=フォルダ を付けると、各画面の写真を保存する
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { if (!sessionStorage.getItem('init')) { localStorage.clear(); sessionStorage.setItem('init', '1'); } localStorage.setItem('wyd3-active-class', 'puppeteer'); });
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.click('#modal-ok').catch(() => {});
    const shot = async name => { if (process.env.SHOT) await page.screenshot({ path: path.join(process.env.SHOT, name + '.png') }); };
    const is = () => page.evaluate(() => document.documentElement.classList.contains('m-ui'));
    assert(await is(), '縦持ちでスマホの画面になる');
    await page.evaluate(() => { const s = WYD.state; s.player.level = 30; for (const id in WYD.data.skills) s.player.skills[id] = 5; WYD.ui.renderPanels(); if (WYD.ui.world.town) WYD.town.toggle(WYD.ui.world, s); });
    await page.waitForTimeout(1500); await shot('battle');
    // 戦場：上のバーとHUDの間をうめ、寄る（既定）では戦場の高さいっぱい。主人公が横の真ん中付近
    const cam = await page.evaluate(() => {
      const st = document.querySelector('.game-screen .stage').getBoundingClientRect(), c = document.getElementById('game').getBoundingClientRect();
      const top = document.querySelector('.hud-top').getBoundingClientRect(), hud = document.querySelector('.combat-dock').getBoundingClientRect(), tabs = document.getElementById('m-tabs').getBoundingClientRect();
      const p = WYD.ui.world.player, px = c.left + p.x / WYD.data.map.width * c.width;
      return { stageTop: st.top - top.bottom, stageBottom: hud.top - st.bottom, hudOnTabs: Math.round(tabs.top - hud.bottom), fill: c.height / st.height, playerX: (px - st.left) / st.width, mapX: p.x / WYD.data.map.width, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert(Math.abs(cam.stageTop) <= 2 && Math.abs(cam.stageBottom) <= 2 && Math.abs(cam.hudOnTabs) <= 2 && cam.fill > 0.98 && !cam.overflow, JSON.stringify(cam));
    // 主人公が端にいないときは、横の真ん中に映る
    if (cam.mapX > 0.25 && cam.mapX < 0.75) assert(Math.abs(cam.playerX - 0.5) < 0.12, JSON.stringify(cam));
    // ズームの切り替え：全体では横幅いっぱいに全体が入る
    const zoom = await page.evaluate(async () => { const out = []; for (let i = 0; i < 3; i++) { document.getElementById('m-zoom').click(); await new Promise(r => setTimeout(r, 120)); const c = document.getElementById('game').getBoundingClientRect(); out.push([document.getElementById('m-zoom').textContent, Math.round(c.width)]); } return out; });
    assert(zoom.some(([l, w]) => l === '全体' && w === 390) && zoom[2][0] === '寄る', JSON.stringify(zoom));
    // タブ：押すと画面全体が切り替わり、タブは押せるまま
    for (const tab of ['bag', 'status', 'skills', 'upgrade', 'more', 'battle']) {
      await page.click(`[data-m-tab="${tab}"]`); await page.waitForTimeout(150); await shot('tab-' + tab);
      const r = await page.evaluate(tab => {
        const bag = document.getElementById('bag'), more = document.getElementById('m-more'), tabs = document.getElementById('m-tabs').getBoundingClientRect();
        const box = tab === 'more' ? more.getBoundingClientRect() : tab === 'battle' ? null : bag.getBoundingClientRect();
        return { cur: WYD.mobile.currentTab(), on: document.querySelector('[data-m-tab].on').dataset.mTab, full: !box || (box.width >= innerWidth - 1 && Math.abs(box.bottom - tabs.top) <= 2 && box.top <= 1),
          tabTap: document.elementFromPoint(tabs.left + 10, tabs.top + 10)?.closest('#m-tabs') != null, hiddenAll: tab === 'battle' ? !bag.hidden || !more.hidden : false };
      }, tab);
      assert(r.cur === tab && r.on === tab && r.full && r.tabTap && !r.hiddenAll, tab + ' ' + JSON.stringify(r));
    }
    // 「その他」：やり込みの窓を開き、戦闘タブで閉じる。設定・ログが入っている
    await page.click('[data-m-tab="more"]');
    const more = await page.evaluate(() => ({ settings: !!document.querySelector('#m-settings #reset'), pickup: !!document.querySelector('#m-pickup #auto-equip'), log: !!document.querySelector('#m-log #log'), cls: !!document.querySelector('#m-char #class-select') }));
    assert(Object.values(more).every(Boolean), JSON.stringify(more));
    await page.click('[data-m-proxy="codex-open"]'); await page.waitForTimeout(150); await shot('codex');
    assert.equal(await page.evaluate(() => [document.getElementById('codex').hidden, WYD.mobile.currentTab()].join()), 'false,more');
    await page.click('[data-m-tab="battle"]');
    assert.equal(await page.evaluate(() => document.querySelectorAll('.modal:not([hidden])').length), 0);
    // 速度・一時停止
    await page.click('#m-speed'); assert.equal(await page.evaluate(() => WYD.state.settings.speed), 2);
    await page.click('#m-pause'); assert(await page.evaluate(() => WYD.ui.paused)); await page.click('#m-pause');
    // 横持ち・PCの幅に戻すと、今までの画面に戻り、移した部品も元の場所へ
    for (const [w, h] of [[844, 390], [1280, 800]]) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(150);
      const r = await page.evaluate(() => ({ m: document.documentElement.classList.contains('m-ui'), back: !!document.querySelector('.hud-top .menus #reset') && !!document.querySelector('.hud-top #class-select') && !!document.querySelector('#game-log-panel #log'),
        canvas: document.getElementById('game').style.transform === '', tabs: getComputedStyle(document.getElementById('m-tabs')).display }));
      assert(!r.m && r.back && r.canvas && r.tabs === 'none', w + ' ' + JSON.stringify(r));
    }
    // 縦持ちに戻すと、またスマホの画面。ズームの段階は覚えている
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
    assert(await is());
    await page.reload(); await page.click('#modal-ok').catch(() => {});
    assert.equal(await page.evaluate(() => document.getElementById('m-zoom').textContent), '寄る');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ cam, zoom, more }));
    console.log('mobile ui OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
