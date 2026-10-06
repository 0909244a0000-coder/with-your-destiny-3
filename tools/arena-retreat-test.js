// node tools/arena-retreat-test.js：対人の四隅/四辺/中央/重なり/方向保持/攻撃継続。
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    const result = await page.evaluate(async () => {
      WYD.resetting = true;
      for (const id of ['sorceress', 'necromancer', 'bombmancer']) {
        const s = WYD.save.newState(); s.classId = id; s.player.level = 40;
        localStorage.setItem(WYD.arena.key(id), JSON.stringify(s));
      }
      // 本編の同じ後退処理は変更しない。
      const original = { x: 20, y: 20 };
      WYD.world.moveAway(original, { x: 100, y: 100 }, 4);
      if (original.x !== 20 || original.y !== 20) throw Error('本編変更');
      WYD.arena.open(); const A = WYD.arena;
      let positions = 0, continuous = 0, firing = 0;
      for (const id of ['sorceress', 'necromancer', 'bombmancer']) {
        await A.start(['barbarian', id], 'duel', false);
        const f = A.fighters[1], E = f.engine, D = f.frame.contentWindow.WYD, p = E.world.player;
        const enemy = A.fighters[0].engine.world.player;
        E.setEnemies([enemy]); const M = D.data.map, edge = D.data.arena.movement.margin;
        const W = M.width, H = M.height, step = 4;
        const cases = [[edge,edge],[W-edge,edge],[edge,H-edge],[W-edge,H-edge],[W/2,edge],[W/2,H-edge],[edge,H/2],[W-edge,H/2]];
        for (const [x,y] of cases) {
          Object.assign(p,{x,y});Object.assign(enemy,{x:W/2,y:H/2});E.retreatDirection=null;
          for (let tick=0;tick<60;tick++) {
            const before={x:p.x,y:p.y};D.world.moveAway(p,enemy,step);
            if(Math.abs(Math.hypot(p.x-before.x,p.y-before.y)-step)>1e-7)throw Error(id+' 停止/速度異常');
            if(p.x<edge||p.x>W-edge||p.y<edge||p.y>H-edge)throw Error('壁外');
          }
          positions++;
        }
        // 角から出る途中に反転して戻らない。
        Object.assign(p,{x:edge,y:edge});Object.assign(enemy,{x:edge+80,y:edge+80});E.retreatDirection=null;
        let previous=p.x;
        for(let t=0;t<15;t++){D.world.moveAway(p,enemy,step);if(p.x<previous)throw Error('方向反転');previous=p.x;}
        continuous++;
        // 中央では従来どおり直線で後退、同じ位置でも動ける。
        Object.assign(p,{x:W/2,y:H/2});Object.assign(enemy,{x:W/2-100,y:H/2});E.retreatDirection=null;
        D.world.moveAway(p,enemy,step);if(p.x!==W/2+step||p.y!==H/2)throw Error('中央変更');
        Object.assign(p,{x:edge,y:edge});Object.assign(enemy,{x:edge,y:edge});E.retreatDirection=null;
        D.world.moveAway(p,enemy,step);if(p.x===edge&&p.y===edge)throw Error('重なり停止');
        // 実際のAIも角から移動し、後退しながら通常攻撃を継続する。
        Object.assign(p,{x:edge,y:edge});Object.assign(enemy,{x:edge+60,y:edge+60});E.retreatDirection=null;
        for(const key in E.state.player.skillEnabled)E.state.player.skillEnabled[key]=false;
        E.stats.powers={};E.stats.effects.thorns=0;
        for(let t=0;t<20;t++){A.time+=.05;E.tick(.05);}
        if(p.x===edge&&p.y===edge)throw Error('実AI停止');
        if(!E.summary().rows.some(r=>r.id==='attack'&&r.hits>0)&&!E.world.bolts.length)throw Error('攻撃停止');
        firing++;
      }
      A.close(); return { positions, continuous, firing, pveUnchanged:true };
    });
    assert.deepEqual(result,{positions:24,continuous:3,firing:3,pveUnchanged:true});
    assert.deepEqual(errors,[]);console.log(JSON.stringify(result),'errors 0');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
