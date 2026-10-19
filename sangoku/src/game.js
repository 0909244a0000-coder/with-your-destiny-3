// 天下三分：ゲームのしくみ（画面に依存しない。node でも動く）
var SG = typeof SG !== 'undefined' ? SG : {};
(function () {
  const R = () => SG.data.rules;

  // ---------- 乱数（セーブに状態を持つので、同じ種なら同じ展開になる） ----------
  function rand(s) {
    s.rng = (s.rng + 0x6D2B79F5) | 0;
    let t = s.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const range = (s, a, b) => a + (b - a) * rand(s);
  const pick = (s, arr) => arr[Math.floor(rand(s) * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function shuffle(s, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand(s) * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  // ---------- 参照 ----------
  let adjCache = null;
  function adj(id) {
    if (!adjCache) {
      adjCache = {};
      for (const c of SG.data.cities) adjCache[c.id] = [];
      for (const [a, b] of SG.data.roads) { adjCache[a].push(b); adjCache[b].push(a); }
    }
    return adjCache[id];
  }
  const officersIn = (s, cityId, force) => Object.values(s.officers).filter(o => o.status === 'serve' && o.city === cityId && (force === undefined || o.force === force));
  const freeIn = (s, cityId) => Object.values(s.officers).filter(o => o.status === 'free' && o.city === cityId);
  const citiesOf = (s, fid) => Object.values(s.cities).filter(c => c.owner === fid);
  const membersOf = (s, fid) => Object.values(s.officers).filter(o => o.status === 'serve' && o.force === fid);
  const ruler = (s, fid) => s.officers[s.forces[fid].ruler];
  const forceName = (s, fid) => fid ? s.forces[fid].ruler + '軍' : '空白地';
  const dateText = s => `${s.year}年${s.month}月`;
  function log(s, text, kind) { s.log.push({ date: dateText(s), text, kind: kind || '' }); if (s.log.length > 300) s.log.splice(0, s.log.length - 300); }

  // ---------- 新しいゲーム ----------
  function newGame(scenarioId, playerForce, seed) {
    const sc = SG.data.scenarios.find(x => x.id === scenarioId) || SG.data.scenarios[0];
    const s = { version: 1, scenario: sc.id, year: sc.year, month: sc.month, rng: (seed === undefined ? Date.now() : seed) | 0, player: playerForce || null, forces: {}, cities: {}, officers: {}, log: [], reports: [], captives: [], over: null, relations: {}, offers: [] };
    for (const c of SG.data.cities) {
      s.cities[c.id] = { id: c.id, owner: null, pop: c.pop, agri: c.agri, agriMax: c.agriMax, comm: c.comm, commMax: c.commMax, def: c.def, defMax: c.defMax, ...sc.defaults.empty, delegate: false };
    }
    for (const o of SG.data.officers) {
      s.officers[o.id] = { id: o.id, lead: o.lead, war: o.war, int: o.int, pol: o.pol, cha: o.cha, born: o.born, die: o.die, status: 'none', force: null, city: null, loyalty: 0, acted: false, found: false };
    }
    for (const f of sc.forces) {
      const fid = f.ruler;
      s.forces[fid] = { id: fid, ruler: fid, color: f.color, alive: true };
      const loyal = new Set(f.loyal.split(/\s+/).filter(Boolean));
      for (const [cid, names] of Object.entries(f.cities)) {
        Object.assign(s.cities[cid], sc.defaults.owned, f.start[cid] || {}, { owner: fid });
        for (const n of names.split(/\s+/).filter(Boolean)) {
          const o = s.officers[n];
          if (!o) throw new Error('武将がいない: ' + n);
          Object.assign(o, { force: fid, city: cid, status: 'serve', loyalty: n === fid ? 100 : loyal.has(n) ? 100 : Math.round(clamp(sc.loyalty.base + range(s, -sc.loyalty.spread, sc.loyalty.spread), 30, 99)) });
        }
      }
    }
    for (const [cid, names] of Object.entries(sc.free)) for (const n of names.split(/\s+/).filter(Boolean)) Object.assign(s.officers[n], { status: 'free', city: cid });
    // 最初の功績は能力から
    for (const o of Object.values(s.officers)) o.merit = Math.max(0, Math.round((Math.max(o.lead, o.war, o.int, o.pol) - R().merit.startFrom) * R().merit.startPer));
    // まだ若い武将は登場を待つ
    for (const o of Object.values(s.officers)) {
      if (o.status === 'none') { o.status = 'dead'; continue; }
      if (s.year - o.born < R().comeOfAge) { o.pending = o.status; o.status = 'unborn'; }
    }
    if (playerForce && !s.forces[playerForce]) throw new Error('勢力がない: ' + playerForce);
    log(s, `${sc.title}。${playerForce ? forceName(s, playerForce) + 'として天下を目指す。' : ''}`);
    return s;
  }

  // ---------- 内政など（プレイヤー・AI 共通の命令） ----------
  function usable(s, cityId, oid) {
    const c = s.cities[cityId], o = s.officers[oid];
    if (!c || !o) return '対象がいない';
    if (o.status !== 'serve' || o.city !== cityId || o.force !== c.owner) return 'この都市の武将ではない';
    if (o.acted) return `${o.id}は今月すでに行動した`;
    return null;
  }
  const ok = (msg, extra) => Object.assign({ ok: true, msg }, extra || {});
  const ng = msg => ({ ok: false, msg });

  const commands = {
    // kind: agri 開墾 / comm 商業 / def 城壁 / order 治安
    develop(s, { city, officer, kind }) {
      const err = usable(s, city, officer); if (err) return ng(err);
      const c = s.cities[city], o = s.officers[officer], r = R();
      const conf = { agri: ['開墾', 'pol', 'agriMax', r.devCost, r.devBase, r.devPerStat], comm: ['商業', 'pol', 'commMax', r.devCost, r.devBase, r.devPerStat], def: ['城壁修復', 'lead', 'defMax', r.devCost, r.devBase, r.devPerStat], order: ['治安', 'war', null, r.orderCost, r.orderBase, r.orderPerStat] }[kind];
      if (!conf) return ng('命令がちがう');
      const [label, stat, maxKey, cost, base, per] = conf;
      const max = maxKey ? c[maxKey] : 100;
      if (c[kind] >= max) return ng(`${label}はもう上限`);
      if (c.gold < cost) return ng(`金が足りない（${cost}必要）`);
      c.gold -= cost;
      const gain = Math.max(1, Math.round((base + o[stat] * per) * range(s, 0.8, 1.2)));
      const before = c[kind];
      c[kind] = Math.min(max, c[kind] + gain);
      o.acted = true;
      return ok(`${o.id}が${label}：${before}→${c[kind]}`);
    },
    recruit(s, { city, officer, amount }) {
      const err = usable(s, city, officer); if (err) return ng(err);
      const c = s.cities[city], o = s.officers[officer], r = R();
      const cap = Math.floor(Math.min(r.recruitBase + o.cha * r.recruitPerCha, c.gold / r.goldPer100Troops * 100, c.pop * r.recruitPopRate));
      const n = Math.floor(Math.min(amount || cap, cap) / 100) * 100;
      if (n < 100) return ng('兵を集められない（金か人口が足りない）');
      c.gold -= Math.ceil(n / 100 * r.goldPer100Troops);
      c.training = Math.round((c.troops * c.training) / (c.troops + n));
      c.troops += n; c.pop -= n;
      c.order = Math.max(0, Math.round(c.order - n / 1000 * r.recruitOrderLoss));
      o.acted = true;
      return ok(`${o.id}が徴兵：兵 +${n}（${c.troops}）`);
    },
    train(s, { city, officer }) {
      const err = usable(s, city, officer); if (err) return ng(err);
      const c = s.cities[city], o = s.officers[officer], r = R();
      if (c.troops <= 0) return ng('兵がいない');
      if (c.training >= 100) return ng('訓練はもう上限');
      const before = c.training;
      c.training = Math.min(100, c.training + Math.round(r.trainBase + o.lead * r.trainPerStat));
      o.acted = true;
      return ok(`${o.id}が訓練：${before}→${c.training}`);
    },
    search(s, { city, officer }) {
      const err = usable(s, city, officer); if (err) return ng(err);
      const c = s.cities[city], o = s.officers[officer], r = R();
      o.acted = true;
      const hidden = freeIn(s, city).filter(x => !x.found);
      if (hidden.length && rand(s) < 0.3 + o.int / 200) {
        const f = pick(s, hidden); f.found = true;
        return ok(`${o.id}が探索：在野の人物「${f.id}」を見つけた`, { found: f.id });
      }
      if (rand(s) < r.searchGoldChance) { const g = Math.round(range(s, r.searchGold[0], r.searchGold[1])); c.gold += g; return ok(`${o.id}が探索：金${g}を見つけた`); }
      return ok(`${o.id}が探索：何も見つからなかった`);
    },
    // 在野（同じ都市・発見済み）か、隣の他勢力の武将（引き抜き）
    employ(s, { city, officer, target }) {
      const err = usable(s, city, officer); if (err) return ng(err);
      const c = s.cities[city], o = s.officers[officer], t = s.officers[target];
      if (!t) return ng('対象がいない');
      const lord = ruler(s, c.owner);
      if (t.status === 'free') {
        if (t.city !== city || !t.found) return ng('この都市で見つかっていない');
        o.acted = true;
        const p = clamp(0.3 + (o.cha - 50) / 100 + (lord.cha - 50) / 200, 0.1, 0.95);
        if (rand(s) < p) { Object.assign(t, { status: 'serve', force: c.owner, city, loyalty: Math.round(range(s, 65, 90)), acted: true }); return ok(`${o.id}の説得で${t.id}が仕官した`, { joined: t.id }); }
        return ok(`${t.id}は仕官を断った`);
      }
      if (t.status === 'serve' && t.force !== c.owner && adj(city).includes(t.city)) {
        if (t.id === s.forces[t.force].ruler) return ng('君主は引き抜けない');
        if (bonded(s, t)) return ng(`${t.id}は君主と固い絆で結ばれている`);
        o.acted = true;
        const p = t.loyalty >= 95 ? 0 : clamp((o.cha + 30 - t.loyalty) / 150, 0, 0.6);
        if (rand(s) < p) { Object.assign(t, { force: c.owner, city, loyalty: Math.round(range(s, 55, 75)), acted: true }); return ok(`${t.id}が寝返った！`, { joined: t.id }); }
        return ok(`${t.id}の引き抜きに失敗した`);
      }
      return ng('登用できない相手');
    },
    reward(s, { city, target, gold }) {
      const c = s.cities[city], t = s.officers[target];
      if (!c || !t || t.status !== 'serve' || t.force !== c.owner || t.city !== city) return ng('この都市の武将ではない');
      if (t.id === s.forces[c.owner].ruler) return ng('君主に褒美はいらない');
      gold = Math.floor(gold || 100);
      if (c.gold < gold) return ng('金が足りない');
      c.gold -= gold;
      const before = t.loyalty;
      t.loyalty = Math.min(100, Math.round(t.loyalty + gold * R().rewardLoyaltyPerGold * range(s, 0.8, 1.2)));
      return ok(`${t.id}に褒美（金${gold}）：忠誠 ${before}→${t.loyalty}`);
    },
    // buy: 金で兵糧を買う / sell: 兵糧を売る（amount は金の額）
    trade(s, { city, mode, amount }) {
      const c = s.cities[city], r = R();
      amount = Math.floor(amount || 0);
      if (!c || amount <= 0) return ng('量がちがう');
      if (mode === 'buy') { if (c.gold < amount) return ng('金が足りない'); c.gold -= amount; c.food += amount * r.buyFoodPerGold; return ok(`金${amount}で兵糧${amount * r.buyFoodPerGold}を買った`); }
      const need = amount * r.sellFoodPerGold;
      if (c.food < need) return ng('兵糧が足りない');
      c.food -= need; c.gold += amount; return ok(`兵糧${need}を売って金${amount}を得た`);
    },
    // 自分の隣の都市へ武将・兵・金・兵糧を送る（空白地にも行ける＝占領）
    move(s, { city, to, officers, troops, gold, food }) {
      const c = s.cities[city], d = s.cities[to];
      if (!c || !d || !adj(city).includes(to)) return ng('隣の都市ではない');
      if (d.owner && d.owner !== c.owner) return ng('他勢力の都市へは出陣で');
      officers = officers || [];
      for (const id of officers) { const e = usable(s, city, id); if (e) return ng(e); }
      if (!d.owner && !officers.length) return ng('空白地へは武将が必要');
      troops = Math.floor(troops || 0); gold = Math.floor(gold || 0); food = Math.floor(food || 0);
      if (troops > c.troops || gold > c.gold || food > c.food || troops < 0 || gold < 0 || food < 0) return ng('送る量が多すぎる');
      if (!officers.length && !troops && !gold && !food) return ng('何も送らない');
      if (troops) { d.training = Math.round((d.troops * d.training + troops * c.training) / (d.troops + troops)); d.troops += troops; c.troops -= troops; }
      c.gold -= gold; d.gold += gold; c.food -= food; d.food += food;
      for (const id of officers) Object.assign(s.officers[id], { city: to, acted: true });
      let msg = `${city}→${to}へ移動`;
      if (!d.owner) { d.owner = c.owner; msg += `（${to}を占領）`; log(s, `${forceName(s, c.owner)}が${to}を占領した`, 'war'); }
      return ok(msg);
    },
    // 外交。kind：gift 贈答（gold）／ally 同盟／truce 停戦／surrender 降伏勧告。target＝相手の勢力
    diplo(s, { city, officer, kind, target, gold }) {
      const err = usable(s, city, officer); if (err) return ng(err);
      const c = s.cities[city], o = s.officers[officer], D = R().diplo, me = c.owner;
      if (!s.forces[target] || !s.forces[target].alive || target === me) return ng('相手がいない');
      const r = rel(s, me, target), name = forceName(s, target);
      if (kind === 'gift') {
        gold = Math.floor(gold || 0);
        if (gold < 10 || c.gold < gold) return ng('金が足りない');
        c.gold -= gold; o.acted = true;
        const up = Math.max(1, Math.round(gold / D.giftPerTrust * o.cha / 70 * range(s, 0.8, 1.2)));
        r.trust = Math.min(100, r.trust + up);
        return ok(`${name}に金${gold}を贈った：友好度 +${up}（${r.trust}）`, { success: true });
      }
      if (!D[kind]) return ng('外交がちがう');
      if (kind !== 'surrender' && pactOf(s, me, target)) return ng(`すでに${D[pactOf(s, me, target)].name}中`);
      const p = diploChance(s, me, officer, kind, target);
      if (kind === 'surrender' && p === 0) return ng(`降伏勧告は、兵がこちらの1/${D.surrender.ratio}以下で都市${D.surrender.maxCities}つ以下の相手だけ`);
      o.acted = true;
      if (rand(s) >= p) { r.trust = clamp(r.trust + D[kind].failTrust, 0, 100); return ok(`${name}は${D[kind].name}を断った`); }
      if (kind === 'surrender') { const lord = s.forces[target].ruler; absorb(s, me, target); log(s, `${lord}が降伏し、${forceName(s, me)}に加わった`, 'war'); checkEnd(s); return ok(`${lord}が降伏した！ 都市と武将が加わった`, { success: true }); }
      makePact(s, me, target, kind);
      return ok(`${name}と${D[kind].name}を結んだ（${D[kind].months}か月）`, { success: true });
    },
    // 計略。kind：rumor 流言・incite 扇動（target＝都市）／discord 離間（target＝武将）／mole 埋伏の毒（target＝都市。その勢力に偽って寝返る）
    plot(s, { city, officer, kind, target }) {
      const err = usable(s, city, officer); if (err) return ng(err);
      const c = s.cities[city], o = s.officers[officer], conf = R().plot[kind];
      if (!conf) return ng('計略がちがう');
      const info = plotTarget(s, city, kind, target);
      if (info.err) return ng(info.err);
      if (c.gold < conf.cost) return ng(`金が足りない（${conf.cost}必要）`);
      if (kind === 'mole' && o.id === s.forces[c.owner].ruler) return ng('君主は送れない');
      c.gold -= conf.cost;
      o.acted = true;
      const p = plotChance(s, city, officer, kind, target);
      const tc = info.city, foe = forceName(s, tc.owner);
      const pubLog = msg => { if (tc.owner === s.player) log(s, msg, 'bad'); };
      if (rand(s) >= p) { pubLog(`${forceName(s, c.owner)}の${conf.name}を見破った（${tc.id}）`); return ok(`${o.id}の${conf.name}は見破られた（${tc.id}）`); }
      let msg;
      if (kind === 'rumor') { const d = Math.round(range(s, ...conf.order)); tc.order = Math.max(0, tc.order - d); msg = `${tc.id}に流言！ 治安 -${d}`; }
      else if (kind === 'incite') {
        const lost = Math.floor(tc.troops * range(s, ...conf.troops)), d = Math.round(range(s, ...conf.order));
        tc.troops -= lost; tc.order = Math.max(0, tc.order - d); msg = `${tc.id}で扇動！ 兵 -${lost}、治安 -${d}`;
      } else if (kind === 'discord') {
        const t = s.officers[target], d = Math.round(range(s, ...conf.loyalty));
        t.loyalty = Math.max(0, t.loyalty - d); msg = `${t.id}に離間！ 忠誠 -${d}（${t.loyalty}）`;
      } else {
        // 埋伏：武将は相手の勢力に仕える。その都市を攻めると内応する
        Object.assign(o, { force: tc.owner, city: tc.id, loyalty: Math.round(range(s, 60, 80)), mole: c.owner });
        msg = `${o.id}が${foe}に偽って降った（埋伏の毒・${tc.id}）`;
      }
      pubLog(`${forceName(s, c.owner)}の${conf.name}：${msg}`);
      return ok(msg, { success: true });
    },
    // units: [{officer, troops}]。mode 'tactics' ならマス戦闘を始める（s.battle。決着は src/tactics.js）
    attack(s, { city, to, units, mode }) {
      const c = s.cities[city], d = s.cities[to];
      if (!c || !d || !adj(city).includes(to)) return ng('隣の都市ではない');
      if (!d.owner) return commands.move(s, { city, to, officers: units.map(u => u.officer), troops: units.reduce((a, u) => a + (u.troops || 0), 0) });
      if (d.owner === c.owner) return ng('自分の都市');
      if (pactOf(s, c.owner, d.owner)) return ng(`${forceName(s, d.owner)}とは${R().diplo[pactOf(s, c.owner, d.owner)].name}中`);
      if (!units || !units.length) return ng('武将がいない');
      if (units.length > R().maxUnits) return ng(`出陣は${R().maxUnits}人まで`);
      for (const u of units) { const e = usable(s, city, u.officer); if (e) return ng(e); u.troops = Math.floor(u.troops || 0); if (u.troops < 100) return ng(`${u.officer}の兵が少なすぎる`); if (u.troops > troopCap(s, s.officers[u.officer])) return ng(`${u.officer}（${rankOf(s, s.officers[u.officer]).name}）が率いられるのは${troopCap(s, s.officers[u.officer])}人まで`); }
      const total = units.reduce((a, u) => a + u.troops, 0);
      if (total > c.troops) return ng('兵が足りない');
      const foodNeed = Math.ceil(total * R().foodPerTroop * R().march.foodMonths);
      if (c.food < foodNeed) return ng(`兵糧が足りない（${foodNeed}必要）`);
      c.food -= foodNeed;
      if (mode === 'tactics' && SG.tactics) {
        s.battle = SG.tactics.create(s, prepareBattle(s, city, to, units), c.owner === s.player ? 'atk' : 'def');
        return ok(`${to}へ出陣！`, { tactics: true });
      }
      const report = battle(s, city, to, units);
      return ok(report.win ? `${to}を攻め落とした！` : `${to}を落とせなかった`, { report });
    },
  };

  // 計略の相手を確かめる：{ city }（相手の都市）か { err }
  function plotTarget(s, cityId, kind, target) {
    const c = s.cities[cityId];
    const tc = kind === 'discord' ? s.officers[target] && s.officers[target].status === 'serve' && s.cities[s.officers[target].city] : s.cities[target];
    if (!tc || !adj(cityId).includes(tc.id)) return { err: '隣の都市ではない' };
    if (!tc.owner || tc.owner === c.owner) return { err: '敵の都市ではない' };
    if (pactOf(s, c.owner, tc.owner)) return { err: `${forceName(s, tc.owner)}とは${R().diplo[pactOf(s, c.owner, tc.owner)].name}中` };
    if (kind === 'discord') {
      const t = s.officers[target];
      if (t.force !== tc.owner) return { err: '相手がちがう' };
      if (t.id === s.forces[t.force].ruler) return { err: '君主には効かない' };
      if (bonded(s, t)) return { err: `${t.id}は君主と固い絆で結ばれている` };
    }
    return { city: tc };
  }
  function plotChance(s, cityId, officerId, kind, target) {
    const conf = R().plot[kind], o = s.officers[officerId];
    const info = plotTarget(s, cityId, kind, target); if (info.err) return 0;
    const tc = info.city;
    const wise = officersIn(s, tc.id, tc.owner).reduce((m, x) => Math.max(m, x.int), 30);
    let p = conf.base + (o.int - wise) / 100;
    if (kind === 'discord') p -= (ruler(s, tc.owner).cha - 50) / 200 + (s.officers[target].loyalty - 70) / 200;
    if (kind === 'mole') p = conf.base + (o.int - ruler(s, tc.owner).int) / 100;
    return clamp(p, conf.min, conf.max);
  }

  function exec(s, name, args) {
    if (s.over) return ng('ゲームは終わっている');
    const f = commands[name];
    if (!f) return ng('命令がない: ' + name);
    const r = f(s, args || {});
    if (r.ok) { const c = args && s.cities[args.city]; if (c && c.owner === s.player) log(s, `【${args.city}】${r.msg}`); }
    // 功績（内政などは成功で、登用・計略・外交は相手に通ったときだけ）
    const m = R().merit[name], who = args && s.officers[args.officer];
    if (r.ok && m && who && (['develop', 'recruit', 'train', 'search'].includes(name) || r.success || r.joined)) gainMerit(s, who, m);
    if (r.ok) checkEnd(s);
    return r;
  }

  // ---------- 戦争 ----------
  function unitPower(s, u, training) {
    const o = u.officer && s.officers[u.officer];
    const lead = o ? o.lead : 40, war = o ? o.war : 40;
    return u.troops * (lead * 0.6 + war * 0.4) / 100 * (0.6 + training / 250);
  }

  // 戦争は 3段階：prepareBattle（両軍をそろえる）→ autoBattle か マス戦闘（src/tactics.js）→ finishBattle（結果を反映）
  // B（戦の記録）はセーブできる素のデータ。部隊 { officer: 武将のid か null, troops, start, side, captured }
  function prepareBattle(s, fromId, toId, orders) {
    const r = R(), from = s.cities[fromId], to = s.cities[toId];
    const atkForce = from.owner, defForce = to.owner;
    const atk = orders.map(u => ({ officer: u.officer, troops: u.troops, start: u.troops, side: 'atk', type: u.type }));
    from.troops -= atk.reduce((a, u) => a + u.troops, 0);
    for (const u of atk) s.officers[u.officer].acted = true;
    // 守備側：統率の高い順に最大5人で兵を分ける（君主がいれば総大将として先頭）
    const lord = defForce && s.forces[defForce].ruler;
    const defOff = officersIn(s, toId, defForce).filter(o => o.mole !== atkForce).sort((a, b) => (b.id === lord) - (a.id === lord) || b.lead - a.lead).slice(0, r.maxUnits);
    let def = [];
    if (to.troops > 0) {
      if (defOff.length) {
        const sum = defOff.reduce((a, o) => a + o.lead, 0);
        def = defOff.map(o => ({ officer: o.id, troops: Math.floor(to.troops * o.lead / sum), side: 'def' }));
        def[0].troops += to.troops - def.reduce((a, u) => a + u.troops, 0);
      } else def = [{ officer: null, troops: to.troops, side: 'def' }];
      for (const u of def) u.start = u.troops;
    }
    to.troops = 0;
    const B = { from: fromId, to: toId, atkForce, defForce, atk, def, atkTrain: from.training, defTrain: to.training, lines: [], day: 0, win: null };
    // 埋伏の毒：攻め手の勢力の手の者が城内にいれば、内応して城門を開き、攻め手に戻る
    const moles = officersIn(s, toId, defForce).filter(o => o.mole === atkForce);
    for (const m of moles) {
      Object.assign(m, { force: atkForce, city: fromId, loyalty: 100, acted: true }); delete m.mole;
      B.gatesOpen = true;
    }
    B.lines.push(`${forceName(s, atkForce)}（${atk.map(u => unitName(s, u)).join('・')} 兵${atk.reduce((a, u) => a + u.troops, 0)}）が${toId}へ攻め込んだ。`);
    if (B.gatesOpen) B.lines.push(`${moles.map(m => m.id).join('・')}が内応！ 城門が開かれた！`);
    B.lines.push(`迎え撃つ${forceName(s, defForce)}：${def.length ? def.map(u => unitName(s, u)).join('・') + ' 兵' + def.reduce((a, u) => a + u.troops, 0) : 'なし'}`);
    return B;
  }
  const unitName = (s, u) => u.officer ? u.officer : '守備兵';
  const aliveUnits = list => list.filter(u => u.troops > 0);

  // 部隊が崩れる。武将は逃げるか捕まる（君主は必ず逃げる）
  function routUnit(s, B, u, why, lines) {
    const r = R();
    lines = lines || B.lines;
    u.troops = 0;
    if (!u.officer) { lines.push(`守備兵は${why || '壊滅'}した。`); return; }
    const fid = u.side === 'atk' ? B.atkForce : B.defForce;
    const isRuler = s.forces[fid].ruler === u.officer;
    if (isRuler || rand(s) >= r.captureRate) { lines.push(`${u.officer}隊は${why || '壊滅'}し、${u.side === 'atk' ? B.from + 'へ' : '城内へ'}退いた。`); return; }
    lines.push(`${u.officer}隊は${why || '壊滅'}。${u.officer}は捕らえられた！`);
    u.captured = true;
  }

  // 計算だけで決着をつける（AIどうし・自動）
  function autoBattle(s, B) {
    const r = R(), to = s.cities[B.to], lines = B.lines;
    const { atk, def } = B;
    const O = u => s.officers[u.officer];
    // 一騎打ち
    if (def.length && def[0].officer && rand(s) < r.duelChance) {
      const a = atk.slice().sort((x, y) => O(y).war - O(x).war)[0];
      const d = def.filter(u => u.officer).sort((x, y) => O(y).war - O(x).war)[0];
      const weaker = O(d).war < O(a).war ? d : a;
      if (weaker === d && rand(s) < 0.5) lines.push(`${a.officer}が一騎打ちを挑んだが、${d.officer}は応じなかった。`);
      else {
        const res = duel(s, O(a), O(d));
        lines.push(`一騎打ち！ ${a.officer}（武力${O(a).war}） 対 ${d.officer}（武力${O(d).war}）`);
        lines.push(...res.lines);
        if (res.winner) routUnit(s, B, res.winner === O(a) ? d : a, '一騎打ちに敗れて総崩れ');
      }
    }
    const defBonus = 1 + to.def / r.defDiv * (B.gatesOpen ? r.moleGateDef : 1);
    let day = 0;
    while (day < r.battleDays && aliveUnits(atk).length && aliveUnits(def).length) {
      day++;
      // 計略（知力の高い武将が火計を仕掛ける）
      for (const [side, other] of [[atk, def], [def, atk]]) {
        const sage = aliveUnits(side).filter(u => u.officer).sort((x, y) => O(y).int - O(x).int)[0];
        if (!sage || rand(s) >= O(sage).int / r.stratDiv) continue;
        const targets = aliveUnits(other); if (!targets.length) continue;
        const t = pick(s, targets);
        const wit = t.officer ? O(t).int : 30;
        if (rand(s) < O(sage).int / (O(sage).int + wit)) {
          const loss = Math.max(1, Math.floor(t.troops * range(s, 0.08, 0.15)));
          t.troops -= loss;
          lines.push(`${day}日目：${sage.officer}の火計！ ${unitName(s, t)}隊 -${loss}`);
          if (t.troops <= 0) routUnit(s, B, t);
        } else lines.push(`${day}日目：${sage.officer}の火計は${unitName(s, t)}に見破られた。`);
      }
      // ぶつかり合い（同時に計算してから減らす）
      const dmg = new Map();
      const hit = (u, others, train, scale) => {
        const ts = aliveUnits(others); if (!ts.length) return;
        const t = pick(s, ts);
        dmg.set(t, (dmg.get(t) || 0) + unitPower(s, u, train) * r.battleK * range(s, 0.8, 1.2) * scale);
      };
      for (const u of aliveUnits(atk)) hit(u, def, B.atkTrain, 1 / defBonus);
      for (const u of aliveUnits(def)) hit(u, atk, B.defTrain, 1);
      for (const [t, v] of dmg) { if (t.troops <= 0) continue; t.troops -= Math.max(1, Math.round(v)); if (t.troops <= 0) routUnit(s, B, t); }
    }
    B.day = day;
    B.win = aliveUnits(def).length === 0 && aliveUnits(atk).length > 0;
    return B;
  }

  // 結果を反映する（城の持ち主・兵・逃げる武将・捕虜・報告）
  function finishBattle(s, B) {
    const r = R(), from = s.cities[B.from], to = s.cities[B.to];
    const { atkForce, defForce, win, lines } = B;
    const atkLeft = aliveUnits(B.atk).reduce((a, u) => a + u.troops, 0);
    const defLeft = aliveUnits(B.def).reduce((a, u) => a + u.troops, 0);
    lines.push(`${B.day}日で決着：攻撃側 残り${atkLeft}／守備側 残り${defLeft}`);
    const captives = [...B.atk, ...B.def].filter(u => u.captured).map(u => s.officers[u.officer]);
    const capturedIds = new Set(captives.map(o => o.id));
    for (const u of B.atk) if (u.officer && !u.captured && win) gainMerit(s, s.officers[u.officer], r.merit.battleWin);
    for (const u of B.def) if (u.officer && !u.captured && !win) gainMerit(s, s.officers[u.officer], r.merit.battleHold);
    if (win) {
      to.owner = atkForce;
      to.troops = atkLeft;
      to.training = B.atkTrain;
      to.order = Math.max(0, to.order - r.conquestOrderLoss);
      for (const u of B.atk) if (!u.captured && u.troops > 0) s.officers[u.officer].city = B.to;
      // 敗走した攻撃側の武将は元の都市へ（すでに city=from）。城内に残る守備側の武将：逃げるか捕まる
      const escape = adj(B.to).filter(id => s.cities[id].owner === defForce && defForce);
      const others = defForce ? citiesOf(s, defForce) : [];
      for (const o of officersIn(s, B.to, defForce)) {
        if (capturedIds.has(o.id)) continue;
        const isRuler = defForce && s.forces[defForce].ruler === o.id;
        if (escape.length && (isRuler || rand(s) < r.fleeRate)) { o.city = pick(s, escape); lines.push(`${o.id}は${o.city}へ逃れた。`); }
        else if (isRuler && others.length) { o.city = pick(s, others).id; lines.push(`${o.id}は${o.city}へ落ち延びた。`); }
        else { captives.push(o); capturedIds.add(o.id); lines.push(`${o.id}は捕らえられた。`); }
      }
      lines.push(`${B.to}は${forceName(s, atkForce)}のものとなった。`);
    } else {
      // 攻撃側は兵を連れて帰る（出陣元を失っていたら、自軍の別の都市へ）
      const home = from.owner === atkForce ? from : citiesOf(s, atkForce)[0];
      if (home) home.troops += atkLeft;
      to.troops += defLeft;
      lines.push(aliveUnits(B.atk).length ? `${forceName(s, atkForce)}は兵を引いた。` : `${forceName(s, atkForce)}は撃退された。`);
    }
    // 攻撃側の武将は守備側の都市へ、守備側の武将は（勝てば）落とした都市・（負ければ）出陣元へ連れていかれる
    for (const o of captives) {
      o.status = 'captive';
      o.captor = o.force === atkForce ? defForce : atkForce;
      o.city = o.captor === atkForce ? (win ? B.to : B.from) : B.to;
    }
    const report = { date: dateText(s), from: B.from, to: B.to, atkForce, defForce, win, lines, day: B.day, captives: captives.map(o => o.id), tactical: !!B.tactical };
    log(s, `${forceName(s, atkForce)}が${B.to}（${forceName(s, defForce)}）を攻撃：${win ? '落城' : '撃退'}`, 'war');
    if (defForce) afterLoss(s, defForce, report);
    settleCaptives(s, captives);
    if (atkForce === s.player || defForce === s.player) s.reports.push(report);
    checkEnd(s);
    return report;
  }

  function battle(s, fromId, toId, orders) { return finishBattle(s, autoBattle(s, prepareBattle(s, fromId, toId, orders))); }

  // 特技（data/skills.js）を持っているか
  function hasSkill(o, k) { const S = SG.data.skills; return !!(o && S && S.of[o.id] && S.of[o.id].includes(k)); }
  const skillVal = (o, k, key, base) => hasSkill(o, k) ? SG.data.skills.list[k][key] : base;
  // 一騎打ち。rounds は画面で1合ずつ見せるための記録（{ hit: 'a'|'b', dmg, ha, hb }）。勇将は武力+10
  function duel(s, a, b) {
    const lines = [], rounds = []; let ha = 100, hb = 100;
    const wa = a.war + skillVal(a, 'hero', 'duelWar', 0), wb = b.war + skillVal(b, 'hero', 'duelWar', 0);
    for (let round = 1; round <= 10 && ha > 0 && hb > 0; round++) {
      const aWins = rand(s) < wa ** 2 / (wa ** 2 + wb ** 2);
      const dmg = Math.round(range(s, 8, 22));
      if (aWins) hb -= dmg; else ha -= dmg;
      rounds.push({ hit: aWins ? 'a' : 'b', dmg, ha: Math.max(0, ha), hb: Math.max(0, hb) });
      if (round <= 3 || ha <= 0 || hb <= 0) lines.push(`　${round}合目：${aWins ? a.id : b.id}の一撃！`);
    }
    if (ha > 0 && hb > 0) { lines.push('　10合打ち合って勝負つかず。'); return { lines, rounds, winner: null }; }
    const w = ha > 0 ? a : b;
    lines.push(`　${w.id}の勝ち！`);
    return { lines, rounds, winner: w };
  }

  // 都市を失った勢力の後始末（滅亡・君主の交代）
  function afterLoss(s, fid, report) {
    const f = s.forces[fid];
    if (!f.alive) return;
    if (citiesOf(s, fid).length) return;
    f.alive = false;
    for (const o of membersOf(s, fid)) { o.status = 'free'; o.force = null; o.found = true; }
    report && report.lines.push(`${forceName(s, fid)}は滅亡した。`);
    log(s, `${forceName(s, fid)}が滅亡した`, 'war');
  }

  // 君主が欠けたら跡継ぎを決める（いなければ滅亡）
  function ensureRuler(s, fid) {
    const f = s.forces[fid];
    if (!f.alive) return;
    const r = s.officers[f.ruler];
    if (r && r.status === 'serve' && r.force === fid) return;
    // 跡継ぎ：前の君主の血縁（data/bonds.js の順）→ 義兄弟 → 魅力＋統率の高い者
    const kin = kinOf(f.ruler), sw = swornOf(f.ruler);
    const rank = o => kin.includes(o.id) ? 2000 - kin.indexOf(o.id) : sw.includes(o.id) ? 1000 : 0;
    const heirs = membersOf(s, fid).filter(o => !o.mole).sort((a, b) => rank(b) - rank(a) || (b.cha + b.lead) - (a.cha + a.lead));
    if (!heirs.length || !citiesOf(s, fid).length) {
      f.alive = false;
      for (const c of citiesOf(s, fid)) c.owner = null;
      for (const o of membersOf(s, fid)) { o.status = 'free'; o.force = null; o.found = true; }
      log(s, `${f.ruler}軍は跡継ぎがなく滅亡した`, 'war');
      return;
    }
    const old = f.ruler;
    f.ruler = heirs[0].id; heirs[0].loyalty = 100;
    log(s, `${old}に代わり、${f.ruler}が君主となった`, 'war');
  }

  // 捕虜の処遇。プレイヤーの捕虜は画面で決める
  function settleCaptives(s, list) {
    for (const o of list) {
      if (o.captor === s.player) { s.captives.push(o.id); continue; }
      aiCaptive(s, o);
    }
    for (const fid of Object.keys(s.forces)) ensureRuler(s, fid);
  }
  function captiveChance(s, o) {
    const lord = ruler(s, o.captor);
    const wasRuler = o.force && s.forces[o.force] && s.forces[o.force].ruler === o.id;
    let p = clamp(0.5 + (lord.cha - o.loyalty) / 100, 0.05, 0.95);
    if (wasRuler) p *= 0.3;
    if (o.force && s.forces[o.force] && s.forces[o.force].alive && bonded(s, o)) p = 0.02;
    return p;
  }
  function aiCaptive(s, o) {
    if (rand(s) < captiveChance(s, o)) decideCaptive(s, o.id, 'employ', true);
    else decideCaptive(s, o.id, 'release', true);
  }
  // how: employ 登用 / release 解放 / execute 処断
  function decideCaptive(s, id, how, silent) {
    const o = s.officers[id];
    if (!o || o.status !== 'captive') return ng('捕虜ではない');
    s.captives = s.captives.filter(x => x !== id);
    const captor = o.captor;
    let msg;
    if (how === 'execute') { o.status = 'dead'; msg = `${o.id}を処断した`; }
    else if (how === 'employ' && s.forces[captor].alive && (silent || rand(s) < captiveChance(s, o))) {
      // 捕らえていた都市がその後奪われていたら、自勢力の別の都市へ
      const city = s.cities[o.city].owner === captor ? o.city : pick(s, citiesOf(s, captor)).id;
      Object.assign(o, { status: 'serve', force: captor, city, loyalty: Math.round(range(s, 50, 75)), acted: true });
      msg = `${o.id}が${forceName(s, captor)}に降った`;
    } else {
      // 元の勢力が残っていれば帰る。なければ在野
      const home = o.force && s.forces[o.force].alive ? citiesOf(s, o.force) : [];
      if (home.length) { o.status = 'serve'; o.city = pick(s, home).id; }
      else { o.status = 'free'; o.force = null; o.found = true; }
      msg = how === 'employ' ? `${o.id}は登用を拒んだので解放した` : `${o.id}を解放した`;
    }
    delete o.captor;
    for (const fid of Object.keys(s.forces)) ensureRuler(s, fid);
    if (!silent || captor === s.player) log(s, msg, 'war');
    checkEnd(s);
    return ok(msg);
  }

  // ---------- AI ----------
  function defensePower(s, c) { return c.troops * (1 + c.def / R().defDiv); }

  function aiCity(s, cityId) {
    const c = s.cities[cityId], fid = c.owner, r = R(), ai = r.ai;
    if (!fid) return;
    const idle = () => officersIn(s, cityId, fid).filter(o => !o.acted);
    const neighbors = adj(cityId).map(id => s.cities[id]);
    const enemies = neighbors.filter(n => n.owner && n.owner !== fid && !pactOf(s, fid, n.owner));
    const empties = neighbors.filter(n => !n.owner);
    const threat = enemies.reduce((m, n) => Math.max(m, n.troops), 0);
    const best = (list, key) => list.slice().sort((a, b) => b[key] - a[key])[0];

    // 空白地へ進む
    if (empties.length && idle().length >= 2 && c.troops >= ai.occupyTroops * 2 && c.troops > threat) {
      const o = best(idle(), 'lead');
      exec(s, 'move', { city: cityId, to: pick(s, empties).id, officers: [o.id], troops: ai.occupyTroops, food: Math.min(c.food >> 2, 3000) });
    }
    // 攻撃
    if (enemies.length && idle().length >= 2 && c.troops >= ai.minAttackTroops && rand(s) < ai.attackChance) {
      const send = Math.floor(c.troops * ai.attackShare);
      const target = enemies.slice().sort((a, b) => defensePower(s, a) - defensePower(s, b))[0];
      if (send > defensePower(s, target) * ai.attackRatio && c.food >= send * r.foodPerTroop * 2) {
        const team = idle().sort((a, b) => (b.lead + b.war) - (a.lead + a.war)).slice(0, Math.min(r.maxUnits, idle().length - 1));
        const sum = team.reduce((a, o) => a + o.lead, 0);
        const units = team.map(o => ({ officer: o.id, troops: Math.min(troopCap(s, o), Math.floor(send * o.lead / sum)) }));
        // プレイヤーの都市を攻めるときは、プレイヤーがマス戦闘で迎え撃つ（その都市を委任していれば計算で決着）
        const mode = s.interactive && target.owner === s.player && !target.delegate ? 'tactics' : null;
        if (units.every(u => u.troops >= 100)) exec(s, 'attack', { city: cityId, to: target.id, units, mode });
        if (s.battle) return;
      }
    }
    // 人の少ない前線へ武将を回す
    const mine = neighbors.filter(n => n.owner === fid);
    if (idle().length > 3) {
      const need = mine.find(n => officersIn(s, n.id, fid).length < 2);
      if (need) exec(s, 'move', { city: cityId, to: need.id, officers: [best(idle(), 'lead').id], troops: enemies.length ? 0 : Math.floor(c.troops / 4) });
    }
    // 忠誠の低い武将に褒美
    for (const o of officersIn(s, cityId, fid)) if (o.loyalty < ai.rewardBelow && c.gold > 400 && o.id !== s.forces[fid].ruler) exec(s, 'reward', { city: cityId, target: o.id, gold: 100 });
    // 兵糧が乏しければ買う
    if (c.food < c.troops * r.foodPerTroop * 4 && c.gold > 300) exec(s, 'trade', { city: cityId, mode: 'buy', amount: Math.floor(c.gold / 3) });
    // 残りの武将で内政・軍備
    for (const o of shuffle(s, idle())) {
      const found = freeIn(s, cityId).filter(x => x.found);
      const tries = [];
      if (found.length) tries.push(['employ', { target: found[0].id }]);
      if (c.order < 60) tries.push(['develop', { kind: 'order' }]);
      if (c.troops < Math.max(threat * 1.1, 5000) && c.gold >= 150) tries.push(['recruit', {}]);
      if (c.training < 70 && c.troops > 2000) tries.push(['train', {}]);
      const dev = [['agri', c.agri / c.agriMax], ['comm', c.comm / c.commMax]].filter(x => x[1] < 1).sort((a, b) => a[1] - b[1]);
      if (enemies.length && c.def < c.defMax && rand(s) < 0.3) tries.push(['develop', { kind: 'def' }]);
      if (dev.length) tries.push(['develop', { kind: dev[0][0] }]);
      if (c.gold >= 300 && c.troops < c.pop * 0.08) tries.push(['recruit', {}]);
      if (freeIn(s, cityId).some(x => !x.found) || rand(s) < 0.15) tries.push(['search', {}]);
      // 知将はときどき隣の敵に計略（流言・離間）
      const ap = r.aiPlot;
      if (o.int >= ap.int && c.gold >= ap.minGold && enemies.length && rand(s) < ap.chance) {
        const tc = pick(s, enemies);
        const tgt = officersIn(s, tc.id, tc.owner).filter(x => x.id !== s.forces[tc.owner].ruler).sort((a, b) => a.loyalty - b.loyalty)[0];
        tries.unshift(tgt && rand(s) < 0.5 ? ['plot', { kind: 'discord', target: tgt.id }] : ['plot', { kind: 'rumor', target: tc.id }]);
      }
      tries.push(['train', {}]);
      for (const [name, args] of tries) if (exec(s, name, { city: cityId, officer: o.id, ...args }).ok) break;
    }
  }

  // ---------- 月の終わり ----------
  // 途中でマス戦闘（プレイヤーが迎え撃つ）が入ると止まり、決着のあと runEndTurn でつづきから進める。
  // まだ動いていない都市の順番は s.turnQueue に入れておく（セーブにも残る）
  function endTurn(s) { startEndTurn(s); return runEndTurn(s); }
  function startEndTurn(s) {
    if (s.over || s.turnQueue) return;
    if (s.captives.length) for (const id of s.captives.slice()) decideCaptive(s, id, 'release');
    // プレイヤーの委任都市 → ほかの勢力（毎月順番を変える）
    s.turnQueue = [{ delegate: true }, ...shuffle(s, Object.keys(s.forces)).filter(f => f !== s.player).map(force => ({ force }))];
  }
  function runEndTurn(s) {
    if (!s.turnQueue) return 'done';
    while (s.turnQueue.length && !s.battle && !s.over) {
      const e = s.turnQueue.shift();
      if (e.delegate) { if (s.player) s.turnQueue.unshift(...citiesOf(s, s.player).filter(c => c.delegate).map(c => ({ city: c.id, force: s.player }))); continue; }
      if (!e.city) { if (s.forces[e.force].alive) s.turnQueue.unshift(...shuffle(s, citiesOf(s, e.force)).map(c => ({ city: c.id, force: e.force }))); continue; }
      if (s.cities[e.city].owner === e.force) aiCity(s, e.city);
    }
    if (s.battle) return 'battle';
    s.turnQueue = null;
    // AI に攻められてとった捕虜は、次の月にプレイヤーが処遇を決める
    if (!s.over) nextMonth(s);
    return 'done';
  }

  function nextMonth(s) {
    const r = R();
    for (const o of Object.values(s.officers)) o.acted = false;
    s.month++;
    if (s.month > 12) { s.month = 1; s.year++; }
    for (const c of Object.values(s.cities)) {
      const of = c.order / 100;
      c.gold += Math.floor(c.comm * r.goldPerComm * of);
      if (s.month === r.harvestMonth) c.food += Math.floor(c.agri * r.foodPerAgri * of);
      c.food -= Math.ceil(c.troops * r.foodPerTroop);
      if (c.food < 0) {
        c.food = 0;
        const lost = Math.floor(c.troops * r.starveLoss);
        c.troops -= lost; c.order = Math.max(0, c.order - 5);
        if (c.owner === s.player && lost) log(s, `【${c.id}】兵糧が尽き、兵${lost}が逃げた`, 'bad');
      }
      const base = SG.data.cities.find(x => x.id === c.id);
      c.pop = Math.min(base.pop * 2, Math.floor(c.pop * (1 + r.popGrowth * of)));
      for (const ev of r.events) {
        if (ev.month && !ev.month.includes(s.month)) continue;
        if (rand(s) >= ev.chance) continue;
        if (ev.pop) c.pop = Math.floor(c.pop * (1 + ev.pop));
        if (ev.order) c.order = clamp(c.order + ev.order, 0, 100);
        if (ev.agri) c.agri = Math.floor(c.agri * (1 + ev.agri));
        if (ev.def) c.def = Math.floor(c.def * (1 + ev.def));
        if (ev.food) c.food = Math.floor(c.food * (1 + ev.food));
        if (c.owner === s.player) log(s, `【${c.id}】${ev.name}が起こった`, 'bad');
      }
    }
    // 忠誠の低い武将は去ることがある
    for (const o of Object.values(s.officers)) {
      if (o.status !== 'serve' || o.id === s.forces[o.force].ruler) continue;
      if (bonded(s, o)) { o.loyalty = 100; continue; }
      if (o.loyalty < r.desertLoyalty && rand(s) < r.desertChance) {
        if (o.force === s.player) log(s, `${o.id}が出奔した`, 'bad');
        Object.assign(o, { status: 'free', force: null, found: true });
      }
    }
    diploMonth(s);
    if (s.month === 1) newYear(s);
    for (const fid of Object.keys(s.forces)) ensureRuler(s, fid);
    checkEnd(s);
  }

  function newYear(s) {
    const r = R();
    for (const o of Object.values(s.officers)) {
      if (o.status === 'unborn' && s.year - o.born >= r.comeOfAge) {
        const f = o.pending === 'serve' && s.forces[o.force] && s.forces[o.force].alive ? o.force : null;
        if (f) { const home = s.cities[o.city] && s.cities[o.city].owner === f ? o.city : ruler(s, f).city; Object.assign(o, { status: 'serve', city: home, loyalty: 100 }); }
        else Object.assign(o, { status: 'free', force: null, found: false });
        if (f === s.player) log(s, `${o.id}が元服し、軍に加わった`);
        delete o.pending;
      } else if ((o.status === 'serve' || o.status === 'free') && s.year >= o.die && rand(s) < r.deathChance) {
        const wasPlayer = o.force === s.player;
        o.status = 'dead';
        if (wasPlayer || (o.force && s.forces[o.force].ruler === o.id)) log(s, `${o.id}が世を去った`, wasPlayer ? 'bad' : '');
      }
    }
  }

  function checkEnd(s) {
    if (!s.player || s.over) return;
    if (!s.forces[s.player].alive) { s.over = 'lose'; log(s, '我が軍は滅亡した……', 'bad'); return; }
    if (Object.values(s.cities).every(c => c.owner === s.player)) { s.over = 'win'; log(s, '天下を統一した！', 'good'); }
  }

  // 前の版のセーブを今の形にそろえる
  function migrate(s) {
    for (const o of Object.values(s.officers)) if (o.merit === undefined) o.merit = Math.max(0, Math.round((Math.max(o.lead, o.war, o.int, o.pol) - R().merit.startFrom) * R().merit.startPer));
    if (!s.relations) s.relations = {};
    if (!s.offers) s.offers = [];
    return s;
  }
  // ---------- 官職・血縁 ----------
  function rankOf(s, o) { const rs = R().ranks; let k = rs[0]; for (const x of rs) if ((o.merit || 0) >= x.merit) k = x; return k; }
  function troopCap(s, o) { return o.force && s.forces[o.force] && s.forces[o.force].ruler === o.id ? R().rulerTroops : rankOf(s, o).troops; }
  function gainMerit(s, o, n) {
    const before = rankOf(s, o);
    o.merit = (o.merit || 0) + n;
    const after = rankOf(s, o);
    if (after !== before && o.force === s.player && o.status === 'serve') log(s, `${o.id}が${after.name}に昇進した（率いる兵 ${after.troops}人まで）`, 'good');
  }
  const kinOf = id => ((SG.data.bonds && SG.data.bonds.kin[id]) || '').split(' ').filter(Boolean);
  const swornOf = id => { const g = SG.data.bonds && SG.data.bonds.sworn.map(x => x.split(' ')).find(x => x.includes(id)); return g ? g.filter(x => x !== id) : []; };
  // 君主と血縁・義兄弟で結ばれている（忠誠が下がらず、引き抜き・離間・出奔がない）
  function bonded(s, o) {
    if (!o || !o.force || !s.forces[o.force]) return false;
    const lord = s.forces[o.force].ruler;
    return o.id !== lord && (kinOf(lord).includes(o.id) || swornOf(lord).includes(o.id) || kinOf(o.id).includes(lord));
  }

  // ---------- 外交 ----------
  const monthIndex = s => s.year * 12 + s.month;
  const relKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  function rel(s, a, b) {
    if (!s.relations) s.relations = {};
    const k = relKey(a, b);
    return s.relations[k] || (s.relations[k] = { trust: R().diplo.startTrust, pact: null, until: 0 });
  }
  // いま結んでいる約束（'ally' / 'truce' / null）
  function pactOf(s, a, b) {
    if (!a || !b || a === b || !s.relations) return null;
    const r = s.relations[relKey(a, b)];
    return r && r.pact && r.until >= monthIndex(s) ? r.pact : null;
  }
  const power = (s, fid) => citiesOf(s, fid).reduce((a, c) => a + c.troops, 0);
  function diploChance(s, fid, envoyId, kind, target) {
    const D = R().diplo, conf = D[kind], o = s.officers[envoyId];
    if (!conf || !s.forces[target] || !s.forces[target].alive || target === fid) return 0;
    const r = rel(s, fid, target);
    let p = conf.base + r.trust * conf.perTrust + (o.cha - 50) * conf.perCha;
    if (kind === 'surrender') {
      if (citiesOf(s, target).length > conf.maxCities || power(s, target) * conf.ratio > power(s, fid)) return 0;
      return clamp(p, 0.02, 0.7);
    }
    if (power(s, target) < power(s, fid)) p += D.weakBonus;
    return clamp(p, 0.02, 0.9);
  }
  function makePact(s, a, b, kind) {
    const r = rel(s, a, b), D = R().diplo;
    Object.assign(r, { pact: kind, until: monthIndex(s) + D[kind].months - 1, trust: Math.min(100, r.trust + D.pactTrust) });
  }
  // 降伏：相手の都市と武将がこちらのものになる
  function absorb(s, fid, target) {
    const lord = s.forces[target].ruler;
    for (const c of citiesOf(s, target)) c.owner = fid;
    for (const o of membersOf(s, target)) Object.assign(o, { force: fid, loyalty: o.id === lord ? 60 : Math.round(range(s, 55, 75)) });
    s.forces[target].alive = false;
    for (const id of Object.keys(s.relations || {})) if (id.split('|').includes(target)) delete s.relations[id];
  }
  // 毎月：約束の期限切れ、AIどうしの約束、プレイヤーへの申し入れ
  function diploMonth(s) {
    const D = R().diplo, now = monthIndex(s);
    for (const [k, r] of Object.entries(s.relations || {})) {
      if (r.pact && r.until < now) {
        const [a, b] = k.split('|');
        if (a === s.player || b === s.player) log(s, `${forceName(s, a === s.player ? b : a)}との${D[r.pact].name}が切れた`);
        r.pact = null;
      }
    }
    const alive = Object.keys(s.forces).filter(f => s.forces[f].alive);
    const touching = (a, b) => citiesOf(s, a).some(c => adj(c.id).some(id => s.cities[id].owner === b));
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      if (a === s.player || b === s.player || pactOf(s, a, b) || !touching(a, b)) continue;
      if (rand(s) < D.aiPactChance) makePact(s, a, b, rand(s) < 0.5 ? 'ally' : 'truce');
    }
    if (s.player && s.forces[s.player] && s.forces[s.player].alive) for (const f of alive) {
      if (f === s.player || pactOf(s, f, s.player) || rel(s, f, s.player).trust < D.aiOfferTrust) continue;
      if (rand(s) < D.aiOfferChance && !(s.offers || []).some(x => x.force === f)) (s.offers = s.offers || []).push({ force: f, kind: 'ally' });
    }
  }
  // プレイヤーへの申し入れに答える
  function answerOffer(s, i, yes) {
    const o = (s.offers || [])[i]; if (!o) return ng('申し入れがない');
    s.offers.splice(i, 1);
    if (!s.forces[o.force].alive) return ng('その勢力はもうない');
    if (yes) { makePact(s, s.player, o.force, o.kind); log(s, `${forceName(s, o.force)}と${R().diplo[o.kind].name}を結んだ`, 'good'); return ok('結んだ'); }
    rel(s, s.player, o.force).trust = Math.max(0, rel(s, s.player, o.force).trust - 5);
    return ok('断った');
  }

  function forceSummary(s, fid) {
    const cs = citiesOf(s, fid);
    return { cities: cs.length, officers: membersOf(s, fid).length, troops: cs.reduce((a, c) => a + c.troops, 0), gold: cs.reduce((a, c) => a + c.gold, 0), food: cs.reduce((a, c) => a + c.food, 0) };
  }

  Object.assign(SG, { migrate, rankOf, troopCap, bonded, gainMerit, hasSkill, skillVal, rel, pactOf, diploChance, answerOffer, plotChance, plotTarget, rand, range, pick, newGame, exec, endTurn, startEndTurn, runEndTurn, nextMonth, prepareBattle, autoBattle, finishBattle, routUnit, unitPower, unitName, duel, aiCity, adj, officersIn, freeIn, citiesOf, membersOf, ruler, forceName, dateText, decideCaptive, captiveChance, forceSummary, defensePower, commands });
})();
if (typeof module !== 'undefined') module.exports = SG;
