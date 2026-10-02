# 引き継ぎメモ

このリポジトリで作業するAI（Claude・GPTなど）と人のための「今どうなっているか」のメモです。
作業を始める前に、`CLAUDE.md`（= `AGENTS.md`）、`docs/SPEC.md`、このファイルを読んでください。絵の作業なら `docs/ART.md` も読んでください。

## 今できていること
- オート戦闘、レベルアップ、装備ドロップ（レア度：ノーマル／マジック／レア／レジェンド／ユニーク）
- 固有能力 `skillBoost〜`：params.kind のスキルの数値を mods で変える（書き方はスキルの型と同じ。`WYD.runes.effectiveDef` で反映）
- 装備の特殊効果（8種類）、ユニーク装備（12種類、うち2つは一定時間ごとに味方を呼ぶ `periodicSummon`（手下のしくみを全職業で使う）、スキルの動きを変える固有能力。`classOnly` をつけるとその職業でだけ落ちる。図鑑の数もその職業のぶんだけ数える）
- 分解（捨てると素材「魂の欠片」）と、素材で特殊効果をつけ直すクラフト
- エリア4つ（マンダラの森 → シュマシャーナ → パーターラ → 奈落の大聖堂）。4つ目の地面・敵・ボスの絵は、今ある絵の色を変えた仮（`groundTint`・`imageFilter`。`docs/ART.md` に発注あり）。前にクリアしたセーブは、読み込むと4つ目にも行ける。一定数倒すとボス、倒すと次のエリア
- 精鋭（青い名前の強い敵、能力10種類。爆砕の爆発の輪は `w.hazards`、主人公は輪の中にいると自動で外へ逃げる）、遠くから弾を撃つ敵
- スキル6つ、同時にONにできるのは3つまで（ビルド選択）
- 危険度（最大30）と、その「自動」調整
- 自動分解、装備の効果のまとめ、倉庫、放置中の進行（おかえりなさい）、遊び方とクリアの画面
- 各エリアは地下1〜3階＋ボスの間。修練（レベル上限のあと）
- セーブの書き出し・読み込み（自動の控えつき）、スキルの型（ルーン、`data/runes.js`）、セット装備（`data/sets.js`）
- 図鑑と記録と実績（`data/records.js`・`src/records.js`）。図鑑は拾った時に載る。図鑑がなかった頃のセーブは、持っている装備から図鑑を埋める
- 日替わりの試練（`src/daily.js`）。試練のしくみに `trialRun.daily` をつけて動かす。条件は日付から決まる乱数なので、同じ日ならだれでも同じ。日付は遊んでいる人のパソコンの時計
- ボスの怒り（`WYD.world.enrage`）。入れたぶん、水牛魔マヒシャのHPを1300→1150に下げた（自動プレイで15分以内に全部倒せる）
- 自動装備（`WYD.inventory.autoEquip`、点数は `itemScore`）。自動プレイで試したら、手で選んだときと同じくらいの進み方
- 装備の強化（`item.plus`・`item.enhanceSpent`）。能力の計算は `WYD.loot.statTotals(item)`（強化と宝石こみ）にまとめた
- ソケットと宝石（`data/gems.js`・`src/gems.js`）。宝石は持ち物の枠を使わず `state.gems`（"種類:段階" → 数）で持つ。ソケットがなかった頃の装備はソケットなし
- 終わりのない試練（クリア後、上のバーの「試練」から。`data/trial.js`・`src/trial.js`）。試練の最中かどうかはセーブしない（読み直すとふつうの冒険にもどる）。`node tools/balance-sim.js 25 barbarian 20` でクリア後に20分試練を続けた結果も出る
- 職業4つ：バーバリアン（近接）、ソーサレス（火の玉で遠くから）、ネクロマンサー（骨の槍で遠くから＋骸骨の手下。`data/classes.js`）、パラディン（近接＋オーラ）。手下のしくみは `src/allies.js`（新しいスキルのしくみ `raise`）。近くの敵は、主人公より近い手下をねらう。ネクロマンサーとパラディンの絵はまだ仮（`docs/ART.md`）。キャラごとにセーブは別（バーバリアンは `wyd3-save-v1`、ほかは `wyd3-save-v1-<職業>`）
- オーラ（パラディン）：スキルのしくみ `aura`（`src/world.js`）。`auraType` が damage＝周りの敵を `cooldown` 秒ごとに焼く、heal＝主人公と近くの手下のHPを回復、might＝攻撃力アップ（`src/stats.js` の `mightMult`、ONでLv1以上なら常に効く）。足元に輪が出る（数値は `data/fx.js` の `auraRing`）。パラディン専用ユニーク「聖騎士の冠」（全オーラ強化）とセット「聖戦士の誓い」あり。`tools/balance-sim.js` の5つ目の引数で覚えるスキル3つを選べる
- 罠（アサシン）：スキルのしくみ `trap`（`src/traps.js`、置いた罠は `w.traps`）。置いてから `duration` 秒、`fireInterval` 秒ごとに `range` の中の近い敵 `targetsBase` 体を撃つ。置ける数は `maxTrapsBase + maxTrapsPerLevel×(Lv-1)`（スキルごとに数える）。撃つときだけ型のおまけ（吸血・縛る）が効く。影の戦士は `raise`。専用ユニーク「影の鉤爪」・セット「影の結社」。自動プレイ40分：6体目は罠ビルドで18〜21分、ほかのビルドで22分（ほかの職業の強いビルドと同じくらい）
- 傭兵：`src/mercenary.js`・`data/mercenary.js`。戦い方は手下と同じ `src/allies.js`（source が "merc"、時間で崩れない）。いなければ `WYD.mercenary.update` が出す（倒れたら `reviveTime` 秒後）。加護は `src/stats.js` で星座と同じように足す。セーブは `state.mercenary = { type, rank }`。絵は仮（敵の絵の色替え）。`tools/balance-sim.js` の6つ目の引数で傭兵を雇わせられる（4職で最後のボスは18〜19分、雇わないと17〜21分）
- 伝説の宝石：`src/legendaryGems.js`（`WYD.lgems`）・`data/legendaryGems.js`。セーブは `state.lgems = { owned: { id: ランク }, equipped: [...] }`。手に入る・ランク上げは `src/trial.js` の finish（成功時）から。効果は `playerHit`（ダメージ倍率・迅速の重なり）、通常攻撃の間隔、`enemyDied`（強者の災い）、`src/stats.js`（命＝最大HP、血＝吸血）。自動プレイで試練20分後にランク8〜13、試練の最高段階は入れる前とほぼ同じ（10〜14）。パラディンは試練が少し苦手（段階10くらい）
- 6つ目のエリア「業火の玉座」（`inferno`、powerMult 8.0）とボス「業火の魔王」（`hellLord`：分身・炎の沼・炎の弾。大技 slam はなし。slam のないボスにも対応した）。自動プレイ40分：6体目は23〜30分で倒せる（5体目の5〜9分後）。倒れる回数は40分で5〜12回とばらつく（装備の運しだい）。いちばんの原因は精鋭の溶岩の巨人だったので、攻撃力と速さを下げた。`tools/balance-sim.js` の結果に `deathCauses`（どこで・何の近くで倒れたか）を出すようにした
- 祠：`src/shrines.js`・`data/shrines.js`。地面の祠は `w.shrine`、効いている効果は `w.player.shrine`。能力への効果は `WYD.stats.compute` の最後に `WYD.shrines.apply` でかける（`WYD.currentWorld` を見る）。経験値は `enemyDied`、主人公の動きは `updatePlayer`（いちばん近い敵より `detour` 以内なら先に祠へ）。記録 `shrinesUsed` と実績2つ
- キャダラの賭け：`src/gamble.js`・`data/gamble.js`。`WYD.loot.create` に4つ目の引数 `opts`（`slot`・`rarity`）を足した（ほかの呼び出しは今までどおり）。記録 `gambles`
- 裂け目：`src/breach.js`・`data/breach.js`。今の裂け目は `w.breach`、異界の敵は `e.breach`（色は `e.imageFilter`。`src/render.js` は `e.imageFilter` を先に見る）。開いている間は `updateFloors` の降りる処理を待たせる（そうしないと倒した数ですぐ次の階に行き、裂け目が消えていた）。自動プレイ40分で6体目は20〜25分（入れる前21〜27分）。記録 `breaches` と実績2つ
- 賞金首の依頼：`src/bounties.js`・`data/bounties.js`。`WYD.records.add` が呼ばれるたびに `WYD.bounties.onRecord` で進む（記録の名前でつなぐので、新しい種類は data に足すだけ）。セーブは `state.bounties`。ご褒美の装備は自動分解せず持ち物へ（いっぱいなら素材）
- 手直し（クオリティアップ）：スキルの説明に今と次のレベルの数値（`src/skillinfo.js`、しくみ kind ごとに出す数値を決める）。持ち物がいっぱいのときはノーマル・マジックを拾ったその場で素材に（`data/items.js` の `fullSalvage`、知らせは `fullWarnInterval` 秒に1回）。新しいセーブは自動装備ON。戦いの画面は画面の大きさに合わせて広がる・縮む（`src/style.css` の canvas。マウスで画面を触る処理はないので、大きさを変えても大丈夫）
- エフェクト（`src/fx.js`）、絵の動き（`src/render.js` の `pose`）、ディアブロ風パネル（`src/style.css` の後半）、効果音（`src/sound.js`）
- 絵：主人公、地面3枚、装備13個・スキル6個のアイコン、全13種類の敵・ボス（`docs/ART.md` の「受け取り済み」）。アイコンの切り出し用シートも `assets/sheets/` に保存

- 地図（`src/maps.js`）。試練のしくみに `trialRun.map` をつけて動かす。条件は日替わりの試練と同じ `data/daily.js` の mods を使う
- ルーンとルーンワード（`data/gems.js` の runes・runewords。ルーンは宝石と同じ `state.gems` に `"rune:el"` の名前で入る）
- カナイの箱（`src/cube.js`）。`state.cube.learned`（覚えた力）と `state.cube.slots`（枠に入れた力）。固有能力は `WYD.stats.powers` で装備の次に足す

- 数値の上限（強くなりすぎ防止）：防御力がどれだけ高くても攻撃力の15%は通る（`combat.minDamageRatio`）、攻撃速度は4回/秒まで、移動速度ははじめの2倍まで、レア発見は300%まで（`data/player.js`）。最強の装備・ボード全部・星座全部でも、試練は15分で段階18くらい（3職ともほぼ同じ）

## 決まったこと（変えるときは持ち主に相談）
- **個人で遊ぶためのゲーム（公開しない）**。有名なハクスラ（Diablo 2/3/4・Path of Exile・Last Epoch など）の評判のいいしくみは、どんどん取り入れてよい（持ち主の判断）
- **世界観にしばりはない**（持ち主の判断：「本質は人生をかけてアップデートして遊んでいくゲーム。しばりになるならタントラはなくていい」）。いまある敵・ボス・エリアはタントラ風、主人公の側は西洋のダークファンタジー。新しい敵・エリア・装備はタントラ風でなくてよい
- 職業は「バーバリアン」。スキル名・装備名も西洋風
- 2番目のボスは「阿修羅王」（信仰の対象になっている神は敵にしない）
- ソーサレスの絵は、いったん保管していた女性の術者の絵（タントラ風）を使う（持ち主の判断）。スキル名と装備は西洋風
- 職業のスキルは「しくみ（kind）」を共有する。新しい職業は `data/classes.js` に足すだけで作れる。ユニーク装備の説明は `{skill:しくみ}` で職業ごとのスキル名になる
- 数値は全部 `data/` に置く。`src/` に数値を書かない
- データの id（スキル・装備・特殊効果・ユニーク）は、名前を変えても変えない（セーブが壊れないように）。名前を変えたら、古いセーブの装備名を直す表 `data/items.js` の `renamedWords` に足す

## 作業のしかた
- 1回の作業は目的1つ。自分用のブランチを切ってPRを作る
- PRの説明は、プログラミング初心者にもわかる日本語で。遊べるアドレスを必ずつける（`CLAUDE.md` のルール6）
- 絵の作業とプログラムの作業は、さわるファイルが分かれる（絵：`assets/` と `data/` の `image`・`icons`／プログラム：`src/`）。同じファイルを同時に変えないようにする
- 確かめ方
  - ブラウザで `index.html` を開いて、エラーが出ないこと
  - バランスを変えたら `node tools/balance-sim.js 15`（新しいセーブから15分ぶん自動で遊ばせて、ボスを倒した時間と倒れた回数を出す）
  - 古いセーブで壊れないこと（セーブは `localStorage` の `wyd3-save-v1`）
  - 大きく変えたら `node tools/fuzz-test.js <職業> 2000`（でたらめ操作でエラーを探す）と `node tools/combo-test.js`（季節×遊び方の組み合わせ）

## 次にやること（候補、上から優先）
1. **ソーサレス用のアイコン**（`docs/ART.md` の「まだの絵」）
2. **3つ目以降の職業**（`data/classes.js` に足す）
3. あとで考える：カメラを寄せて絵を大きく見せる
