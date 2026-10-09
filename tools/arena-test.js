// node tools/arena-test.js：保存キャラの再現・全対戦・全スキル/型・保存分離・390px。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const scripts = file => [...fs.readFileSync(path.resolve(__dirname,'../' + file),'utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(scripts('arena-engine.html'),scripts('index.html').filter(s=>!['src/main.js','src/ui.js','src/runeSkillsUI.js','src/arena.js','src/arena-sim.js','src/gemvault.js','src/grimoire.js','src/navigation.js','data/dps.js','src/dps.js','data/mobile.js','src/mobile.js'].includes(s)).concat('src/arena-engine.js'),'戦闘フレームの依存ファイル漏れ');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error(e.stack); });
    const url = 'file://' + path.resolve(__dirname, '../index.html');
    await page.goto(url);
    await page.evaluate(() => { localStorage.clear(); WYD.resetting = true; });
    const ids = await page.evaluate(() => Object.keys(WYD.data.classes));
    const fixtures = {};
    for (const id of ids) {
      await page.evaluate(id => { localStorage.setItem('wyd3-active-class', id); WYD.resetting = true; }, id);
      await page.reload();
      fixtures[id] = await page.evaluate(seed => {
        let random = seed;
        Math.random = () => { random = (1664525 * random + 1013904223) >>> 0; return random / 4294967296; };
        WYD.resetting = true;
        const s = WYD.save.newState(); s.seenHelp = true; s.player.level = 40;
        s.settings.autoSkill = false; s.settings.autoEquip = false; s.settings.speed = 0;
        Object.keys(WYD.data.skills).forEach((id, i) => { s.player.skills[id] = 6; s.player.skillEnabled[id] = i < 3; s.player.runes[id] = WYD.runes.list(id)[1].id; });
        const defs = WYD.loot.forClass(WYD.data.uniques.list);
        for (const d of defs) { const it = WYD.loot.createUnique(s, 15, d); if (!s.equipment[it.slot]) s.equipment[it.slot] = it; }
        s.equipment.weapon = WYD.loot.create(s, 15, 1, { slot: 'weapon', rarity: 'normal' });
        s.equipment.weapon.sockets = ['rune:eth', 'rune:tir', 'rune:ral'];
        s.mercenary = { type: 'mage', rank: 3 };
        for (const g of WYD.data.legendaryGems.list.slice(0, 3)) { s.lgems.owned[g.id] = 10; s.lgems.equipped.push(g.id); }
        const c = WYD.data.devotion.list[0]; s.devotion[c.id] = true;
        const layout = WYD.data.player.paragon.board.layout;
        outer: for (let r = 0; r < layout.length; r++) for (let col = 0; col < layout[r].length; col++) if (WYD.board.tile(r, col) && layout[r][col] !== 'S') { s.player.paragon.board[WYD.board.key(r, col)] = true; break outer; }
        const def = defs.find(d => !Object.values(s.equipment).some(it => it.unique === d.id));
        if (def) { s.cube.learned[def.id] = true; s.cube.slots[WYD.cube.slotOf(def)] = def.id; }
        WYD.runeSkills.migrate(s);
        return s;
      }, 20261005 + ids.indexOf(id));
    }
    await page.evaluate(fixtures => {
      WYD.resetting = true;
      for (const [id, s] of Object.entries(fixtures)) localStorage.setItem(WYD.arena.key(id), JSON.stringify(s));
      localStorage.setItem('wyd3-active-class', 'barbarian');
    }, fixtures);
    await page.reload();
    await page.evaluate(() => { WYD.resetting = true; WYD.arena.open(); });
    const before = await page.evaluate(() => ({ state: JSON.stringify(WYD.state), saves: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])), player: JSON.stringify(WYD.currentWorld.player) }));
    const pairs = await page.evaluate(async ids => {
      const A = WYD.arena, out = [];
      for (let repeat = 0; repeat < 2; repeat++) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        await A.start([ids[i], ids[j]], 'duel', false);
        for (const f of A.fighters) {
          const s = f.engine.state, original = A.rosterEntries.find(r => r.id === f.entry.id).snapshot;
          if (s.mercenary.type !== null || f.engine.world.allies.some(a => a.source === 'merc')) throw Error('アリーナに傭兵 ' + f.entry.id);
          for (const key of ['equipment', 'lgems', 'devotion', 'cube']) if (JSON.stringify(s[key]) !== JSON.stringify(original[key])) throw Error('コピー不一致 ' + f.entry.id + '/' + key);
          for (const key of ['skills', 'skillEnabled', 'runes', 'paragon']) if (JSON.stringify(s.player[key]) !== JSON.stringify(original.player[key])) throw Error('技能不一致 ' + key);
          if (f.engine.world.player.hp !== f.engine.stats.maxHp) throw Error('全快ではない');
        }
        let ticks = 0; while (A.running && ticks++ < 3601) A.advance();
        const sums = A.fighters.map(f => f.engine.summary());
        if (sums.some(r => r.rows.some(row => row.id.startsWith('merc:')))) throw Error('アリーナで傭兵が戦った');
        if (A.running || sums.some(r => !Number.isFinite(r.damage) || !Number.isFinite(r.taken)) || Math.abs(sums.reduce((a,r)=>a+r.damage-r.taken,0)) > .01) throw Error('対戦・集計異常');
        A.draw(); out.push({ pair: ids[i] + '/' + ids[j], repeat, time: +A.time.toFixed(2), reason: A.reason, winner: A.reason === 'winner' ? A.fighters.find(f=>f.eliminatedAt==null).entry.id : null, fighters: A.fighters.map(f=>{const r=f.engine.summary();return{id:f.entry.id,rank:f.rank,damage:r.damage,taken:r.taken,healing:r.healing,crit:r.crit};}) });
      }
      return out;
    }, ids);
    assert.equal(pairs.length, ids.length * (ids.length - 1)); console.log('ok 全組×2回', JSON.stringify(pairs));
    const skills = await page.evaluate(async ids => {
      const A = WYD.arena; const checked = new Set(); // 重なる陣営は1回だけ数える
      const max = WYD.data.arena.modes.royale.max, chunks = ids.length > max ? [ids.slice(0, max), ids.slice(-max)] : [ids];
      for (let rune = 0; rune < 3; rune++) for (let group = 0; group < 9; group++) for (const chunk of chunks) {
        for (const entry of A.rosterEntries) {
          const s = entry.snapshot;
          const classSkills = WYD.data.classes[entry.id].skills || WYD.data.skills;
          Object.keys(classSkills).forEach((id, i) => { s.player.skillEnabled[id] = i === group; s.player.runes[id] = (WYD.data.runes.skills[id] || [])[rune]?.id || s.player.runes[id]; });
          const armor = s.equipment.body || (s.equipment.body = WYD.loot.create(s, 15, 1, {slot:'body',rarity:'normal'})); armor.stats.push({stat:'maxHp',value:1000000});
        }
        await A.start(chunk, 'royale', false);
        // スキルの型の定義は各職業のフレームで取得する。
        for (const f of A.fighters) {
          const D = f.frame.contentWindow.WYD;
          for (const id of Object.keys(D.data.skills)) f.engine.state.player.runes[id] = D.runes.list(id)[rune].id;
          f.engine.world.player.x = 430 + ids.indexOf(f.entry.id) * 12; f.engine.world.player.y = 300; f.engine.world.player.hp = f.engine.stats.maxHp * .35;
        }
        for (const f of A.fighters) {
          f.engine.setEnemies(A.fighters.flatMap(x=>x.engine.units()));
          f.frame.contentWindow.WYD.world.tryUseSkills(f.engine.world,f.engine.state,f.engine.stats);
        }
        // 終幕は人形のHPが減ったときだけ使う技なので、終幕を確かめる回だけ人形を傷つけておく
        const wear = f => { const D = f.frame.contentWindow.WYD, a = D.puppeteer && Object.keys(D.data.skills)[group] === 'pup_finale' && D.puppeteer.active(f.engine.world); if (a) a.hp = Math.min(a.hp, a.maxHp * 0.3); };
        for (let i = 0; i < 600; i++) { A.advance(); A.fighters.forEach(wear); }
        for (const f of A.fighters) {
          const rows = f.engine.summary().rows;
          for (const id of Object.keys(f.frame.contentWindow.WYD.data.skills).slice(group, group + 1)) {
            const def = f.frame.contentWindow.WYD.runes.effectiveDef(f.engine.state,id);
            const passive = def.kind === 'aura' && def.auraType === 'might' && f.frame.contentWindow.WYD.stats.mightMult(f.engine.state) > 1;
            if (!passive && !rows.some(r => r.id === 'skill:' + id && r.casts > 0)) throw Error('未発動 ' + f.entry.id + '/' + id + '/' + rune);
            checked.add(f.entry.id + '/' + id + '/' + rune);
          }
          if (f.engine.world.allies.some(a => a.arenaTeam !== f.team || !Number.isFinite(a.id))) throw Error('陣営不一致');
          const D = f.frame.contentWindow.WYD;
          for(const u of f.engine.units()) if(Object.values(D.render.pose(u,f.engine.world.enemies[0],f.engine.world.time)).some(v=>!Number.isFinite(v))) throw Error('ポーズNaN');
        }
        A.draw();
      }
      return checked.size;
    }, ids);
    assert.equal(skills, ids.length * 9 * 3); console.log('ok 全' + ids.length * 9 + 'スキル×3型＝' + skills + '条件（常時オーラを含む）');
    // コピーを破棄して、実際の保存から取り直す。
    await page.evaluate(() => WYD.arena.refresh());
    const mechanics = await page.evaluate(async () => {
      const A = WYD.arena; await A.start(['barbarian', 'sorceress'], 'duel', false);
      const [a,b] = A.fighters, EA = a.engine, EB = b.engine, D = a.frame.contentWindow.WYD, w = EA.world, s = EA.state, p = w.player, target = EB.world.player;
      EA.setEnemies(EB.units()); EB.setEnemies(EA.units());
      EA.stats.effects.thorns = 0; EB.stats.effects.thorns = 0; EA.stats.powers = {}; EB.stats.powers = {};
      const friend = p.hp; D.world.damageEnemy(w,s,p,10,false); const friendlyFire = p.hp === friend;
      const C = D.data.arena.combat, near=(a,b)=>Math.abs(a-b)<1e-7;
      const h = target.hp; D.world.damageEnemy(w,s,target,10,false); const hit = near(target.hp,h-10*C.damageScale);
      EB.stats.effects.thorns = 100; const ah = p.hp; D.world.damageEnemy(w,s,target,10,false); const reflect = near(p.hp,ah-10*C.damageScale*C.reflectScale);
      // 両者に反射があっても再帰しない。
      EA.stats.effects.thorns = 100; const both = target.hp; D.world.damageEnemy(w,s,target,10,false); const noRecursion = near(target.hp,both-10*C.damageScale);
      EB.stats.effects.thorns = 0; EB.stats.powers.projectileWard = { chance: 100, color: '#fff' }; EA.projectile = true;
      p.hp = EA.stats.maxHp / 2; EA.stats.effects.lifesteal = 100; D.world.castExtra = { bind: 2, lifesteal: 100 };
      const ph = p.hp, th = target.hp; D.world.playerHit(w,s,EA.stats,target,100,'attack');
      const ward = p.hp === ph && target.hp === th && !target.stunTimer;
      EA.projectile = false; D.world.playerHit(w,s,EA.stats,target,20,'attack'); const bind = target.stunTimer === Math.min(2*C.bindScale,C.bindMax);
      D.world.castExtra = null; EB.stats.powers = {}; EB.world.player.stunTimer = 2;
      const xy = [target.x,target.y], cooldown = target.attackTimer; EB.tick(.05);
      const stun = target.x === xy[0] && target.y === xy[1] && target.attackTimer === cooldown;
      a.frame.contentWindow.localStorage.setItem(WYD.save.KEY, 'isolated');
      const memory = localStorage.getItem(WYD.save.KEY) !== 'isolated';
      const paused = A.time; A.paused = true; A.advance(); const pause = A.time === paused; A.paused = false;
      // 生存者の順位は時間切れで同じ。攻撃しない強制拘束で時間切れを検証。
      for(const f of A.fighters) { f.engine.world.player.stunTimer=1000; f.engine.world.allies=[]; f.engine.state.mercenary.type=null; }
      A.time = WYD.data.arena.timeLimit; A.advance(); const timeout = A.reason === 'timeout' && A.fighters.every(f=>f.rank===1);
      D.world.enemyDied=(w,s,e)=>{w.enemies=w.enemies.filter(x=>x!==e);}; // 撃破時の事前回復を除き、死後の吸血だけを確認。
      p.hp=.01; target.hp=1; p.dead=false; target.dead=false; EA.incoming=new WeakMap();EB.incoming=new WeakMap(); EB.stats.effects.thorns=100; D.world.playerHit(w,s,EA.stats,target,100,'attack'); D.world.healPlayer(w,EA.stats.maxHp,100,'regen'); const fatalReflection=p.dead && target.dead && p.hp===0 && target.hp===0;
      return { friendlyFire, hit, reflect, noRecursion, ward, bind, stun, memory, pause, timeout, fatalReflection };
    });
    for (const [k,v] of Object.entries(mechanics)) { assert.equal(v,true,k); console.log('ok', k); }
    const cancel = await page.evaluate(async () => {
      const A=WYD.arena, pending=A.start(['barbarian','sorceress'],'duel',false); A.stop(); const canceled=await pending;
      const fresh=await A.start(['necromancer','bombmancer'],'duel',false);
      return canceled===false && fresh===true && A.frames.length===2 && document.querySelectorAll('#arena-frames iframe').length===2;
    }); assert(cancel); console.log('ok 読込中止→再開・フレーム除去');
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => ({ state: JSON.stringify(WYD.state), saves: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])), player: JSON.stringify(WYD.currentWorld.player) }));
    assert.deepEqual(after,before); console.log('ok 原キャラ・全職業の保存・冒険HP不変');
    await page.evaluate(async()=>{const A=WYD.arena; A.refresh(); document.querySelector('#arena-mode').value='royale'; A.chooseDefaults(); for(const r of A.rosterEntries) r.snapshot.equipment.body.stats.push({stat:'maxHp',value:100000}); await A.start(Object.keys(WYD.data.classes).slice(0,WYD.data.arena.modes.royale.max),'royale',false);for(let i=0;i<100;i++)A.advance();A.draw();A.renderStatus(true);});
    await page.screenshot({path:path.resolve(__dirname,'../results/arena-desktop.png')});
    await page.setViewportSize({width:390,height:844});
    const mobile=await page.evaluate(()=>{const box=document.querySelector('.arena-box'), canvas=document.querySelector('#arena-canvas');box.scrollTop=0;WYD.arena.draw();return{overflow:box.scrollWidth>box.clientWidth,body:document.documentElement.scrollWidth>390,width:canvas.getBoundingClientRect().width,buttons:[...box.querySelectorAll('button')].filter(b=>b.getClientRects().length).every(b=>b.getBoundingClientRect().height>=48)}});
    assert(!mobile.overflow && !mobile.body && mobile.buttons && mobile.width>=300,JSON.stringify(mobile)); console.log('ok 390px・横はみ出し0・操作48px以上');
    await page.screenshot({path:path.resolve(__dirname,'../results/arena-mobile.png')});
    await page.evaluate(()=>{const A=WYD.arena;while(A.running)A.advance();document.querySelector('.arena-box').scrollTop=document.querySelector('#arena-results').offsetTop;});
    await page.screenshot({path:path.resolve(__dirname,'../results/arena-results.png')});
    await page.click('#arena-close'); assert.equal(await page.evaluate(()=>WYD.arena.frames.length),0); console.log('ok 終了で全フレーム除去');
    assert.deepEqual(errors,[]); console.log('errors 0');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
