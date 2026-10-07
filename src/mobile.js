// スマホ縦持ち用の画面（PCと横持ちは今までのまま）。
// 既存の部品（戦場・HUD・かばん・ステータス・スキル・強化・やり込みの窓）をそのまま使い、
// 並べ方と入口だけを変える：上に小さな操作バー、真ん中に大きな戦場（カメラが主人公を追う）、
// 下にHPとスキル、いちばん下にタブ。タブを押すと画面全体がそのメニューに切り替わる。
// 数値（ズームの段階・カメラの追い方）は data/mobile.js。
window.WYD = window.WYD || {};
WYD.mobile = {
  active: false,
  moved: [],     // スマホのときだけ「その他」へ移した部品（PCに戻るときに元の場所へ返す）
  camera: null,  // 表示中の中心（なめらかに追う）

  init() {
    const D = WYD.data.mobile;
    this.query = window.matchMedia(D.media);
    this.zoom = this.loadZoom();
    this.build();
    const apply = () => this.setActive(this.query.matches);
    if (this.query.addEventListener) this.query.addEventListener('change', apply); else this.query.addListener(apply);
    apply();
    const loop = () => { if (this.active) this.frame(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },

  $(id) { return document.getElementById(id); },

  loadZoom() {
    const D = WYD.data.mobile;
    try { const v = localStorage.getItem(D.zoomKey), z = Number(v); if (v !== null && D.zooms[z]) return z; } catch (e) { /* 読めなければ既定 */ }
    return D.defaultZoom;
  },

  // タブ・「その他」の画面・戦場の小さなボタンを作る（PCでは CSS で隠れている）
  build() {
    const D = WYD.data.mobile;
    const tabs = document.createElement('nav'); tabs.id = 'm-tabs'; tabs.setAttribute('aria-label', 'メニュー');
    tabs.innerHTML = D.tabs.map(t => `<button data-m-tab="${t.id}" aria-label="${t.label}">${t.icon ? `<img src="${t.icon}" alt="">` : `<i>${t.glyph}</i>`}<span>${t.label}</span>${t.id === 'bag' ? '<em id="m-bag-badge"></em>' : ''}</button>`).join('');
    document.body.append(tabs);
    tabs.onclick = e => { const b = e.target.closest('[data-m-tab]'); if (b) this.openTab(b.dataset.mTab); };

    const more = document.createElement('section'); more.id = 'm-more'; more.hidden = true; more.setAttribute('aria-label', 'その他');
    more.innerHTML = `<h2>その他</h2>
      <div class="m-section"><h3>移動</h3><div class="m-row" id="m-move"></div></div>
      <div class="m-section"><h3>やり込み</h3><div class="m-tiles" id="m-endgame"></div></div>
      <div class="m-section"><h3>キャラと季節</h3><div id="m-char"></div></div>
      <div class="m-section"><h3>拾う・装備</h3><div id="m-pickup"></div></div>
      <div class="m-section"><h3>設定</h3><div id="m-settings"></div></div>
      <div class="m-section"><h3>冒険ログ</h3><div id="m-log"></div></div>`;
    document.body.append(more);
    // やり込みの入口：元のボタンを押したことにする（窓の中身や解放条件は今までどおり）
    const endgame = this.$('m-endgame');
    for (const [id, file, label] of D.endgame) {
      const b = document.createElement('button'); b.dataset.mProxy = id;
      b.innerHTML = `<img src="assets/ui/nav-${file}.webp" alt=""><span>${label}</span>`;
      endgame.append(b);
    }
    const move = this.$('m-move');
    move.innerHTML = '<button id="m-town"></button><button data-m-proxy="dps-open">DPSテスト</button>';
    this.$('m-town').onclick = () => { this.closeAll(); WYD.town.toggle(WYD.ui.world, WYD.ui.state); };
    more.addEventListener('click', e => {
      const b = e.target.closest('[data-m-proxy]'); if (!b) return;
      const target = this.$(b.dataset.mProxy); if (!target || target.disabled) return;
      this.closeMore(); target.click();
    });

    // 大事な知らせ：戦場に描くと寄ったときに端が切れるので、文字として戦場の上に重ねる
    const notices = document.createElement('div'); notices.id = 'm-notices'; notices.setAttribute('aria-live', 'polite');
    document.querySelector('.game-screen .stage').append(notices);
    // 戦場の右上：ズーム・速度・一時停止
    const tools = document.createElement('div'); tools.id = 'm-stage-tools';
    tools.innerHTML = '<button id="m-zoom"></button><button id="m-speed"></button><button id="m-pause"></button>';
    document.querySelector('.game-screen .stage').append(tools);
    this.$('m-zoom').onclick = () => { this.zoom = (this.zoom + 1) % D.zooms.length; try { localStorage.setItem(D.zoomKey, String(this.zoom)); } catch (e) { /* 保存できなくても続ける */ } this.camera = null; };
    this.$('m-speed').onclick = () => {
      const speeds = [...document.querySelectorAll('.hud-top [data-speed]')].map(b => b);
      const now = speeds.findIndex(b => b.classList.contains('active'));
      speeds[(now + 1) % speeds.length].click();
    };
    this.$('m-pause').onclick = () => this.$('pause').click();
  },

  setActive(on) {
    if (on === this.active) return;
    this.active = on;
    document.documentElement.classList.toggle('m-ui', on);
    if (on) {
      // PCの上のバーにある部品を「その他」へ移す
      const menus = [...document.querySelectorAll('.hud-top .menus details.menu')];
      const body = name => menus.find(m => m.querySelector('summary').textContent === name)?.querySelector('.menu-body');
      this.relocate(document.querySelector('#class-select')?.closest('.grp'), 'm-char');
      this.relocate(document.querySelector('#season')?.closest('.grp'), 'm-char');
      this.relocate(body('拾う・装備'), 'm-pickup');
      this.relocate(body('設定'), 'm-settings');
      this.relocate(this.$('log'), 'm-log');
    } else {
      this.closeMore();
      while (this.moved.length) { const { el, mark } = this.moved.pop(); mark.replaceWith(el); }
      const c = this.$('game'); c.style.width = c.style.height = c.style.transform = '';
      WYD.render.viewCenterX = null;
    }
    WYD.ui.updateHudLayout && WYD.ui.updateHudLayout();
    WYD.ui.markDirty && WYD.ui.markDirty();
  },

  // 部品を移す。元の場所には目印を置き、PCに戻るときに同じ場所へ返す
  relocate(el, targetId) {
    if (!el) return;
    const mark = document.createComment('m-ui');
    el.replaceWith(mark); this.$(targetId).append(el);
    this.moved.push({ el, mark });
  },

  // 開いている窓を全部閉じる（各窓の「閉じる」を押したことにする）
  closeAll() {
    this.closeMore();
    for (const m of document.querySelectorAll('.modal:not([hidden])')) {
      if (m.id === 'modal') continue;   // 遊び方などのお知らせは、自分で閉じてもらう
      if (m.id === 'sheet') { WYD.ui.sheetAction('close'); continue; }
      const close = this.$(WYD.data.mobile.closeButtons[m.id] || m.id + '-close');
      if (close) close.click(); else m.hidden = true;
    }
  },
  openMore() { this.$('m-more').hidden = false; this.$('m-more').scrollTop = 0; },
  closeMore() { const m = this.$('m-more'); if (m) m.hidden = true; },

  openTab(id) {
    if (id === this.currentTab() && id !== 'battle') return;
    this.closeAll();
    if (id === 'more') this.openMore();
    else if (id !== 'battle') WYD.navigation.open(id);
  },

  // 今どのタブを見ているか（窓の開き具合から決める）
  currentTab() {
    const bag = this.$('bag');
    if (bag && !bag.hidden) return bag.dataset.view || 'bag';
    if (!this.$('m-more').hidden) return 'more';
    const other = [...document.querySelectorAll('.modal:not([hidden])')].some(m => m.id !== 'modal');
    return other ? 'more' : 'battle';
  },

  // 毎コマ：カメラ・タブの選択中表示・ボタンの文字
  frame() {
    const D = WYD.data.mobile, tab = this.currentTab();
    for (const b of document.querySelectorAll('[data-m-tab]')) b.classList.toggle('on', b.dataset.mTab === tab);
    const badge = this.$('bag-badge'); if (badge) this.$('m-bag-badge').textContent = badge.textContent;
    const ui = WYD.ui, w = ui.world;
    if (!w) return;
    this.$('m-town').textContent = w.town ? '戦場へ出発' : '野営地へ戻る';
    // やり込みの入口は、元のボタンの解放状態（使えない・隠れている）に合わせる
    for (const b of document.querySelectorAll('#m-more [data-m-proxy]')) { const t = this.$(b.dataset.mProxy); if (t) { b.disabled = t.disabled; b.hidden = t.hidden; b.title = t.title; } }
    this.$('m-zoom').textContent = D.zooms[this.zoom].label;
    const speed = document.querySelector('.hud-top [data-speed].active');
    this.$('m-speed').textContent = speed ? speed.textContent : '×1';
    this.$('m-pause').textContent = ui.paused ? '▶' : '❚❚';
    // 上のバーと下のHUDの高さに合わせて、戦場の場所を決める
    const root = document.documentElement.style, top = document.querySelector('.hud-top'), hud = document.querySelector('.combat-dock');
    root.setProperty('--m-top', `${Math.ceil(top.getBoundingClientRect().height)}px`);
    root.setProperty('--m-hud', `${Math.ceil(hud.getBoundingClientRect().height)}px`);
    this.updateCamera(w);
    this.updateNotices(w);
  },

  updateNotices(w) {
    const N = WYD.data.map.notice, box = this.$('m-notices'), list = w.notices || [];
    const key = list.map(n => n.text).join('\n');
    if (box.dataset.key !== key) {
      box.dataset.key = key;
      box.innerHTML = list.map(n => `<p style="color:${n.color}">${WYD.results.escape(n.text)}</p>`).join('');
    }
    [...box.children].forEach((el, i) => { const n = list[i]; if (n) el.style.opacity = Math.max(0, Math.min(1, (N.duration - n.time) / N.fade, n.time / 0.15)); });
  },

  // カメラ：戦場（960×600）を画面の横幅の何倍で描くかを段階で選び、主人公を中心に追う
  updateCamera(w) {
    const D = WYD.data.mobile, M = WYD.data.map, stage = document.querySelector('.game-screen .stage'), canvas = this.$('game');
    const sw = stage.clientWidth, sh = stage.clientHeight;
    if (!sw || !sh) return;
    const fit = Math.min(sw / M.width, sh / M.height);
    const scale = Math.min(fit * D.zooms[this.zoom].mult, sh / M.height * D.maxFillHeight);
    const cw = M.width * scale, ch = M.height * scale, p = w.player;
    const target = { x: p.x * scale, y: p.y * scale };
    if (!this.camera || this.camera.scale !== scale) this.camera = { ...target, scale };
    else { const k = D.follow; this.camera.x += (target.x - this.camera.x) * k; this.camera.y += (target.y - this.camera.y) * k; }
    const clamp = (v, lo, hi) => lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v));
    const x = cw <= sw ? (sw - cw) / 2 : clamp(sw / 2 - this.camera.x, sw - cw, 0);
    const y = ch <= sh ? (sh - ch) / 2 : clamp(sh / 2 - this.camera.y, sh - ch, 0);
    WYD.render.viewCenterX = cw > sw ? (sw / 2 - x) / scale : null;
    canvas.style.width = `${cw}px`; canvas.style.height = `${ch}px`;
    canvas.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
  },
};
