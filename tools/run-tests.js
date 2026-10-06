// 全テストをまとめて動かす。PRを出す前に必ず実行する：node tools/run-tests.js
// 一部だけ：node tools/run-tests.js arena training（名前に含まれる語で絞る）
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const filters = process.argv.slice(2);
const tests = fs.readdirSync(__dirname).filter(f => f.endsWith('-test.js') && (!filters.length || filters.some(w => f.includes(w)))).sort();
const preload = '--require=' + path.join(__dirname, 'test-preload.cjs');
const env = { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, preload].filter(Boolean).join(' ') };
const failed = [];
for (const file of tests) {
  const start = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { env, encoding: 'utf8', timeout: 10 * 60 * 1000 });
  const secs = ((Date.now() - start) / 1000).toFixed(0);
  if (r.status === 0) console.log(`OK   ${file} (${secs}秒)`);
  else {
    failed.push(file);
    const lines = (r.stdout + r.stderr).split('\n').filter(l => l.trim() && !/^\s+at /.test(l));
    console.log(`失敗 ${file} (${secs}秒)\n     ${lines.slice(-6).join('\n     ')}`);
  }
}
console.log(`\n${tests.length - failed.length} / ${tests.length} 成功` + (failed.length ? `\n失敗：${failed.join(', ')}` : ''));
process.exit(failed.length ? 1 : 0);
