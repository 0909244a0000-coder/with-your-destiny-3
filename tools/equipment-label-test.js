// node tools/equipment-label-test.js：全職業の固有能力・セット・星座の技名と装備説明を確認。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    const classes = await page.evaluate(() => Object.keys(WYD.data.classes));
    for (const cls of classes) {
      await page.evaluate(id => { localStorage.clear(); localStorage.setItem('wyd3-active-class', id); WYD.resetting = true; }, cls);
      await page.reload(); await page.click('#modal-ok');
      const result = await page.evaluate(() => {
        WYD.state.settings.speed = 0;
        const defs = [...WYD.data.uniques.list, ...WYD.data.sets.list.flatMap(s => Object.values(s.bonuses)), ...WYD.data.devotion.list.map(c => c.bonus)].filter(d => d.desc);
        const failures = [];
        let tokens = 0;
        for (const def of defs) {
          const text = WYD.loot.uniqueDesc(def);
          for (const [, kind] of def.desc.matchAll(/\{skill:(\w+)\}/g)) {
            tokens++;
            const active = WYD.classes.hasKind(kind), name = WYD.classes.skillNameByKind(kind);
            const expected = name + (active ? '' : '（この職業では発動しない）');
            if (!text.includes(expected) || /[a-zA-Z_]/.test(name) || name === '未対応のスキル') failures.push({ kind, text });
            if (active && !Object.values(WYD.data.skills).some(s => s.name === name)) failures.push({ kind, name });
          }
          if (/\{skill:/.test(text)) failures.push({ text });
        }
        const u = WYD.data.uniques.list.find(u => u.id === 'agniBangle');
        const item = WYD.loot.createUnique(WYD.state, 15, u);
        const before = JSON.stringify(item);
        const panel = document.createElement('div'); panel.innerHTML = WYD.ui.itemHtml(item);
        const itemText = panel.textContent;
        const notes = WYD.classes.id === 'bombmancer' ? {
          unsupported: itemText.includes('旋風斬（この職業では発動しない）'),
          supported: WYD.loot.uniqueDesc(WYD.data.uniques.list.find(u => u.id === 'indraRing')).includes('灰の外套の発動中'),
          own: WYD.loot.uniqueDesc(WYD.data.uniques.list.find(u => u.id === 'funeralWatch')).includes('爆弾スキル'),
        } : {};
        return { failures, tokens, unchanged: before === JSON.stringify(item), notes, itemText };
      });
      assert.deepEqual(result.failures, [], cls);
      assert(result.unchanged);
      for (const [name, ok] of Object.entries(result.notes)) assert(ok, name);
      console.log('ok', cls, result.tokens, '技名');
      if (cls === 'bombmancer') console.log(result.itemText);
    }
    assert.deepEqual(errors, []); console.log('errors 0');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
