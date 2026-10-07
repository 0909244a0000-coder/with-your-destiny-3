// 奈落の双王の段階を選べることの確認。node tools/uber-stage-test.js（Playwright＋Chromium）
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { if (!sessionStorage.getItem('init')) { localStorage.clear(); sessionStorage.setItem('init', '1'); } });
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.click('#modal-ok').catch(() => {});
    const r = await page.evaluate(() => {
      const s = WYD.state, U = WYD.data.uber, ui = WYD.ui, $ = id => document.getElementById(id), out = {};
      s.trial.best = 10; s.uber.keys = 9; ui.renderPanels();
      const max = 10 + U.stageOffset;
      out.defaultMax = WYD.uber.stage(s) === max && $('uber-stage').textContent === `段階${max}` && $('uber-up').disabled;
      for (let i = 0; i < 20; i++) $('uber-down').click();
      ui.renderPanels();
      out.downToMin = WYD.uber.stage(s) === U.minStage && s.uber.stage === U.minStage && $('uber-down').disabled && !$('uber-up').disabled;
      $('uber-up').click(); $('uber-up').click(); ui.renderPanels();
      out.picked = WYD.uber.stage(s) === U.minStage + 2;
      // 試練の記録が伸びても、選んだ段階はそのまま
      s.trial.best = 20; out.keepPick = WYD.uber.stage(s) === U.minStage + 2;
      // 最高まで上げると「最高に合わせる」に戻る（記録と一緒に上がる）
      for (let i = 0; i < 40; i++) WYD.uber.changeStage(s, 1);
      out.backToAuto = s.uber.stage === null && WYD.uber.stage(s) === 20 + U.stageOffset;
      s.trial.best = 25; out.followsBest = WYD.uber.stage(s) === 25 + U.stageOffset;
      // 記録より高い段階を選んでいても、最高を超えない（古い値・書き換え対策）
      s.uber.stage = 999; out.clamped = WYD.uber.stage(s) === WYD.uber.maxStage(s);
      // 選んだ段階で挑み、鍵を使う。挑戦中は段階を変えられない
      s.uber.stage = 8; ui.renderPanels(); const keys = s.uber.keys;
      if (ui.world.town) WYD.town.toggle(ui.world, s);
      WYD.uber.start(ui.world, s); ui.renderPanels();
      out.started = s.trialRun && s.trialRun.uber && s.trialRun.level === 8 && s.uber.keys === keys - U.keysNeeded && $('uber-down').disabled && $('uber-up').disabled;
      // 保存と読み込み
      WYD.save.write(s); out.saved = WYD.save.load().uber.stage === 8;
      // 段階のなかった頃のセーブは「最高」
      const old = JSON.parse(localStorage.getItem(WYD.save.KEY)); delete old.uber.stage; localStorage.setItem(WYD.save.KEY, JSON.stringify(old));
      out.oldSave = WYD.save.load().uber.stage === null;
      return out;
    });
    console.log(r);
    for (const [k, v] of Object.entries(r)) assert.equal(v, true, k);
    assert.deepEqual(errors, []);
    console.log('uber stage OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
