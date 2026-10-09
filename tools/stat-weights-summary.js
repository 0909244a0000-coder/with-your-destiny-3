// tools/stat-weights.js の結果（職業ごとの JSON）をまとめる：職業ごとの中央値 [10%点〜90%点] と、1点あたりの効き目。
// node tools/stat-weights-summary.js [フォルダ=docs/reviews/2026-10-09-stat-weights]
const fs = require('node:fs');
const path = require('node:path');
const dir = process.argv[2] || path.resolve(__dirname, '../docs/reviews/2026-10-09-stat-weights');
const stats = ['attack', 'defense', 'maxHp', 'hpRegen', 'attackSpeed', 'critChance', 'moveSpeed', 'skillDamage'];
const jp = { attack: '攻撃', defense: '防御', maxHp: 'HP', hpRegen: '回復', attackSpeed: '攻速', critChance: '会心', moveSpeed: '移速', skillDamage: '技威' };
// 1つぶん = Lv50 の追加能力の平均（data/items.js の affixes と levelScaling。tools/stat-weights.js と同じ）
const roll = { attack: 17.2, defense: 17.2, maxHp: 68.8, hpRegen: 5.16, attackSpeed: 5.5, critChance: 2.5, moveSpeed: 5.5, skillDamage: 8.5 };
const q = (v, p) => { v = [...v].sort((a, b) => a - b); const i = (v.length - 1) * p, lo = Math.floor(i), hi = Math.min(lo + 1, v.length - 1); return v[lo] + (v[hi] - v[lo]) * (i - lo); };
const classes = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
for (const metric of ['dpsGain', 'survGain']) {
  console.log(`\n${metric === 'dpsGain' ? '火力' : '生存'}：1つぶんあたり %（中央値 [10%点〜90%点]）`);
  console.log('職業'.padEnd(12) + stats.map((s) => jp[s].padStart(17)).join(''));
  const all = [];
  for (const c of classes) {
    all.push(...c.builds);
    console.log(c.classId.padEnd(12) + stats.map((s) => { const v = c.builds.map((b) => b[metric][s]); return `${q(v, .5).toFixed(2)} [${q(v, .1).toFixed(1)},${q(v, .9).toFixed(1)}]`.padStart(18); }).join(''));
  }
  console.log('全部'.padEnd(12) + stats.map((s) => { const v = all.map((b) => b[metric][s]); return `${q(v, .5).toFixed(2)} [${q(v, .1).toFixed(1)},${q(v, .9).toFixed(1)}]`.padStart(18); }).join(''));
}
// 型：技威力が効く（+2%より上）＝スキル型、ほか＝通常攻撃型（傀儡師は人形が HP・防御で強くなるので別）
const flat = classes.flatMap((c) => c.builds.map((b) => ({ c: c.classId, b })));
const groups = { スキル型: flat.filter((x) => x.c !== 'puppeteer' && x.b.dpsGain.skillDamage > 2), 通常攻撃型: flat.filter((x) => x.c !== 'puppeteer' && x.b.dpsGain.skillDamage <= 2), 傀儡師: flat.filter((x) => x.c === 'puppeteer') };
console.log('\n火力：1点あたり %（中央値）と、ビルドの数・与ダメージ/秒の中央値');
for (const [name, g] of Object.entries(groups)) {
  console.log(name.padEnd(8), stats.map((s) => `${jp[s]} ${(q(g.map((x) => x.b.dpsGain[s]), .5) / roll[s]).toFixed(3)}`).join('  '), `｜${g.length}ビルド DPS ${Math.round(q(g.map((x) => x.b.dps), .5))}`);
}
console.log('\n生存：1点あたり %（全ビルドの中央値）');
console.log(stats.map((s) => `${jp[s]} ${(q(flat.map((x) => x.b.survGain[s]), .5) / roll[s]).toFixed(3)}`).join('  '));
