// 画面上の入口と、同じ持ち物を使う3つの表示を整理する。
window.WYD = window.WYD || {};
WYD.navigation = {
  init() {
    const ui = WYD.ui, $ = id => document.getElementById(id);
    const icons = { 'bag-open':['bag','Bag'], 'town-btn':['home','Home'], 'character-open':['status','Status'], 'skills-open':['skills','Skills'], 'bounty-open':['bounty','Bounties'], 'merc-open':['merc','Mercenary'], 'gems-open':['gems','Gems'], 'lgem-open':['lgem','Legendary'], 'devotion-open':['devotion','Devotion'], 'codex-open':['codex','Codex'], 'arena-open':['arena','Arena'] };
    const nav = document.querySelector('.stage-btns');
    const skillsButton = document.createElement('button'); skillsButton.id='skills-open'; nav.append(skillsButton);
    // 宝石の画面（src/gemvault.js）の入口。2026-10-09 から装備画面（Status）の宝石のタブから開くので、アイコンは出さない
    const gemsButton = document.createElement('button'); gemsButton.id='gems-open'; gemsButton.hidden=true; nav.append(gemsButton);
    const home = document.createElement('section'); home.id='home-panel'; home.hidden=true;
    home.innerHTML='<strong>野営地</strong><p>装備と構成を整えてから冒険へ。</p><button id="home-depart">戦場へ出発</button>';
    document.querySelector('.stage').append(home); home.append($('dps-open'));
    $('home-depart').onclick=()=>WYD.town.toggle(ui.world,ui.state);
    $('town-btn').onclick=()=>{ if(!ui.world.town) WYD.town.toggle(ui.world,ui.state); home.hidden=false; };
    const endgame = document.createElement('nav'); endgame.className='endgame-icons'; endgame.setAttribute('aria-label','やり込み');
    document.querySelector('.stage').append(endgame);
    ['bounty-open','merc-open','lgem-open','devotion-open','codex-open','arena-open'].forEach(id=>endgame.append($(id)));
    [...document.querySelectorAll('.hud-top details.menu')].find(el=>el.querySelector('summary').textContent==='やり込み').remove();
    $('gamble-open').hidden=true;
    $('sound-toggle').parentElement.append($('mute-btn')); 
    $('stash-panel').hidden=true;
    document.querySelector('[data-bag-target="stash-panel"]').remove();
    document.querySelector('.bag-nav').hidden=true;
    document.querySelector('.left').append($('game-log-panel'));
    const status = document.createElement('section'); status.id='status-content';
    [...$('character-drawer').children].filter(el=>el.classList.contains('panel')).forEach(el=>status.append(el));
    document.querySelector('.bag-cols').prepend(status);
    const skillsPanel = $('skills').closest('section'); skillsPanel.id='skills-content';
    document.querySelector('.bag-cols').prepend(skillsPanel);
    // 強化・つけ直し・鍛造・箱は、装備を選ぶと出る窓（src/ui.js の touchSheet）にまとめた（2026-10-09。強化の画面とモードはなくした）
    for(const [id,[file,label]] of Object.entries(icons)) {
      const button=$(id), badge=id==='bag-open'?$('bag-badge'):null;
      button.classList.add('nav-icon'); button.setAttribute('aria-label',label); button.title=label;
      button.innerHTML=`<img src="assets/ui/nav-${file}.webp" alt=""><span>${label}</span>`;
      if(badge)button.append(badge);
    }
    nav.append($('bag-open'),$('town-btn'),$('character-open'),$('skills-open'),$('gems-open'));
    const originalToggle=ui.toggleBag.bind(ui);
    this.view='bag';
    const setActive = view => {
      for (const [id,target] of [['bag-open','bag'],['character-open','status'],['skills-open','skills']]) {
        $(id).classList.toggle('active',view===target);
        $(id).setAttribute('aria-pressed',String(view===target));
      }
    };
    // 持ち物・装備・能力は装備画面（src/equipscreen.js）にまとめた（2026-10-09）。古いかばんの窓はスキルの表示だけに使う
    this.open = view => {
      if (view==='bag' || view==='status') { originalToggle(false); setActive('status'); WYD.equipScreen.open(); return; }
      WYD.equipScreen.close(); this.view=view; setActive(view); $('bag').dataset.view=view; document.querySelector('.bag-head h2').textContent={skills:'Skills'}[view]||view;
      originalToggle(true);document.querySelector('.bag-box').scrollTop=0;
    };
    ui.toggleBag=show=>{
      if(show===false) { originalToggle(false); WYD.equipScreen.close(); setActive(null); return; }
      if(show===undefined && (WYD.equipScreen.opened || !$('bag').hidden)) { originalToggle(false); WYD.equipScreen.close(); setActive(null); return; }
      this.open('status');
    };
    $('bag-open').onclick=()=>this.open('status');
    $('bag-open').hidden=true;   // かばんのアイコンは出さない（Status の装備画面に持ち物もある）
    $('character-open').setAttribute('aria-controls','equipscreen');
    $('character-open').removeAttribute('aria-expanded');
    $('character-open').onclick=()=>this.open('status');
    $('skills-open').onclick=()=>this.open('skills');
    ui.updateHudLayout();ui.markDirty();
  }
};
