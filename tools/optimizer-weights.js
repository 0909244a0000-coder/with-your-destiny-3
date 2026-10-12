// おすすめ装備の重み（data/optimizer.js の weights・byClass）を、能力の計測結果（tools/stat-weights.js）から作る。
// node tools/optimizer-weights.js [計測のフォルダ=docs/reviews/2026-10-10-stat-weights]  → data/optimizer.js に貼る JSON を出す
// 重み = 能力1点で伸びる割合（%）×10（10点 = 1%）。ビルドごとの中央値。マイナスは0にする（ぶれと、離れて戦う職業の移動速度）。
// 型：猛攻（しくみ hanuman か frenzy の変身）がONのビルドは "frenzy"、ほかは "normal"。
// 対人はまだ測っていないので、火力と防御の平均にする。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const dir = path.resolve(process.argv[2] || path.join(root, 'docs/reviews/2026-10-10-stat-weights'));
// ゲームの data を読む（index.html の順）
const ctx = { window: {}, console };
ctx.window.WYD = ctx.WYD = {};
vm.createContext(ctx);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script src="(data\/[^"]+)"/g)) vm.runInContext(fs.readFileSync(path.join(root, m[1]), 'utf8'), ctx);
const D = ctx.WYD.data, I = D.items;
const roll = {};
for (const a of I.affixes) roll[a.stat] = (a.range[0] + a.range[1]) / 2 * (I.stats[a.stat].scales ? 1 + I.levelScaling * 49 : 1);
const stats = Object.keys(roll);
// 猛攻のスキル（職業ごとの定義から）
const frenzyIds = new Set();
for (const c of Object.values(D.classes)) for (const [id, s] of Object.entries(c.skills || {})) if (s.kind === 'hanuman' || s.frenzy) frenzyIds.add(id);
for (const [id, s] of Object.entries(D.skills)) if (s.kind === 'hanuman' || s.frenzy || id === 'hanuman') frenzyIds.add(id);
const median = (v) => { v = [...v].sort((a, b) => a - b); const n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : 0; };
const r2 = (x) => Math.round(Math.max(0, x) * 100) / 100;
const weightsOf = (builds) => {
  const dmg = {}, def = {}, pvp = {};
  for (const s of stats) {
    dmg[s] = r2(median(builds.map((b) => b.dpsGain[s])) / roll[s] * 10);
    def[s] = r2(median(builds.map((b) => b.survGain[s])) / roll[s] * 10);
    pvp[s] = r2((dmg[s] + def[s]) / 2);
  }
  return { damage: dmg, defense: def, pvp };
};
const all = [], byClass = {};
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const { classId, builds } = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  all.push(...builds);
  const fr = builds.filter((b) => b.skills.some((id) => frenzyIds.has(id))), nm = builds.filter((b) => !b.skills.some((id) => frenzyIds.has(id)));
  byClass[classId] = { normal: weightsOf(nm), frenzy: weightsOf(fr.length ? fr : nm), builds: { normal: nm.length, frenzy: fr.length } };
}
console.log(JSON.stringify({ roll, frenzySkills: [...frenzyIds], default: weightsOf(all.filter((b) => !b.skills.some((id) => frenzyIds.has(id)))), byClass }, null, 1));
