// 能力の効き目の調査：職業×ビルド（スキル3つの組み合わせ）ごとに、能力を少し足したとき火力と生存がどれだけ変わるかを測る。
// おすすめ装備の重み（data/optimizer.js）を決める裏どり用。ゲームのデータやセーブは変えない。
// node tools/stat-weights.js [職業,...|all] [秒数=40] [乱数の数=2] [組み合わせの上限=0(全部)]  → 結果は標準出力に JSON
// 環境変数 AREA・DIFFICULTY でエリアと危険度を変えられる（はじめは inferno・5）
// 環境変数 OUT_DIR を指定すると、職業ごとに <OUT_DIR>/<職業>.json へ保存し、もうあるものは飛ばす（途中で止まっても続きから）
//
// 測り方
// - 条件：Lv50、選んだ3スキルだけ Lv10 で ON（ほかは Lv0。熟練・型・秘技・星座・宝石なし）、レジェンド9部位（Lv50・乱数固定）、
//   最後のエリア（業火の玉座）・危険度5の敵6体。敵は倒れない（HP固定）。出現・階・祠・裂け目は止める。
// - 火力：敵の攻撃を0にして、与ダメージ/秒（召喚・罠・効果こみ）。
// - 生存：敵がふつうに攻撃。被ダメージ/秒・回復/秒（吸血・自然回復・回復スキル）・最大HP を測り、
//   「20秒もつ敵の強さ」（敵の攻撃の倍率）=（最大HP ÷ 20 ＋ 回復/秒）÷ 被ダメージ/秒 で比べる。+10% なら 1割強い敵に同じだけ耐えられる。
//   被ダメージを倍率でのばすので、防御で引く量（一定）は今の敵の強さのときの効き目になる。
//   回復がむだにならないよう HP は7割より上に戻さず、2割を切ったら7割に戻す（倒れたときの秒数は守りのスキルの間に合い方で飛ぶので使わない）。
//   敵は倒れないので、敵を早く倒して身を守るぶんは入らない。
// - 能力を1つずつ「装備の追加能力4つぶん」（Lv50 の平均の値×4）足して、足さないときとの差（%）を4で割って「1つぶん」にする。
//   同じ乱数で比べる（足す前と後で運を同じにする）。
const { chromium } = require('playwright');
const path = require('node:path');
const [classArg = 'all', secArg = '40', seedArg = '2', limitArg = '0'] = process.argv.slice(2);
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    if (process.env.DEBUG) page.on('console', (m) => console.error(m.text()));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    const all = await page.evaluate(() => Object.keys(WYD.data.classes).filter((id) => id !== 'collector'));
    const classes = classArg === 'all' ? all : classArg.split(',');
    const out = { config: { seconds: Number(secArg), seeds: Number(seedArg), area: process.env.AREA || 'inferno', difficulty: Number(process.env.DIFFICULTY || 5), level: 50, skillLevel: 10, stacks: 4, dieTarget: 20, hpCeil: 0.7, hpFloor: 0.2, debug: !!process.env.DEBUG }, classes: [] };
    const outDir = process.env.OUT_DIR, fs = require('node:fs');
    if (outDir) fs.mkdirSync(outDir, { recursive: true });
    for (const classId of classes) {
      const file = outDir && path.join(outDir, classId + '.json');
      if (file && fs.existsSync(file)) { out.classes.push(JSON.parse(fs.readFileSync(file, 'utf8'))); continue; }
      await page.evaluate((id) => { WYD.resetting = true; localStorage.clear(); localStorage.setItem('wyd3-active-class', id); }, classId);
      await page.reload();
      const combos = await page.evaluate(() => {
        const ids = Object.keys(WYD.data.skills), c = [];
        for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) for (let d = b + 1; d < ids.length; d++) c.push([ids[a], ids[b], ids[d]]);
        return c;
      });
      const list = Number(limitArg) > 0 ? combos.slice(0, Number(limitArg)) : combos;
      const builds = [];
      const t0 = Date.now();
      for (const skills of list) {
        builds.push(await page.evaluate(([skills, cfg]) => {
          const W = WYD.world, ids = Object.keys(WYD.data.skills), I = WYD.data.items;
          // 乱数を固定（同じ種なら同じ運）
          const seeded = (seed) => { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
          const realRandom = Math.random;
          // 出現・階・祠・裂け目・記録の保存などを止める
          W.updateSpawns = () => {}; W.updateFloors = () => {};
          WYD.shrines.update = () => {}; WYD.breach.update = () => {};
          // 能力1つぶん（Lv50 の追加能力の平均）
          const roll = {};
          for (const a of I.affixes) roll[a.stat] = (a.range[0] + a.range[1]) / 2 * (I.stats[a.stat].scales ? 1 + I.levelScaling * 49 : 1);
          const gearFor = (seed) => {
            Math.random = seeded(seed * 7919);
            const s0 = WYD.save.newState(), g = {};
            for (const slot of Object.keys(I.slots)) g[slot] = WYD.loot.create(s0, 50, 0, { slot, rarity: 'legend' });
            Math.random = realRandom;
            return JSON.stringify(g);
          };
          const area = WYD.data.areas.find((a) => a.id === cfg.area);
          // mode 'dps'：敵は攻撃しない。与ダメージ/秒。
          // mode 'surv'：敵がふつうに攻撃。HPを7割より上に戻さない（回復がむだにならないように）・2割を切ったら7割に戻す。被ダメージ/秒・回復/秒・最大HP
          const run = (mode, seed, gear, stat) => {
            const s = WYD.save.newState();
            s.player.level = cfg.level; s.settings.autoSkill = false; s.settings.speed = 0; s.area = cfg.area; s.difficulty = cfg.difficulty; s.floor = 1;
            for (const id of ids) { s.player.skills[id] = skills.includes(id) ? cfg.skillLevel : 0; s.player.skillEnabled[id] = skills.includes(id); }
            s.equipment = JSON.parse(gear);
            if (stat) s.equipment.waist.stats.push({ stat, value: roll[stat] * cfg.stacks });
            Math.random = seeded(seed);
            const w = W.create(); w.town = false; WYD.currentWorld = w; WYD.state = s;
            const stats = WYD.stats.compute(s); w.player.hp = stats.maxHp * cfg.hpCeil; w.spawnTimer = 1e9;
            for (let j = 0; j < 6; j++) {
              const kind = area.enemies[j % area.enemies.length].kind, ang = j / 6 * Math.PI * 2;
              const e = W.spawnEnemy(w, s, kind, { x: w.player.x + Math.cos(ang) * 110, y: w.player.y + Math.sin(ang) * 110 });
              e.hp = e.maxHp = 1e12; if (mode === 'dps') e.attack = 0;
            }
            WYD.results.reset(w);
            const ticks = Math.round(cfg.seconds / 0.05);
            for (let i = 0; i < ticks; i++) {
              W.update(w, s, 0.05);
              for (const e of w.enemies) if (e.hp < 1e11) e.hp = 1e12;   // 倒れない
              if (mode === 'surv') {
                const max = WYD.stats.compute(s).maxHp;
                if (w.player.hp > max * cfg.hpCeil) w.player.hp = max * cfg.hpCeil;
                if (w.player.hp < max * cfg.hpFloor && !w.player.dead) w.player.hp = max * cfg.hpCeil;
              }
            }
            Math.random = realRandom;
            const r = WYD.results.get(w).total;
            return mode === 'dps' ? r.damage / cfg.seconds : { taken: r.taken / cfg.seconds, heal: r.healing / cfg.seconds, maxHp: stats.maxHp, deaths: r.deaths };
          };
          // 耐えられる敵の強さ = dieTarget 秒もつ敵の攻撃の倍率 =（最大HP ÷ dieTarget ＋ 回復/秒）÷ 被ダメージ/秒
          const survive = (x) => x.taken > 0 ? (x.maxHp / cfg.dieTarget + x.heal) / x.taken : 1e6;
          const statKeys = Object.keys(roll);
          const acc = { dps: {}, surv: {} }, per = { dps: {}, surv: {} }; let baseDps = 0, baseTaken = 0, baseHeal = 0, baseHp = 0, deaths = 0;
          for (let k = 0; k < cfg.seeds; k++) {
            const gear = gearFor(k + 1), seed = 1000 + k;
            const d0 = run('dps', seed, gear), s0 = run('surv', seed, gear);
            const t0 = survive(s0);
            baseDps += d0 / cfg.seeds; baseTaken += s0.taken / cfg.seeds; baseHeal += s0.heal / cfg.seeds; baseHp += s0.maxHp / cfg.seeds; deaths += s0.deaths;
            for (const st of statKeys) {
              const d1 = run('dps', seed, gear, st), s1 = run('surv', seed, gear, st);
              const gd = d0 > 0 ? (d1 / d0 - 1) * 100 / cfg.stacks : 0, gs = (survive(s1) / t0 - 1) * 100 / cfg.stacks;
              acc.dps[st] = (acc.dps[st] || 0) + gd / cfg.seeds; acc.surv[st] = (acc.surv[st] || 0) + gs / cfg.seeds;
              (per.dps[st] = per.dps[st] || []).push(gd); (per.surv[st] = per.surv[st] || []).push(gs);
            }
          }
          // 乱数ごとのばらつき（平均の標準誤差）
          const se = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return [k, v.length > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1) / v.length) : 0]; }));
          const r1 = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v * 100) / 100]));
          return { skills, names: skills.map((id) => WYD.data.skills[id].name), kinds: skills.map((id) => WYD.classes.kindOf(id)),
            dps: Math.round(baseDps), taken: Math.round(baseTaken), heal: Math.round(baseHeal), maxHp: Math.round(baseHp), deaths, dpsGain: r1(acc.dps), survGain: r1(acc.surv), dpsSE: r1(se(per.dps)), survSE: r1(se(per.surv)) };
        }, [skills, out.config]));
      }
      out.classes.push({ classId, builds });
      if (file) fs.writeFileSync(file, JSON.stringify({ classId, builds }));
      console.error(`${classId}: ${list.length}ビルド ${((Date.now() - t0) / 1000).toFixed(0)}秒`);
    }
    out.errors = errors;
    console.log(JSON.stringify(out));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
