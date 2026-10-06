// 拠点専用DPSテスト。育成のコピーを隔離フレームで動かし、結果はこのページ限り。
window.WYD=window.WYD||{};
WYD.dps={
 opened:false,running:false,loading:false,token:0,
 init(){
  this.$=id=>document.getElementById(id);const D=WYD.data.dps;
  for(const[key,values,label]of [['duration',D.durations,v=>v+'秒'],['count',D.counts,v=>v+'体'],['hp',D.hpRatios,v=>Math.round(v*100)+'%'],['player-hp',D.playerHpRatios,v=>Math.round(v*100)+'%'],['speed',D.speeds,v=>'×'+v]])this.$('dps-'+key).innerHTML=values.map(v=>`<option value="${v}">${label(v)}</option>`).join('');
  this.$('dps-defense').max=D.maxDefense;this.$('dps-open').onclick=()=>this.open();this.$('dps-close').onclick=()=>this.close();this.$('dps-start').onclick=()=>this.start().catch(e=>{this.loading=false;this.running=false;this.token++;this.dispose();this.$('dps-status').textContent='計測を開始できません：'+e.message;this.controls();});
  this.$('dps-stop').onclick=()=>this.stop();this.$('dps-pause').onclick=()=>{this.paused=!this.paused;this.controls();};
  document.addEventListener('keydown',e=>{if(!this.opened)return;if(e.key==='Escape'){e.preventDefault();this.close();}else if(e.key==='Tab'){const controls=[...this.$('dps-test').querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled)')],at=controls.indexOf(document.activeElement);if(at<0||(!e.shiftKey&&at===controls.length-1)||(e.shiftKey&&at===0)){e.preventDefault();controls[e.shiftKey?controls.length-1:0]?.focus();}}});
 },
 open(){
  if(this.opened||!WYD.currentWorld.town)return;this.opened=true;this.wasPaused=WYD.ui.paused;WYD.ui.paused=true;
  this.inertNodes=[...document.body.children].filter(x=>x.id!=='dps-test'&&!x.inert);for(const x of this.inertNodes)x.inert=true;
  this.$('dps-test').hidden=false;this.$('dps-close').focus();this.controls();
 },
 close(){this.stop();this.token++;this.dispose();this.loading=false;this.opened=false;this.$('dps-test').hidden=true;WYD.ui.paused=this.wasPaused;for(const x of this.inertNodes||[])x.inert=false;this.inertNodes=[];this.$('dps-open').focus();},
 options(){
  const D=WYD.data.dps,options={duration:Number(this.$('dps-duration').value),count:Number(this.$('dps-count').value),hpRatio:Number(this.$('dps-hp').value),playerHpRatio:Number(this.$('dps-player-hp').value),boss:this.$('dps-kind').value==='boss',defense:Number(this.$('dps-defense').value)};
  if(!D.durations.includes(options.duration)||!D.counts.includes(options.count)||!D.hpRatios.includes(options.hpRatio)||!D.playerHpRatios.includes(options.playerHpRatio)||!Number.isFinite(options.defense)||options.defense<0||options.defense>D.maxDefense||this.$('dps-defense').value.trim()==='')throw Error('標的の防御力を0以上で指定してください');return options;
 },
 async start(automatic=true){
  if(!this.opened||this.running||this.loading||!WYD.currentWorld.town)return;
  const options=this.options(),snapshot=JSON.parse(JSON.stringify(WYD.state)),previous=this.lastResult;this.dispose();this.loading=true;this.paused=false;this.controls();this.$('dps-status').textContent='現在の装備・スキルを読み込み中…';
  const token=++this.token,frame=document.createElement('iframe');frame.hidden=true;frame.src='dps-engine.html';this.frame=frame;this.$('dps-frames').append(frame);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('訓練データの読み込みが時間切れです')),WYD.data.dps.loadTimeoutMs);frame.cancelDps=()=>{clearTimeout(timer);resolve();};frame.onerror=()=>{clearTimeout(timer);reject(Error('訓練データを読み込めません'));};frame.onload=()=>{clearTimeout(timer);if(token!==this.token||!this.opened)return resolve();try{this.engine=frame.contentWindow.WYD.dpsEngine.init(WYD.classes.id,snapshot,options,{images:WYD.render.images,getImage:src=>WYD.render.getImage(src)});resolve();}catch(e){reject(e);}};});
  if(token!==this.token||!this.opened)return;
  this.optionsUsed=options;this.previous=previous;this.$('dps-settings').open=false;this.loading=false;this.running=true;this.accumulator=0;this.render(true);this.controls();this.draw();if(automatic)this.animate();
 },
 advance(){
  if(!this.running||this.paused)return;const remaining=this.optionsUsed.duration-this.engine.world.time;if(remaining<=0)return this.stop(true);const dt=Math.min(WYD.data.dps.step,remaining);this.engine.advance(dt);if(this.engine.world.time>=this.optionsUsed.duration-1e-8)this.stop(true);
 },
 animate(){let last=performance.now();const token=this.token;const frame=now=>{if(token!==this.token||!this.running)return;const delta=Math.min(WYD.data.dps.maxFrameDelta,(now-last)/1000);last=now;if(!this.paused){this.accumulator+=delta*Number(this.$('dps-speed').value);while(this.accumulator>=WYD.data.dps.step&&this.running){this.advance();this.accumulator-=WYD.data.dps.step;}}this.draw();this.render();if(this.running)this.raf=requestAnimationFrame(frame);};this.raf=requestAnimationFrame(frame);},
 stop(completed=false){
  cancelAnimationFrame(this.raf);if(this.running&&this.engine){this.draw();this.lastResult={stats:this.engine.snapshot(),options:{...this.optionsUsed},completed};this.running=false;this.render(true);}this.controls();
 },
 dispose(){cancelAnimationFrame(this.raf);this.frame?.cancelDps?.();this.frame?.remove();this.frame=null;this.engine=null;},
 controls(){for(const el of this.$('dps-controls').querySelectorAll('select,input'))el.disabled=this.running||this.loading;this.$('dps-start').disabled=this.running||this.loading;this.$('dps-stop').disabled=!this.running;this.$('dps-pause').disabled=!this.running;this.$('dps-pause').textContent=this.paused?'計測を再開':'一時停止';},
 draw(){if(!this.engine)return;const canvas=this.$('dps-canvas');if(canvas.width!==WYD.data.map.width)canvas.width=WYD.data.map.width;if(canvas.height!==WYD.data.map.height)canvas.height=WYD.data.map.height;this.engine.draw(canvas.getContext('2d'));},
 render(force=false){
  if(!this.engine&&!this.lastResult)return;const now=performance.now();if(!force&&this.lastRender&&now-this.lastRender<WYD.data.dps.refreshSeconds*1000)return;this.lastRender=now;
  const r=this.running?this.engine.snapshot():this.lastResult.stats,o=this.optionsUsed,n=WYD.results.number,esc=WYD.results.escape,dps=r.elapsed?r.damage/r.elapsed:0;
  this.$('dps-status').textContent=`${this.running?(this.paused?'一時停止中':'計測中'):this.lastResult.completed?'計測完了':'途中停止'} · ${r.elapsed.toFixed(2)} / ${o.duration}秒 · ${o.count}体・防御${o.defense}・${o.boss?'ボス':'通常'}・標的HP${Math.round(o.hpRatio*100)}%・本人HP${Math.round(o.playerHpRatio*100)}%`;
  this.$('dps-summary').innerHTML=`<b>${n(dps)} DPS</b><span>与ダメージ ${n(r.damage)} · 命中 ${n(r.hits)} · 会心 ${WYD.results.crit(r)}</span>`;
  const previous=this.previous,same=previous?.completed&&(!this.running&&this.lastResult?.completed)&&JSON.stringify(previous.options)===JSON.stringify(o),previousDps=previous?.stats.elapsed?previous.stats.damage/previous.stats.elapsed:0;
  this.$('dps-compare').textContent=same&&previousDps>0?`前回 ${n(previousDps)} DPS → 今回 ${n(dps)} DPS（${dps>=previousDps?'+':''}${((dps/previousDps-1)*100).toFixed(1)}%）`:previous?'前回との増減は、同じ条件で最後まで計測すると表示します。':'';
  this.$('dps-rows').innerHTML=Object.entries(r.rows).filter(([,row])=>row.damage>0).sort((a,b)=>b[1].damage-a[1].damage).map(([id,row])=>{const source=WYD.results.source(id);return `<article class="dps-row"><b>${esc(source.name)}</b><span>${n(row.damage)} ダメージ · ${n(r.elapsed?row.damage/r.elapsed:0)} DPS</span><small>割合 ${r.damage?(row.damage/r.damage*100).toFixed(1):0}% · 命中 ${n(row.hits)} · 会心 ${WYD.results.crit(row)} · 発動 ${n(row.casts)}</small></article>`}).join('')||'<p>まだ攻撃が当たっていません。</p>';
 }
};
