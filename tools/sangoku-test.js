// 天下三分（sangoku/）のテスト：データの整合、命令、数十年の自動進行、画面の通し操作
// 使い方：node tools/sangoku-test.js
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../sangoku');
const files = ['data/rules.js', 'data/cities.js', 'data/officers.js', 'data/scenarios.js', 'data/art.js', 'data/tactics.js', 'src/game.js', 'src/tactics.js'];
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const f of files) assert.ok(html.includes(`src="${f}"`), `index.html が ${f} を読み込んでいない`);
const ctx = {};
vm.createContext(ctx);
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const SG = ctx.SG;

// データ
const ids = SG.data.officers.map(o => o.id);
assert.strictEqual(new Set(ids).size, ids.length, '武将の名前が重複している');
const cityIds = new Set(SG.data.cities.map(c => c.id));
for (const [a, b] of SG.data.roads) assert.ok(cityIds.has(a) && cityIds.has(b), `道の都市がない: ${a}-${b}`);
const seen = new Set([SG.data.cities[0].id]), todo = [SG.data.cities[0].id];
while (todo.length) for (const n of SG.adj(todo.pop())) if (!seen.has(n)) { seen.add(n); todo.push(n); }
assert.strictEqual(seen.size, cityIds.size, 'つながっていない都市がある');
const { bounds, image } = SG.data.geo;
assert.ok(fs.existsSync(path.join(root, image)), '地図の絵がない');
for (const c of SG.data.cities) assert.ok(c.lon > bounds.lon0 && c.lon < bounds.lon0 + bounds.span && c.lat < bounds.lat1 && c.lat > bounds.lat1 - bounds.span, `${c.id} が地図の外`);
const art = SG.data.art;
for (const f of [...Object.values(art.castle), art.flag, art.capital]) assert.ok(fs.existsSync(path.join(root, f)), `絵がない: ${f}`);
for (const id of ['agri', 'comm', 'def', 'order', 'recruit', 'train', 'attack', 'move', 'search', 'employ', 'reward', 'trade', 'delegate', 'captives', 'forces', 'officers']) assert.ok(fs.existsSync(path.join(root, art.cmd + id + '.webp')), `命令の絵がない: ${id}`);
for (const [, p] of art.logIcons) { const [d, n] = p.split('/'); assert.ok(fs.existsSync(path.join(root, art[d] + n + '.webp')), `記録の絵がない: ${p}`); }
for (const o of SG.data.officers) for (const k of ['lead', 'war', 'int', 'pol', 'cha']) assert.ok(o[k] >= 1 && o[k] <= 100, `${o.id} の ${k}`);

// 命令
let s = SG.newGame('s194', '劉備', 42);
const c = s.cities['下邳'];
const gold = c.gold, agri = c.agri;
let r = SG.exec(s, 'develop', { city: '下邳', officer: '糜竺', kind: 'agri' });
assert.ok(r.ok, r.msg);
assert.ok(c.agri > agri && c.gold === gold - SG.data.rules.devCost, '開墾で農業が上がり金が減る');
assert.ok(!SG.exec(s, 'develop', { city: '下邳', officer: '糜竺', kind: 'comm' }).ok, '同じ月に2回は動けない');
assert.ok(!SG.exec(s, 'develop', { city: '下邳', officer: '曹操', kind: 'comm' }).ok, '他勢力の武将は使えない');
const troops = c.troops;
assert.ok(SG.exec(s, 'recruit', { city: '下邳', officer: '劉備', amount: 1000 }).ok);
assert.strictEqual(c.troops, troops + 1000);
// 攻撃：結果にかかわらず数がおかしくならない
r = SG.exec(s, 'attack', { city: '下邳', to: '北海', units: [{ officer: '関羽', troops: 8000 }, { officer: '陳登', troops: 6000 }] });
assert.ok(r.ok && r.report && r.report.lines.length > 2, r.msg);
assert.ok(s.cities['北海'].troops >= 0 && c.troops >= 0);
for (const id of s.captives.slice()) SG.decideCaptive(s, id, 'release');
// 空白地の占領
s.cities['零陵'].owner = null;
const o = s.officers['黄忠'];
r = SG.exec(s, 'move', { city: '長沙', to: '零陵', officers: ['黄忠'], troops: 1000 });
assert.ok(r.ok && s.cities['零陵'].owner === '劉表' && o.city === '零陵', '空白地へ移動すると占領');

// マス戦闘：両軍AIで決着まで。兵の数がおかしくならず、勝てば城が移る
for (let seed = 1; seed <= 12; seed++) {
  const t = SG.newGame('s194', '曹操', seed);
  const r = SG.exec(t, 'attack', { city: '陳留', to: '河内', mode: 'tactics', units: [{ officer: '夏侯惇', troops: 8000 }, { officer: '典韋', troops: 5000 }, { officer: '郭嘉', troops: 4000 }] });
  assert.ok(r.ok && r.tactics && t.battle, r.msg);
  const T = t.battle;
  assert.strictEqual(T.tiles.filter(x => x === 'keep').length, 1, '本陣が1つ');
  assert.ok(Object.keys(T.gates).length === 2, '城門が2つ');
  // プレイヤーの操作：動けるマスへ動いて待機
  const u = SG.tactics.byUid(T, 'atk:0');
  const to = [...SG.tactics.reachable(t, T, u).keys()].find(i => i !== u.pos);
  assert.ok(SG.tactics.move(t, T, 'atk:0', to).ok, '移動できる');
  assert.ok(!SG.tactics.move(t, T, 'atk:0', to).ok, '2回は動けない');
  assert.ok(SG.tactics.act(t, T, 'atk:0', 'wait').ok);
  SG.tactics.endTurn(t, T);
  assert.ok(T.over || T.phase === 'atk', '相手の番のあとは自分の番');
  SG.tactics.auto(t, T);
  assert.ok(T.over && T.day <= SG.data.tactics.maxDays, '決着する');
  const rep = SG.tactics.finish(t, T);
  assert.strictEqual(t.battle, null);
  assert.strictEqual(t.cities['河内'].owner, rep.win ? '曹操' : '張楊');
  assert.ok(Number.isFinite(t.cities['河内'].troops) && t.cities['河内'].troops >= 0 && t.cities['陳留'].troops >= 0);
  JSON.parse(JSON.stringify(t));
}
// 攻められたら止まる（プレイヤーが迎え撃つ）→ 決着のあと、つづきから月を進める
{
  const t = SG.newGame('s194', '劉備', 7);
  t.interactive = true;
  let battles = 0;
  for (let m = 0; m < 12 * 4 && !t.over; m++) {
    SG.startEndTurn(t);
    let res = SG.runEndTurn(t);
    while (res === 'battle') {
      battles++;
      const T = JSON.parse(JSON.stringify(t.battle)); // セーブしても続けられる
      t.battle = T;
      assert.strictEqual(T.playerSide, 'def');
      SG.tactics.auto(t, T); SG.tactics.finish(t, T);
      res = SG.runEndTurn(t);
    }
    for (const id of t.captives.slice()) SG.decideCaptive(t, id, 'release');
    assert.ok(!t.turnQueue, '月の終わりが最後まで進む');
  }
  console.log(`迎え撃った戦：${battles}回（4年）`);
  assert.ok(battles > 0, 'AIがプレイヤーの都市を攻めてくる');
}

// 数十年の自動進行（全勢力AI。プレイヤーも委任）
function check(s, label) {
  for (const c of Object.values(s.cities)) for (const k of ['gold', 'food', 'troops', 'pop', 'agri', 'comm', 'def', 'order', 'training']) assert.ok(Number.isFinite(c[k]) && c[k] >= 0, `${label} ${c.id}.${k}=${c[k]}`);
  for (const o of Object.values(s.officers)) {
    if (o.status === 'serve') { assert.ok(s.forces[o.force].alive, `${label} ${o.id} の勢力が滅んでいる`); assert.strictEqual(s.cities[o.city].owner, o.force, `${label} ${o.id} が自勢力でない都市（${o.city}）にいる`); }
    if (o.status === 'captive') assert.ok(s.captives.includes(o.id), `${label} ${o.id} が捕虜のまま残っている`);
  }
  for (const f of Object.values(s.forces)) if (f.alive) { const ru = s.officers[f.ruler]; assert.ok(ru.status === 'serve' && ru.force === f.id, `${label} ${f.id} の君主がいない`); assert.ok(SG.citiesOf(s, f.id).length > 0); }
}
for (const seed of [1, 2, 3]) {
  s = SG.newGame('s194', '曹操', seed);
  for (const c of SG.citiesOf(s, '曹操')) c.delegate = true;
  let wars = 0;
  for (let i = 0; i < 12 * 25 && !s.over; i++) {
    for (const c of SG.citiesOf(s, s.player)) c.delegate = true;
    s.reports = [];
    SG.endTurn(s);
    for (const id of s.captives.slice()) SG.decideCaptive(s, id, 'employ');
    check(s, `seed${seed} ${SG.dateText(s)}`);
    wars = s.log.filter(l => /を攻撃/.test(l.text)).length || wars;
  }
  const alive = Object.values(s.forces).filter(f => f.alive).length;
  console.log(`seed${seed}: ${SG.dateText(s)} 残った勢力 ${alive}`);
  assert.ok(alive < 21, '25年たっても勢力が減らない（AIが戦争をしていない）');
  assert.ok(JSON.parse(JSON.stringify(s)).year === s.year, 'セーブできる');
}

// 画面の通し操作
(async () => {
  const { chromium } = require('playwright');
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const b = await chromium.launch(exe);
  const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
  pg.setDefaultTimeout(5000);
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const badImages = []; pg.on('requestfailed', r => badImages.push(r.url()));
  await pg.goto('file://' + path.join(root, 'index.html'));
  await pg.evaluate(() => localStorage.clear());
  await pg.reload();
  await pg.click('.force-card[data-f="袁紹"]');
  const closeAll = async () => { while (await pg.isVisible('#modal-box [data-close]')) await pg.click('#modal-box [data-close]'); };
  // 地図の拡大：ホイールで拡大、ドラッグで動かしても都市は選ばれない、ミニマップで移動、全体に戻す
  const vb = () => pg.getAttribute('#map', 'viewBox').then(v => v.split(' ').map(Number));
  const box = await pg.$eval('#map', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const w0 = (await vb())[2];
  await pg.mouse.move(box.x, box.y); await pg.mouse.wheel(0, -400); await pg.waitForTimeout(50);
  assert.ok((await vb())[2] < w0, 'ホイールで拡大する');
  const selName = await pg.textContent('#city h2');
  const v1 = await vb();
  await pg.mouse.move(box.x, box.y); await pg.mouse.down(); await pg.mouse.move(box.x - 120, box.y - 80, { steps: 6 }); await pg.mouse.up();
  assert.ok((await vb())[0] !== v1[0], 'ドラッグで地図が動く');
  assert.strictEqual(await pg.textContent('#city h2'), selName, 'ドラッグでは都市を選ばない');
  const mm = await pg.$eval('#minimap', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width * 0.8, y: r.y + r.height * 0.2 }; });
  const v2 = await vb(); await pg.mouse.click(mm.x, mm.y);
  assert.ok((await vb())[0] !== v2[0], 'ミニマップで移動する');
  await pg.click('#zoom-all'); assert.ok((await vb())[3] >= 1024, '全体に戻す');
  await pg.click('[data-cmd="comm"]'); await pg.click('tr.pick');
  await pg.click('[data-cmd="attack"]'); await pg.click('[data-to]'); await pg.click('#go');
  assert.ok(await pg.isVisible('#battle'), 'マス戦闘の画面が開く');
  pg.on('dialog', d => d.accept());
  await pg.click('#b-auto'); await pg.click('#b-close');
  assert.ok(!(await pg.isVisible('#battle')), 'マス戦闘の画面が閉じる');
  await closeAll();
  for (let i = 0; i < 12 && await pg.isEnabled('#btn-end'); i++) {
    await pg.click('#btn-end');
    if (await pg.isVisible('#b-auto')) { await pg.click('#b-auto'); await pg.click('#b-close'); }
    await closeAll();
  }
  const date = await pg.evaluate(() => SG.ui.state.year * 100 + SG.ui.state.month);
  await pg.reload();
  assert.strictEqual(await pg.evaluate(() => SG.ui.state.year * 100 + SG.ui.state.month), date, '再読み込みでセーブから続く');
  await b.close();
  assert.deepStrictEqual(errs, [], 'ページのエラー');
  assert.deepStrictEqual(badImages, [], '読み込めない絵');
  console.log('天下三分のテスト：成功');
})().catch(e => { console.error(e); process.exit(1); });
