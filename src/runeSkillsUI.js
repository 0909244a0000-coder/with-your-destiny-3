// ルーン工房。実際の戦闘を動かさず、形のプレビューだけを再生する。
window.WYD = window.WYD || {};
WYD.runeSkillsUI = {
  selected: null,
  init() {
    this.$ = id => document.getElementById(id);
    this.$('rune-open').onclick = () => this.open();
    this.$('rune-close').onclick = () => this.close();
    this.$('rune-body').onclick = event => {
      const button = event.target.closest('[data-rune-action]');if(!button)return;
      const R=WYD.runeSkills,s=WYD.state,r=R.ensure(s),id=Number(button.dataset.id),skill=r.skills.find(x=>x.id===id),action=button.dataset.runeAction;
      if(action==='select')this.selected=id;
      else if(action==='draw'){const created=R.roll(s,button.dataset.currency);if(created)this.selected=created.id;}
      else if(action==='equip'&&skill){r.equipped=id;R.clear(WYD.currentWorld);}
      else if(action==='unequip'){r.equipped=null;R.clear(WYD.currentWorld);}
      else if(action==='lock'&&skill)skill.locked=!skill.locked;
      else if(action==='discard'&&skill&&!skill.locked&&r.equipped!==id&&r.pending?.id!==id){if(confirm(`「${R.label(skill)}」を分解しますか？ ${WYD.data.runeSkills.essenceName} +${WYD.data.runeSkills.discardEssence}。元に戻せません。`))R.discard(s,id);}
      else if(action==='reroll')R.reroll(s,id,button.dataset.key);
      else if(action==='accept'||action==='keep'){R.resolve(s,action==='accept');R.clear(WYD.currentWorld);}
      else return;
      WYD.ui.changed();this.render();
    };
    document.addEventListener('keydown',e=>{
      if(this.$('rune-lab').hidden)return;
      if(e.key==='Escape'){e.preventDefault();this.close();}
      else if(e.key==='Tab'){
        const controls=[...this.$('rune-lab').querySelectorAll('button:not(:disabled)')],at=controls.indexOf(document.activeElement);
        if(at<0||(!e.shiftKey&&at===controls.length-1)||(e.shiftKey&&at===0)){e.preventDefault();controls[e.shiftKey?controls.length-1:0]?.focus();}
      }
    });
  },
  open() {
    const lab=this.$('rune-lab');if(!lab.hidden)return;
    this.wasPaused=WYD.ui.paused;WYD.ui.paused=true;
    this.inertNodes=[...document.body.children].filter(x=>x!==lab&&!x.inert);for(const node of this.inertNodes)node.inert=true;
    lab.hidden=false;this.render();this.$('rune-close').focus();
    const frame=now=>{if(lab.hidden)return;if(!this.lastPreview||now-this.lastPreview>1000/WYD.data.runeSkills.previewFps){this.preview(now/1000);this.lastPreview=now;}this.raf=requestAnimationFrame(frame);};
    this.raf=requestAnimationFrame(frame);
  },
  close() {this.$('rune-lab').hidden=true;cancelAnimationFrame(this.raf);WYD.ui.paused=this.wasPaused;for(const node of this.inertNodes||[])node.inert=false;this.inertNodes=[];this.$('rune-open').focus();},
  renderActive() {
    const R=WYD.runeSkills,s=WYD.state,current=R.current(s),r=R.ensure(s),esc=WYD.results.escape;
    WYD.ui.putHtml('rune-active',current?`<b style="color:${R.def('element',current.element).color}">専用4枠目：${esc(R.label(current))}</b><small>${WYD.data.runeSkills.cooldown}秒ごと（短縮効果対応）</small>`:`<b>専用4枠目：未装着</b><small>${r.free?'初回無料でランダムな技を1つ抽選できます。':'ルーン工房でスキルを抽選・装着できます。'}</small>`);
  },
  render() {
    const R=WYD.runeSkills,r=R.ensure(WYD.state),D=WYD.data.runeSkills,esc=WYD.results.escape;
    if(!r.skills.some(s=>s.id===this.selected))this.selected=r.pending?.id||r.equipped||r.skills[0]?.id;
    const selected=r.skills.find(s=>s.id===this.selected),pending=r.pending,full=r.skills.length>=D.capacity;
    let html=`<p class="rune-wallet">${D.essenceName} <b>${r.essence}</b> · ${D.stoneName} <b>${r.stones}</b> · 保存 ${r.skills.length}/${D.capacity}</p><p class="muted">属性・動き・追加効果をまとめてランダム抽選。全150通り・各候補は等確率。クラス技3枠とは別の4枠目で自動発動。装備ソケットは宝石専用です。</p><div class="rune-actions"><button data-rune-action="draw" data-currency="essence" ${full||pending||(!r.free&&r.essence<D.drawEssence)?'disabled':''}>${r.free?'初回無料で抽選':`ルーン合成（欠片${D.drawEssence}）`}</button><button data-rune-action="draw" data-currency="stones" ${full||pending||r.stones<D.drawStones?'disabled':''}>奈落抽選（変質石${D.drawStones}）</button></div><p class="muted">欠片：通常の敵・精鋭・ボスから。変質石：奈落の双王の討伐成功時に${Math.round(D.uberStoneChance*100)}%で${D.uberStoneCount}個。分解で欠片${D.discardEssence}個。満杯では抽選できません。</p>`;
    if(pending){const skill=r.skills.find(s=>s.id===pending.id);html+=`<section class="rune-pending" role="status"><b>再抽選結果：#${pending.id} ${esc(R.label(skill))}</b><p>${D.keys[pending.key]}：${R.def(pending.key,pending.before).name} → <strong>${R.def(pending.key,pending.next).name}</strong></p><p>残り2箇所は維持。変質石は消費済みです。結果は再読み込み後も残ります。</p><div class="rune-actions"><button data-rune-action="accept">新しい効果を採用</button><button data-rune-action="keep">元の効果を維持</button></div></section>`;}
    if(selected){html+=`<section class="rune-inspect"><h3>#${selected.id} ${esc(R.label(selected))}</h3><canvas id="rune-preview" width="360" height="170" aria-label="選択スキルの動作イメージ"></canvas><p>${esc(R.describe(selected))}</p><small class="muted">動きのイメージ。実際の威力は本人の攻撃力・スキル威力・装備効果で変わります。</small><div class="rune-actions"><button data-rune-action="${r.equipped===selected.id?'unequip':'equip'}" data-id="${selected.id}">${r.equipped===selected.id?'4枠目から外す':'4枠目に装着'}</button><button data-rune-action="lock" data-id="${selected.id}">${selected.locked?'保護を解除':'保護する'}</button><button data-rune-action="discard" data-id="${selected.id}" ${selected.locked||r.equipped===selected.id||pending?.id===selected.id||(WYD.state.builds||[]).some(b=>b?.runeSkill===selected.id)?'disabled':''}>分解</button></div><p>変える箇所を選ぶと、その箇所だけランダム再抽選。同じ内容は出ません。</p><div class="rune-actions">${Object.entries(D.keys).map(([key,name])=>`<button data-rune-action="reroll" data-id="${selected.id}" data-key="${key}" ${pending||r.stones<D.rerollStones?'disabled':''}>${name}を再抽選（石${D.rerollStones}）</button>`).join('')}</div></section>`;}
    html+=`<div class="rune-collection">${r.skills.map(s=>`<button data-rune-action="select" data-id="${s.id}" class="rune-card${s.id===this.selected?' selected':''}" aria-pressed="${s.id===this.selected}" style="--rune-color:${R.def('element',s.element).color}"><b>#${s.id} ${esc(R.label(s))}</b><small>${r.equipped===s.id?'装着中 · ':''}${s.locked?'保護中':'未保護'}</small></button>`).join('')||'<p>まだスキルがありません。上の初回無料抽選から始めよう。</p>'}</div>`;
    this.$('rune-body').innerHTML=html;this.renderActive();
  },
  preview(time) {
    const canvas=this.$('rune-preview');if(!canvas)return;
    const R=WYD.runeSkills,s=WYD.state.runeSkills.skills.find(s=>s.id===this.selected);if(!s)return;
    const ctx=canvas.getContext('2d'),D=WYD.data.runeSkills,t=(time%D.previewSeconds)/D.previewSeconds,color=R.def('element',s.element).color;
    ctx.fillStyle='#100f16';ctx.fillRect(0,0,360,170);
    const enemies=[{x:230,y:85},{x:285,y:45},{x:285,y:125}];
    ctx.strokeStyle='#8f8175';for(const e of enemies){ctx.beginPath();ctx.arc(e.x,e.y,10,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='#c9a96b';ctx.beginPath();ctx.arc(65,85,9,0,Math.PI*2);ctx.fill();
    let x=65+t*165,y=85;
    if(s.shape==='field'){x=230;y=85;}if(s.shape==='orbit'){x=130;y=85;}
    if(s.shape==='chain'){ctx.strokeStyle=color;ctx.lineWidth=3;ctx.globalAlpha=1-t;ctx.beginPath();ctx.moveTo(65,85);for(const e of enemies){ctx.lineTo(e.x-8,e.y+6);ctx.lineTo(e.x,e.y);}ctx.stroke();ctx.globalAlpha=1;}
    else R.draw(ctx,{runeEffects:[{skill:s,color,x,y,age:t*D.duration,left:D.duration,dx:1,dy:0}]});
    if(t>.65){ctx.strokeStyle=color;ctx.globalAlpha=(1-t)/.35;ctx.beginPath();ctx.arc(230,85,8+(t-.65)*60,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  },
};
