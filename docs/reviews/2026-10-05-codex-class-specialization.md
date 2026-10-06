# クラスの戦い方を分ける（Codex、2026-10-05）

ユーザー指示：全クラスの技が似ているので、今後のコンテンツ追加に向けて特徴を強める。強さの差は許容し、均等化しない。共通の9技を全部置換するのではなく、今回は7クラスの主力14技を実際に異なる挙動へ変更した。

## 問題と変更

根拠：`data/skills.js`と`data/classes.js`で、周囲攻撃=whirl、防御回復=vajra、跳弾=sudarshana、地面攻撃=agni等の共通処理を、技名・色・倍率だけ変えて使っていた。例えば「骨の飛槍」と「祝福の鎚」はどちらも敵間を跳ねる攻撃、「竜巻」と「刃の舞」はどちらも本人中心の一斉攻撃だった。

| クラス | 今回変えた主力 | 戦い方・弱点 |
|---|---|---|
| バーバリアン | 旋風斬は移動追従の3連撃、焦土は突進＋衝撃＋炎 | 群れに飛び込み続ける。接近による被弾の危険もある |
| ソーサレス | ノヴァで凍結、メテオは実際の着弾ダメージ＋着弾後に炎 | 凍結と隕石を組む。隕石の落下中に敵が逃げれば当たらない |
| ネクロマンサー | 骨の嵐で屍体爆破、骨の槍は直線貫通 | 召喚で倒して屍爆につなぐ。屍体がない時は従来の骨の嵐 |
| パラディン | 熱狂の一撃は単体3連打、鎚は本人と動く周回攻撃 | 前線を維持してオーラと連撃を使う。鎚は遠い敵へ追尾しない |
| アサシン | 刃の舞は背後への急襲、刃/雷罠は瀕死の敵への威力2倍 | 設置と急襲で仕留める。移動で敵の集まりへ入る危険もある |
| ドルイド | 竜巻は前進する継続攻撃、岩は直線貫通＋押し返し | 熊は魔法威力、狼は竜巻速度。変身と自然魔法を組める |
| 冥爆術師 | 使い魔は仕込み対象を優先、一斉起爆は未起爆の仕込み数で増幅 | 準備して誘爆を狙う。準備なしの一斉起爆は強化されない |

スキルID・kind・レベル上限・型IDは維持。型/skillBoost/固有能力を使う共通経路から発動する。新しい一時状態（追撃/屍体/周回描画）は戦場だけに置き、保存しない。死亡/復活/階移動/敵入替/拠点/アリーナ脱落で破棄する。追撃も元の技に与ダメージを集計し、対戦のダメージ上限・回復/拘束補正を通す。

既存の技Lv/ON/OFF/型/装備の保存を引き継ぐ。自動育成のおすすめだけを5クラスで変更した。既存のON/OFFを自動で変えないため、新しい構成を試す場合はスキル欄で選ぶ。型の「当たる数」の説明も貫通数/周回の打撃回数へ更新。スキル欄に独自挙動の説明と、ネクロの残り屍体数を表示。絵は既存の素材を使い、竜巻の前進・鎚の周回・連撃・突進を描画する。

## 数値（data/classSpecialization.js、追加前→後）

新しい値はすべてこのファイル。元の威力/半径/クールダウンは既存dataの値と型/装備補正を使う。

| 値の場所 | 前 → 後 |
|---|---|
| skills.whirl.pulses / interval / hitScale | 単発1撃 → 3撃 / 0.35秒 / 各55% |
| skills.agni.stopAt / impactScale | 突進/衝撃なし → 距離32まで突進 / 元の1回威力×2 |
| skills.sorc_nova.freeze / bossScale | 凍結なし → 1.2秒 / ボス30% |
| skills.sorc_meteor.impactScale | 着弾ダメージなし → 元の1回威力×3.5。着弾時刻はdata/vfx.js.meteorFallを使用 |
| skills.nec_nova.maxCorpses / corpseLife / consume | 蓄積なし → 6体 / 12秒 / 最大3体消費 |
| skills.nec_nova.range / radiusScale / damageScale | 屍爆なし → 射程300 / 元の半径80% / 元の威力×1.5 |
| skills.nec_spear.widthRatio | 跳弾 → 直線の幅はjumpRangeの12%。貫通数は元のtargets＋装備 |
| skills.pal_zeal.strikes / interval / hitScale | 全体1撃 → 単体3撃 / 0.16秒 / 各60% |
| skills.pal_hammer.interval / radiusRatio / hitRadius / hitScale | 跳弾 → 打撃0.45秒ごと / 周回半径jumpRange×0.4 / 打撃半径50 / 各80% |
| skills.asn_blade.range / offset / executeHp / executeScale | 急襲/瀕死補正なし → 急襲240 / 背後28 / HP35%以下で2倍 |
| skills.asn_sentry.executeHp / executeScale | 瀕死補正なし → HP35%以下で2倍 |
| skills.dru_tornado.range / speed / duration / interval / hitScale | 本人中心単発 → 射程280 / 前進100 / 2.4秒 / 0.4秒ごと / 各40% |
| skills.dru_tornado.bearScale / wolfSpeedScale | 変身の魔法連動なし → 熊の竜巻威力×1.5 / 狼の竜巻速度×1.6 |
| skills.dru_boulder.widthRatio / knockback / bossKnockbackScale / bearScale | 跳弾 → 直線の幅jumpRange×0.18 / 押し返し55 / ボス10% / 熊威力×1.6 |
| skills.bomb_finale.perBomb / maxBonusBombs | 個数による増幅なし → 1個につき誘爆倍率+0.05 / 最大8個 |
| maxTasks | 追撃キューなし → 各戦場最大96件 |

同ファイル末尾の自動育成：バーバリアン `[whirl,vajra,sudarshana]`→`[whirl,vajra,agni]`、ソーサレス `[sorc_nova,sorc_shield,sorc_chain]`→`[sorc_nova,sorc_shield,sorc_meteor]`、パラディン `[pal_zeal,pal_shield,pal_hammer]`→`[pal_zeal,pal_prayer,pal_hammer]`、アサシン `[asn_blade,asn_cloak,asn_shuriken]`→`[asn_blade,asn_cloak,asn_sentry]`、ドルイド `[dru_bear,dru_wolf,dru_wolves]`→`[dru_bear,dru_tornado,dru_wolves]`。既存ON/OFFは保持する。

## 測定

```sh
node tools/balance-sim.js 40 barbarian 15
node tools/balance-sim.js 40 sorceress 15
node tools/balance-sim.js 40 necromancer 15
node tools/balance-sim.js 40 paladin 15
node tools/balance-sim.js 40 assassin 15
node tools/balance-sim.js 40 druid 15
node tools/balance-sim.js 40 bombmancer 15
```

各2回、新規セーブ・ゲームの自動育成/自動装備・冒険40分＋試練15分。表示ログの分単位、ドロップはランダム。以前とおすすめ構成も変わるため、同一ビルドの性能比較や最強順位とはみなさない。

| クラス | クリア分（1/2回目） | 試練best | 冒険死亡 |
|---|---:|---:|---:|
| バーバリアン | 21 / 20 | 16 / 13 | 2 / 1 |
| ソーサレス | 20 / 20 | 14 / 15 | 1 / 0 |
| ネクロマンサー | 18 / 19 | 16 / 15 | 0 / 1 |
| パラディン | 19 / 23 | 14 / 11 | 1 / 2 |
| アサシン | 19 / 19 | 16 / 13 | 1 / 1 |
| ドルイド | 20 / 20 | 17 / 16 | 3 / 2 |
| 冥爆術師 | 23 / 20 | 12 / 11 | 1 / 0 |

全14回ブラウザエラー0。到達差を揃えるための追加調整はしない。

```sh
node tools/class-specialization-test.js
node tools/combo-test.js
node tools/bombmancer-test.js
node tools/arena-test.js
node tools/arena-rules-test.js
node tools/equipment-label-test.js
node tools/arena-balance.js . results/specialization-arena-balance.json
node tools/fuzz-test.js barbarian 1500
node tools/fuzz-test.js sorceress 1500
node tools/fuzz-test.js necromancer 1500
node tools/fuzz-test.js paladin 1500
node tools/fuzz-test.js assassin 1500
node tools/fuzz-test.js druid 1500
node tools/fuzz-test.js bombmancer 1500
```

- 独自挙動：移動後の連撃、突進/焦土、着弾前に炎が当たらない、屍体消費/上限、直線貫通/射線外除外、単体3連打、移動追従の鎚、急襲/罠の瀕死威力、熊/狼の差、仕込み優先/再増幅なしを検証。全職業で死亡/敵入替による破棄、育成データの保存復元、390px横はみ出しなし、説明文を確認。
- combo全7職業、冥爆術師252構成、アリーナ42対戦＋全63技×3型、対戦補正、装備名189件、fuzz各1500操作＋各50再読み込み：エラー0。
- アリーナ：3構成×全21組×3回＋7陣営戦各3回＝198試合。1対1中央値は育成途中24.7秒/育成済み23.4秒/強装備28.8秒、7陣営41.9/43.1/49.05秒。相打ち0、時間切れ0。全試合で与被ダメージ一致/有限HP。職業勝率の均等化なし。
- HTTP同一オリジン・通常セキュリティの実UIで開戦/停止/7人戦/終了、描画と390pxを確認。実機iPhoneのFPSは未測定。
- 証跡：`2026-10-05-codex-class-specialization-results.json`にPvEのイベント/構成とアリーナ198試合の条件・勝者・時間を記録。全装備と最適ビルド、残る49技の全独自化は今回の対象外。
