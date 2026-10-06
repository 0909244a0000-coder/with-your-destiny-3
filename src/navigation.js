// 画面上の入口と、同じ持ち物を使う3つの表示を整理する。
window.WYD = window.WYD || {};
WYD.navigation = {
  init() {
    const ui = WYD.ui, $ = id => document.getElementById(id);
    const icons = { 'bag-open':['bag','かばん'], 'town-btn':['home','ホーム'], 'character-open':['status','ステータス'], 'upgrade-open':['upgrade','強化'], 'bounty-open':['bounty','賞金首'], 'merc-open':['merc','傭兵'], 'lgem-open':['lgem','伝説の宝石'], 'devotion-open':['devotion','星座'], 'codex-open':['codex','図鑑・記録'], 'arena-open':['arena','アリーナ'] };
    const nav = document.querySelector('.stage-btns');
    const upgrade = document.createElement('button'); upgrade.id='upgrade-open'; nav.append(upgrade);
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
    const workshop = document.createElement('section'); workshop.id='workshop-tools'; workshop.className='panel';
    workshop.innerHTML='<h2>強化工房</h2><p class="muted">加工方法を選んでから、装備またはかばんのアイテムを選択。</p>';
    ['forge-mode','enhance-mode','craft-mode','rune-open'].forEach(id=>workshop.append($(id)));
    document.querySelector('.bag-cols').prepend(workshop);
    for(const [id,[file,label]] of Object.entries(icons)) {
      const button=$(id), badge=id==='bag-open'?$('bag-badge'):null;
      button.classList.add('nav-icon'); button.setAttribute('aria-label',label); button.title=label;
      button.innerHTML=`<img src="assets/ui/nav-${file}.webp" alt=""><span>${label}</span>`;
      if(badge)button.append(badge);
    }
    nav.append($('bag-open'),$('town-btn'),$('character-open'),$('upgrade-open'));
    const originalToggle=ui.toggleBag.bind(ui);
    this.view='bag';
    this.open = view => { this.view=view; $('bag').dataset.view=view; document.querySelector('.bag-head h2').textContent={bag:'かばん',status:'ステータス・装備',upgrade:'強化工房'}[view];
      ui.craftMode=ui.enhanceMode=ui.forgeMode=ui.cubeMode=false;ui.gemSelected=null;
      originalToggle(true);document.querySelector('.bag-box').scrollTop=0;
    };
    ui.toggleBag=show=>{ if(show===false || (show===undefined&&!$('bag').hidden)) originalToggle(false); else this.open('bag'); };
    $('bag-open').onclick=()=>this.open('bag');
    $('character-open').setAttribute('aria-controls','bag');
    $('character-open').removeAttribute('aria-expanded');
    $('character-open').onclick=()=>this.open('status');
    $('upgrade-open').onclick=()=>this.open('upgrade');
    ui.updateHudLayout();ui.markDirty();
  }
};
