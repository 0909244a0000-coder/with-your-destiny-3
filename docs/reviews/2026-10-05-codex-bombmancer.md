# 冥爆術師：実装・検証（2026-10-05、Codex）

## 追加したもの
- 第7職業 `bombmancer`。黒い礼装・白い仮面・羽根状の肩当て、紫と琥珀の爆炎。既存作品の「静かな不気味さ」「爆弾を仕込む」「追尾爆弾」を発想の参考に、ゲーム用の人物・使い魔を新規に設計。
- スキル9種、各3型、OFF時の熟練、自動育成、職業別保存、戦闘リザルト。
- 専用ユニーク2種、4部位セット1種。墓場・大聖堂・地下遺跡の狙い周回に対応。
- 画像15枚、計2,054,859 bytes。キャラ2ポーズ・使い魔1・アイコン9・FX3。拠点でFXを先読み。爆発の各命中に大きな火花を重ねず、一度の爆発の絵で見せる。連続起爆音と揺れは0.12秒間隔で抑制。

## 使い方
上の「キャラ」から「冥爆術師」を選ぶ。キャラごとにセーブは別。野営地から「戦場へ」で出発。
おまかせ育成は「死の種・灰の外套・追葬の使い魔」。

| スキル | 役割 |
|---|---|
| 死の種 | 時限爆弾を仕込み、時間経過または宿主死亡で範囲爆発 |
| 灰の外套 | HPが減ると回復・防御 |
| 追葬の使い魔 | 敵を追って接触爆発、標的死亡時は再選択 |
| 終幕の指鳴らし | 仕込済み爆弾を1.35倍で連鎖起爆、爆弾がなくても単体起爆 |
| 葬送の地雷 | 接近または時間で爆発 |
| 黒煙の檻 | 近づく敵を拘束 |
| 静かな殺意 | 攻撃速度強化 |
| 残火の庭 | 敵の密集地への継続ダメージ |
| 灰燼の安息 | 自分と味方の継続回復 |

連鎖型は「死の種・終幕・灰の外套」。地雷型は「葬送・黒煙・残火」。
終幕で誘爆した分は元の爆弾スキルに集計する。会心判定・吸血・拘束・装備効果は既存の命中処理を使用。時限爆弾は発動時の攻撃力・型の効果を保持し、会心率などは命中時に参照。

## 測定条件・結果
指定ブランチの最新 `fec4830` を確認。前回背景版PR #103（`8c27450`、未マージ）の内容を引き継いだ作業ブランチ。mainは参照していない。
各職業、新規セーブ・傭兵なし・ゲーム本来の自動育成/装備。40分の冒険のあと試練15分。同じ条件を2回。乱数seed固定なし。初回説明を閉じ、拠点を出て測定。

```sh
node tools/balance-sim.js 40 bombmancer 15
node tools/balance-sim.js 40 barbarian 15
node tools/balance-sim.js 40 sorceress 15
node tools/balance-sim.js 40 necromancer 15
node tools/balance-sim.js 40 paladin 15
node tools/balance-sim.js 40 assassin 15
node tools/balance-sim.js 40 druid 15
```

| 職業 | クリア表示（2回） | 冒険中の死亡（2回） | 試練best（2回） |
|---|---|---|---|
| 冥爆術師 | 21 / 21分 | 1 / 0 | 15 / 14 |
| バーバリアン | 21 / 21分 | 3 / 0 | 12 / 9 |
| ソーサレス | 20 / 23分 | 0 / 3 | 14 / 13 |
| ネクロマンサー | 19 / 21分 | 0 / 2 | 13 / 14 |
| パラディン | 22 / 23分 | 1 / 3 | 11 / 13 |
| アサシン | 21 / 20分 | 3 / 1 | 13 / 13 |
| ドルイド | 20 / 21分 | 0 / 2 | 12 / 16 |

クリア分数は道具のイベントログが丸めて表示した値。死亡数は道具が冒険40分中に数えた値で、試練中の死亡は含まない。試練は表示中のlevelではなくbestを採用。
冥爆術師の強さは今回の既存職業の範囲に収まった。**推測**：遠距離・範囲爆破で安全性が高く、標準構成でも中〜上位になりやすい。2回では装備運と全ビルドの最終性能までは断定できない。既存6職業の性能数値とルーンワードは変更していない。

## エラー・機能検証
```sh
node tools/fuzz-test.js bombmancer 1500
node tools/fuzz-test.js barbarian 1500
node tools/fuzz-test.js sorceress 1500
node tools/fuzz-test.js necromancer 1500
node tools/fuzz-test.js paladin 1500
node tools/fuzz-test.js assassin 1500
node tools/fuzz-test.js druid 1500
node tools/combo-test.js
node tools/bombmancer-test.js
node tools/combat-results-test.js
node tools/start-town-test.js
node tools/loot-safety-test.js
```
- fuzz各職業2回：合計21,000操作、NaNなし、各50回の再読込成功、エラー0。
- combo2回と最終再確認1回：7職業×季節×通常/ボス/試練/日替わり/地図/双王、エラー0。職業一覧をdataから読むようにした。
- 冥爆術師専用22項目：時限、範囲、宿主死亡、追尾再選択、地雷の準備時間・接近・時限、起爆の増幅重複防止、キュー上限、階移動・拠点の消去、27型、型の回復、保存分離、熟練、専用ドロップ、集計を確認。画像15枚のロード確認。
- 3スキルの全84組×型の3選択 =252条件で6秒ずつ動作。有限HP・ダメージとキュー上限を確認。型の混在全27通りや装備の全組合せまでは網羅していない。
- リザルト・拠点開始・戦利品保護の既存テスト成功。
- 1440px/390pxタッチ模擬ブラウザで日本語の表示・専用画像・スキル欄を目視。横はみ出しなし（scrollWidth=1440/390）。実機iPhoneと実機FPSは未測定。

クラウドの検証環境ではPlaywrightに用意したChromiumを指定するpreloadを使った。これは作業環境だけの設定で、ゲームには追加していない。

## 受け渡す設計
- 定義・数値・27型・装備・演出設定：`data/bombmancer.js`。
- 共通爆弾キュー：`src/bombs.js`。最大24個、時間・接近・追尾・一斉起爆。爆発対象は処理前にコピーし、キューから外した後に攻撃して再帰起爆を防止。
- 敵はIDでなくオブジェクト参照で追跡。階移動・敵入替・拠点・死亡・復活で爆弾を消す。キャラ保存には戦場の爆弾を含めない。
- 初期HP105、攻撃10、防御1.5、通常遠隔250。死の種はCD4秒・起爆1.2秒・倍率1.5+0.28/skillLv。追葬はCD5秒・倍率2+0.35/skillLv。すべてdata内。
- 墓場：灰葬の手袋（範囲1.3倍/威力0.9倍）。大聖堂：葬送の懐中時計（威力1.15倍/時限0.7倍）。地下遺跡：灰燼宮の礼装（2部位でスキル威力20%とHP40、4部位で爆弾威力1.6倍/CD0.85倍/吸血2%）。
- セット完成・箱の能力・太古始原・伝説宝石を揃えた最終ビルドの順位は未測定。今回の試練表は新規自動育成の測定。

## 画像と生成指示
内蔵imagegen使用。透明キャラ/使い魔のalphaを保持し、`tools/prepare_sprite.py`で256pxへ整形。アイコンは3×3シートから256pxを切り出し。FXは3×1シートを512pxへ切り出し、黒背景のまま加算合成。初回キャラ案はポーズ・カメラを修正した2コマ版へ置換し、初回案はゲームに未採用。

保存先：
- `assets/player_bombmancer.png` / `assets/player_bombmancer_attack.png`
- `assets/bomb_hunter.png`
- `assets/skills/bomb_{brand,cloak,hunter,finale,mine,smoke,haste,cinders,repose}.png`
- `assets/vfx/bombOrb.png` / `bombBurst.png` / `bombSmoke.png`

### bombIdlePrompt

Use case: stylized-concept. Asset type: transparent game character sprite for a painterly western dark fantasy top-down action RPG. One original male occult bomb sorcerer, full body, top-down three-quarter isometric camera, facing right, poised still idle. Tall lean sinister elegant nobleman, dark shoulder-length swept hair, ivory lower-face respirator masquerade mask, long black tailored coat with deep plum lining, antique brass clasps and leather gloves, ivory shoulder armor shaped like folded raven feathers. Right hand calmly holds a small floating amber-violet explosive ember, left hand behind back. Strong readable silhouette at 64 pixels, restrained rich painting, Diablo-like grounded materials, dramatic plum rim light, natural human anatomy. Centered isolated genuinely transparent background, whole boots visible, generous safety margin, no ground, no shadow plane, no lettering, no borders, no graphic symbols, no anime cel shading, no existing fictional character costume or logos. One character only.

### bombPosePrompt

Use case: identity-preserve. Edit target: attached character. Produce ONE transparent two-cell sprite atlas, two equal square cells side by side, same identical character in both. Keep mask, long black/plum coat, feather-shaped ivory pauldrons, hair, brass details and boots. Change camera to a HIGH overhead 45 degree isometric game view, visible crown of head and tops of shoulders, character facing right. LEFT CELL idle hand hovering with small amber bomb; RIGHT CELL active attack, leaning right with arm extended and fingers snapping to detonate a violet ember. Full body each cell, centered, equal scale, both boots wholly visible. No labels, no dividers, no background or haze, true transparent pixels, no ground shadows. Readable bold silhouette at 64px, painted western dark fantasy RPG sprites, crisp contour. Two poses of SAME character and same high camera angle, no extra characters.

### bombIconPrompt

Use case: stylized-concept. Asset type: single game skill icon atlas, exactly 3 columns by 3 rows, equal square cells, no cell borders, no text. Original masked dark fantasy bomb sorcerer palette antique ivory black plum violet and hot amber. Painterly Diablo RPG skill icons with strong bright silhouettes readable at 48 pixels on almost black background. Row1 left: round antique dark bomb with burning violet fuse (death seed); middle: black feather cloak wrapped around pale mask (protective cloak); right: small ivory raven-mask bomb familiar with glowing amber belly and wispy violet tail (homing familiar). Row2 left: black-gloved fingers snapping with a sharp amber violet explosion (mass detonation); middle: half buried brass bomb emitting amber sparks (mine); right: dark purple smoke clutching an enemy silhouette (smoke restraint). Row3 left: sharp pale eye above ivory lower-face mask, violet aura (quiet killing intent); middle: violet embers and molten cracks on ground (cinder garden); right: pale comforting purple ember cupped by black hands (recovery aura). Every symbol centered in its own cell with generous dark margins, consistent lighting, no tiny details, no faces resembling existing characters, no logos, no labels.

### bombFxPrompt

Use case: stylized-concept. Asset type: one top-down additive-blended dark fantasy explosive visual effects atlas, exactly THREE equal square cells arranged in a horizontal row. Pure solid BLACK background throughout, no dividing lines, all artwork fully contained within its own cell and fading to black near cell edges with safe margin. Left cell: compact molten amber dark bomb orb with bright violet wisps flowing LEFT, flying RIGHT, no lettering or metal decorative symbols. Middle cell: powerful circular organic detonation seen exactly from overhead, white-gold pinpoint heart, amber flame shards blasting outward, outer violet smoke lobes, readable dynamic asymmetric sparks, blast fills about70percentofcell. Right cell: overhead swirling purple charcoal smoke cloud and glowing violet embers, soft irregular edge with dark center, no explosion. Painterly natural organic fire and smoke, strong value separation, no stars or geometric seals or runes or circles drawn as lines, no scenery, no people, no mushroom cloud, no text. Keep black black for additive rendering.

### bombHunterPrompt

Use case: stylized-concept. Asset type: transparent top-down dark fantasy game homing bomb familiar sprite. ONE small original autonomous occult creature: compact floating antique brass spherical bomb belly with cracked amber glowing core, ivory raven-shaped masquerade mask on front with short sharp beak and narrow violet eyes, two swept black feather fins like tiny wings and short wispy plum tail. Whole creature facing RIGHT, high overhead three-quarter camera showing top of mask and body. Distinct strong silhouette readable at 40pixels, painterly grounded materials, elegant sinister, limited ivory black brass amber violet palette, genuinely transparent background, no halo plane or ground, no text, no logos, no ornaments shaped as geometric seals, no other objects. Full creature entirely inside frame.


