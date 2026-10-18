// 天下三分：地図の絵を頼むときの下絵（海岸線・川・都市の位置）を作る
// 使い方：node tools/sangoku-map-guide.js  → sangoku/docs/map-guide.png（2048×2048）
// 範囲は 経度98〜125度・緯度16.3〜43.3度 の正方形（sangoku/docs/ART-REQUEST.md の M1 と同じ）
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../sangoku');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/cities.js'), 'utf8'), ctx);
const { cities, geo } = ctx.SG.data;
const S = 2048, LON0 = 98, LAT1 = 43.3, K = S / 27;
const X = lon => ((lon - LON0) * K).toFixed(1), Y = lat => ((LAT1 - lat) * K).toFixed(1);
const pts = a => a.map(([lo, la]) => X(lo) + ',' + Y(la)).join(' ');
// 下絵では海岸線を画面の端まで伸ばす（上と左は陸）
const coast = [[LON0, LAT1], [124.8, LAT1], ...geo.coast.slice(1, -1), [105, 16.3], [LON0, 16.3]];
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<rect width="${S}" height="${S}" fill="#9cc3dd"/><polygon points="${pts(coast)}" fill="#efe6cf" stroke="#555" stroke-width="3"/>`;
for (const [name, r] of Object.entries(geo.rivers)) svg += `<polyline points="${pts(r)}" fill="none" stroke="#2f78c4" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><text x="${X(r[2][0])}" y="${+Y(r[2][1]) - 18}" font-size="36" fill="#2f78c4">${name}</text>`;
for (let lon = 100; lon <= 125; lon += 5) svg += `<line x1="${X(lon)}" y1="0" x2="${X(lon)}" y2="${S}" stroke="#0003" stroke-width="2" stroke-dasharray="8 8"/>`;
for (let lat = 20; lat <= 40; lat += 5) svg += `<line x1="0" y1="${Y(lat)}" x2="${S}" y2="${Y(lat)}" stroke="#0003" stroke-width="2" stroke-dasharray="8 8"/>`;
for (const c of cities) svg += `<circle cx="${X(c.lon)}" cy="${Y(c.lat)}" r="16" fill="#d0342c" stroke="#fff" stroke-width="4"/><text x="${X(c.lon)}" y="${+Y(c.lat) + 52}" font-size="32" text-anchor="middle" fill="#222" font-family="serif">${c.id}</text>`;
svg += `</svg>`;
(async () => {
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const b = await chromium.launch(exe);
  const pg = await b.newPage({ viewport: { width: S, height: S } });
  await pg.setContent(`<body style="margin:0">${svg}</body>`);
  const out = path.join(root, 'docs/map-guide.png');
  await pg.screenshot({ path: out });
  await b.close();
  // 都市の位置（ピクセル）も表にして出す
  console.log(cities.map(c => `${c.id} ${Math.round(X(c.lon))},${Math.round(Y(c.lat))}`).join('\n'));
  console.log('作成：' + out);
})();
