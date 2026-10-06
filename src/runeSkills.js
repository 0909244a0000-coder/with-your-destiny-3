// ランダムな完成スキル。抽選・保護・部分再抽選は保存、弾/陣/追撃は戦場だけ。
window.WYD = window.WYD || {};
WYD.runeSkills = {
  initial() { return { version: 1, essence: 0, stones: 0, free: WYD.data.runeSkills.starterDraws, nextId: 1, equipped: null, skills: [], pending: null }; },
  pool(key) { return WYD.data.runeSkills[{element:'elements',shape:'shapes',trait:'traits'}[key]] || []; },
  def(key, id) { return this.pool(key).find(x => x.id === id); },
  valid(skill) { return skill && Number.isSafeInteger(skill.id) && skill.id > 0 && ['element','shape','trait'].every(k => this.def(k, skill[k])); },
  ensure(state) {
    const previous = state.runeSkills || {}, r = Object.assign(this.initial(), previous);
    for (const key of ['essence','stones','free']) r[key] = Number.isSafeInteger(r[key]) && r[key] >= 0 ? r[key] : 0;
    const ids = new Set();
    r.skills = (Array.isArray(r.skills) ? r.skills : []).filter(s => this.valid(s) && !ids.has(s.id) && ids.add(s.id)).map(s => { s.locked=!!s.locked; return s; });
    r.nextId = Math.max(1, Number.isSafeInteger(r.nextId) ? r.nextId : 1, ...r.skills.map(s => s.id + 1));
    if (!r.skills.some(s => s.id === r.equipped)) r.equipped = null;
    const p = r.pending, skill = p && r.skills.find(s => s.id === p.id);
    if (!skill || !this.def(p.key,p.next) || skill[p.key] !== p.before || p.next === p.before) r.pending = null;
    state.runeSkills = r;
    return r;
  },
  migrate(state) {
    const r = this.ensure(state), D = WYD.data.runeSkills, G = WYD.data.gems;
    if (!r.migrated) {
      // 種類の違う旧ルーンも、上位ほど多くの欠片に還元する。
      const convert = key => {
        const i = G.runes.findIndex(x => key === 'rune:' + x.id);
        return i >= 0 ? D.legacyRuneValues[i] : 0;
      };
      for (const [key,count] of Object.entries(state.gems || {})) if (convert(key)) {
        if (Number.isFinite(count) && count > 0) r.essence += Math.floor(count) * convert(key);
        delete state.gems[key];
      }
      const items = [...(state.inventory||[]),...(state.stash||[]),...(state.pendingLoot||[]),...Object.values(state.equipment||{})].filter(Boolean);
      const seen = new Set();
      for (const item of items) {
        if (seen.has(item.id)) continue; seen.add(item.id);
        // 完成済みワードの性能は凍結して継承。以後ソケットの内容では発動しない。
        const sockets = item.sockets || [], group = G.slotGroup[item.slot];
        const seq = sockets.map(k => typeof k === 'string' && k.startsWith('rune:') ? k.slice(5) : '').join(',');
        const word = item.rarity === 'normal' && G.runewords.find(x => x.group === group && x.runes.join(',') === seq);
        if (word && !item.legacyRuneBonus) item.legacyRuneBonus = JSON.parse(JSON.stringify(word));
        for (const key of sockets) {
          const rune = G.runes.find(x => key === 'rune:' + x.id);
          if (!rune) continue;
          item.legacyRuneBonus ||= { name:'旧ルーン', bonus:{ stats:{} } };
          item.legacyRuneBonus.bonus.stats ||= {};
          for(const [stat,value] of Object.entries(rune[group] || {})) item.legacyRuneBonus.bonus.stats[stat] = (item.legacyRuneBonus.bonus.stats[stat] || 0) + value;
        }
        item.sockets = sockets.map(key => { const value = convert(key); if(value) {r.essence += value;return null;} return key; });
        if (D.retiredRarities.includes(item.rarity)) item.rarity = D.replacementRarity;
      }
      if (state.settings?.autoSalvage === 'normal') state.settings.autoSalvage = 'none';
      else if (state.settings?.autoSalvage === 'rare') state.settings.autoSalvage = 'magic';
      const filter = state.settings?.filter;
      if (filter) { delete filter.keepSocketed; for(const slot in filter.slots) if(filter.slots[slot] === 'rare') filter.slots[slot] = 'legend'; }
      r.migrated = true;
    }
    return r;
  },
  current(state) { const r = state.runeSkills; return r && r.skills.find(s => s.id === r.equipped) || null; },
  label(s) { return ['element','shape','trait'].map(k => this.def(k,s[k])?.name || '？').join('・'); },
  describe(s) { return ['element','shape','trait'].map(k => this.def(k,s[k])?.desc || '').join('。') + '。'; },
  source(s) { return 'runeskill:' + [s.element,s.shape,s.trait].join(':'); },
  sourceInfo(id) { const [_,element,shape,trait] = id.split(':'); const s = {element,shape,trait}; return {name:this.label(s),group:'ルーンスキル',color:this.def('element',element)?.color || '#c7a96b'}; },
  roll(state, currency='essence') {
    const r = this.ensure(state), D = WYD.data.runeSkills;
    if (r.skills.length >= D.capacity || r.pending) return null;
    if (r.free > 0) r.free--;
    else if (currency === 'stones' && r.stones >= D.drawStones) r.stones -= D.drawStones;
    else if (currency === 'essence' && r.essence >= D.drawEssence) r.essence -= D.drawEssence;
    else return null;
    const s = {id:r.nextId++,locked:false};
    for(const key of ['element','shape','trait']) s[key] = WYD.util.pick(this.pool(key)).id;
    r.skills.push(s); if(r.equipped == null) r.equipped = s.id;
    return s;
  },
  reroll(state,id,key) {
    const r = this.ensure(state), D = WYD.data.runeSkills, s = r.skills.find(x => x.id === id);
    if (!s || r.pending || !D.keys[key] || r.stones < D.rerollStones) return false;
    const choices = this.pool(key).filter(x => x.id !== s[key]);
    if (!choices.length) return false;
    r.stones -= D.rerollStones;
    r.pending = {id,key,before:s[key],next:WYD.util.pick(choices).id};
    return true;
  },
  resolve(state,accept) {
    const r = this.ensure(state), p = r.pending;
    if (!p) return false;
    const s = r.skills.find(x => x.id === p.id); if(accept) s[p.key] = p.next;
    r.pending = null; return true;
  },
  discard(state,id) {
    const r = this.ensure(state), s = r.skills.find(x => x.id === id);
    if (!s || s.locked || r.equipped === id || r.pending?.id === id || (state.builds || []).some(b => b?.runeSkill === id)) return false;
    r.skills = r.skills.filter(x => x.id !== id); r.essence += WYD.data.runeSkills.discardEssence; return true;
  },
  onUberWin(w,state) {
    const D = WYD.data.runeSkills;
    if (Math.random() >= D.uberStoneChance) return false;
    this.ensure(state).stones += D.uberStoneCount;
    WYD.ui.notice(`${D.stoneName} +${D.uberStoneCount}（ルーンスキルの1箇所を再抽選）`, '#c697ff'); WYD.ui.markDirty(); return true;
  },
  clear(w) { w.runeEffects = []; },
  cast(w,state,stats) {
    const s = this.current(state), p = w.player, D = WYD.data.runeSkills;
    if (!s || p.dead || (p.skillCooldowns.rune || 0) > 0) return false;
    const target = WYD.world.nearestEnemy(w,p);
    if (!target || target.hp <= 0 || WYD.util.dist(p,target) > D.range) return false;
    p.maxHp = stats.maxHp;
    const source = this.source(s), color = this.def('element',s.element).color;
    p.skillCooldowns.rune = D.cooldown * (1 - stats.effects.cooldown/100);
    p.skillCooldownMax ||= {};p.skillCooldownMax.rune = p.skillCooldowns.rune;
    p.skillCastAt ||= {};p.skillCastAt.rune = w.time;
    WYD.results.add(w,source,{casts:1});
    const fx = {skill:{...s},source,color,origin:{x:p.x,y:p.y},x:p.x,y:p.y,age:0,left:D.duration,tick:0,hits:0};
    if (s.shape === 'chain') {
      let at = p; const visited = new Set();
      for(let i=0;i<D.chainCount;i++) {
        const candidates = w.enemies.filter(e => e.hp > 0 && !visited.has(e.id) && WYD.util.dist(at,e) <= (i ? D.chainRange : D.range)).sort((a,b)=>WYD.util.dist(at,a)-WYD.util.dist(at,b));
        const e = candidates[0]; if(!e)break;
        WYD.vfx.segment(w,'lightning',at,e);visited.add(e.id);this.hit(w,state,stats,fx,e, i ? D.repeatedHitMult : 1);at=e;
      }
    } else {
      fx.targetId = target.id;
      const angle = Math.atan2(target.y-p.y,target.x-p.x);fx.dx=Math.cos(angle);fx.dy=Math.sin(angle);
      if(s.shape === 'field') {fx.x=target.x;fx.y=target.y;}
      this.add(w,fx);
    }
    WYD.vfx.spawn(w,this.def('element',s.element).texture,p.x,p.y,{size:D.radius});
    return true;
  },
  add(w,fx) { const D=WYD.data.runeSkills;w.runeEffects ||= [];if(w.runeEffects.length<D.maxObjects)w.runeEffects.push(fx); },
  hit(w,state,stats,fx,e,mult=1,secondary=false) {
    if (!e || !w.enemies.includes(e) || e.hp<=0 || w.player.dead || (w.player.arenaTeam && e.arenaTeam === w.player.arenaTeam))return;
    const D=WYD.data.runeSkills, before=e.hp;
    WYD.world.playerHit(w,state,stats,e,stats.attack*D.attackMult*(1+stats.skillDamage/100)*mult,fx.source);
    const actual=Math.max(0,Math.min(before,before-e.hp));if(!(actual>0))return;
    WYD.fx.burst(w,e.x,e.y,{...WYD.data.fx.hit,count:6},fx.color,{glow:true});
    if(secondary)return;
    const bind = () => { const E=WYD.arenaEngine,previous=E?.supportSource;if(E)E.supportSource=fx.source;try{if(e.hp>0)e.stunTimer=Math.max(e.stunTimer||0,D.bindTime*(e.boss?D.bossBindMult:1));}finally{if(E)E.supportSource=previous;} };
    if(fx.skill.element==='ice'||fx.skill.trait==='bind')bind();
    if(fx.skill.element==='shadow')WYD.world.healPlayer(w,stats.maxHp,actual*D.drainPercent/100,fx.source);
    if(fx.skill.element==='holy')WYD.world.healPlayer(w,stats.maxHp,stats.maxHp*D.healPercent/100,fx.source);
    if(fx.skill.element==='fire'||fx.skill.element==='poison')this.add(w,{...fx,kind:'dot',targetId:e.id,x:e.x,y:e.y,age:0,left:D.dotDuration,tick:D.tick,mult:D.dotMult});
    if(fx.skill.element==='lightning'||fx.skill.trait==='split') {
      const targets=w.enemies.filter(x=>x!==e&&x.hp>0&&WYD.util.dist(e,x)<=D.splitRange).sort((a,b)=>WYD.util.dist(e,a)-WYD.util.dist(e,b)).slice(0,fx.skill.trait==='split'?D.splitCount:1);
      for(const x of targets){WYD.vfx.segment(w,'lightning',e,x);this.hit(w,state,stats,fx,x,D.splitMult,true);}
    }
    if(fx.skill.trait==='pull'&&e.hp>0&&!e.boss) {
      const dist=WYD.util.dist(e,fx.origin),step=Math.min(D.pullDistance,dist),M=WYD.data.map;
      if(dist>0){e.x=WYD.util.clamp(e.x+(fx.origin.x-e.x)/dist*step,20,M.width-20);e.y=WYD.util.clamp(e.y+(fx.origin.y-e.y)/dist*step,20,M.height-20);}
    }
    if(fx.skill.trait==='delay')this.add(w,{...fx,kind:'delay',x:e.x,y:e.y,age:0,left:D.delayedTime,tick:D.delayedTime});
    if(fx.skill.trait==='heal')this.healFriend(w,state,stats,fx);
  },
  healFriend(w,state,stats,fx) {
    const D=WYD.data.runeSkills,E=WYD.arenaEngine,players=E?.bridge?.teamBattle?E.bridge.friends(E).map(f=>({p:f.world.player,engine:f})):[];
    const candidates=[{p:w.player},...w.allies.map(p=>({p})),...players.filter(x=>x.p!==w.player)].filter(x=>x.p.hp>0&&!x.p.dead&&x.p.hp<x.p.maxHp&&WYD.util.dist(w.player,x.p)<=D.radius).sort((a,b)=>a.p.hp/a.p.maxHp-b.p.hp/b.p.maxHp);
    const target=candidates[0];if(!target)return;
    const p=target.p,amount=p.maxHp*D.healPercent/100;
    if(p===w.player)WYD.world.healPlayer(w,stats.maxHp,amount,fx.source);
    else {const actual=Math.min(p.maxHp-p.hp,amount*(E?.bridge?E.healFactor():1));p.hp+=actual;if(E?.bridge?.teamBattle)E.recordSupport(fx.source,'allyHealing',actual);}
  },
  update(w,state,stats,dt) {
    const p=w.player,D=WYD.data.runeSkills;
    if(p.dead||p.hp<=0){this.clear(w);return;}
    p.maxHp = stats.maxHp;
    const old=(w.runeEffects||[]).slice();
    for(const fx of old) {
      fx.age+=dt;fx.left-=dt;fx.tick-=dt;
      const s=fx.skill;
      if(fx.kind==='dot') {
        const e=w.enemies.find(e=>e.id===fx.targetId&&e.hp>0);if(!e){fx.done=true;continue;}fx.x=e.x;fx.y=e.y;
        if(fx.tick<=0){this.hit(w,state,stats,fx,e,fx.mult,true);fx.tick+=D.tick;}
      } else if(fx.kind==='delay') {
        if(fx.left<=0){for(const e of w.enemies.slice())if(e.hp>0&&WYD.util.dist(fx,e)<=D.radius)this.hit(w,state,stats,fx,e,D.delayedMult,true);WYD.vfx.spawn(w,'fireBurst',fx.x,fx.y,{size:D.radius});}
      } else if(s.shape==='seeker') {
        const e=w.enemies.find(e=>e.id===fx.targetId&&e.hp>0);if(!e){fx.done=true;continue;}
        const d=WYD.util.dist(fx,e),step=D.speed*dt;
        if(d<=step+(e.radius || WYD.data.enemies[e.kind]?.radius || 0)){this.hit(w,state,stats,fx,e);fx.done=true;}else{fx.x+=(e.x-fx.x)/d*step;fx.y+=(e.y-fx.y)/d*step;}
      } else if(s.shape==='beam') {
        fx.x+=fx.dx*D.speed*dt;fx.y+=fx.dy*D.speed*dt;fx.visited ||= [];
        for(const e of w.enemies.slice())if(e.hp>0&&!fx.visited.includes(e.id)&&WYD.util.dist(fx,e)<=D.beamWidth+(e.radius||0)){fx.visited.push(e.id);this.hit(w,state,stats,fx,e);}
      } else {
        if(s.shape==='orbit'){fx.x=p.x;fx.y=p.y;}
        if(fx.tick<=0&&fx.hits<D.maxHits){for(const e of w.enemies.slice())if(e.hp>0&&WYD.util.dist(fx,e)<=(s.shape==='orbit'?D.orbitRadius:D.radius)){this.hit(w,state,stats,fx,e,D.repeatedHitMult);fx.hits++;if(fx.hits>=D.maxHits)break;}fx.tick+=D.tick;}
      }
    }
    w.runeEffects=(w.runeEffects||[]).filter(x=>!x.done&&x.left>0);
  },
  draw(ctx,w) {
    const D=WYD.data.runeSkills;
    for(const fx of w.runeEffects||[]) {
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=fx.color;ctx.fillStyle=fx.color;ctx.shadowColor=fx.color;ctx.shadowBlur=12;ctx.lineWidth=2;
      if(fx.kind==='dot'){ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(fx.x,fx.y,16,0,Math.PI*2);ctx.stroke();}
      else if(fx.kind==='delay'){ctx.globalAlpha=.6;ctx.beginPath();ctx.arc(fx.x,fx.y,D.radius*(fx.age/D.delayedTime),0,Math.PI*2);ctx.stroke();}
      else if(fx.skill.shape==='field'){ctx.globalAlpha=.22;ctx.beginPath();ctx.ellipse(fx.x,fx.y,D.radius,D.radius*.65,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.65;ctx.stroke();}
      else if(fx.skill.shape==='orbit'){for(let i=0;i<3;i++){const a=fx.age*4+i*Math.PI*2/3;const x=fx.x+Math.cos(a)*D.orbitRadius,y=fx.y+Math.sin(a)*D.orbitRadius*.65;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(8,-6);ctx.lineTo(18,0);ctx.lineTo(8,6);ctx.closePath();ctx.fill();ctx.restore();}}
      else if(fx.skill.shape==='beam'){ctx.lineWidth=D.beamWidth/3;ctx.beginPath();ctx.moveTo(fx.x-fx.dx*36,fx.y-fx.dy*36);ctx.lineTo(fx.x,fx.y);ctx.stroke();ctx.fillStyle='#fff3cf';ctx.beginPath();ctx.arc(fx.x,fx.y,4,0,Math.PI*2);ctx.fill();}
      else {const a=fx.dx?Math.atan2(fx.dy,fx.dx):fx.age*3;WYD.vfx.drawOn(ctx,this.def('element',fx.skill.element).texture,fx.x,fx.y,38,.8,a);ctx.beginPath();ctx.arc(fx.x,fx.y,7,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
  },
};
