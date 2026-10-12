# パラディン・バーバリアン・ドルイド（熊・狼）のモーション

2026-10-12。組み込み生成（imagegen）で作成。`codex/paladin-barbarian-druid-motion` ブランチ。

## 保存先と容量

|姿|保存先|動作|容量|
|---|---|---|---|
|パラディン|`assets/paladin/{idle,walk,attack,prayer}.webp`|待機1、歩行・鎚攻撃・聖なる発動 各8コマ|400,380 bytes|
|バーバリアン|`assets/barbarian/{idle,walk,attack,whirl,shout}.webp`|待機1、歩行・双剣・回転・雄叫び 各8コマ|500,788 bytes|
|ドルイド（人間）|`assets/druid/{idle,walk,cast}.webp`|待機1、歩行・自然の詠唱 各8コマ|下の獣と合計1,015,502 bytes|
|熊・狼|`assets/druid/{bear,wolf}/{idle,walk,attack,roar}.webp`|各待機1、歩行・爪攻撃・咆哮 各8コマ|同上|
|専用VFX|`assets/vfx/{paladinHammerImpact,barbarianBladeWind,druidPrimalPulse}Atlas.webp`|各2×2の連続4コマ|635,966 bytes|

23画像、計2,552,636 bytes（約2.43MiB）。人物は256pxセル、足元(128,234)、横8コマ。待機は歩行の最初のコマを別ファイルにした。VFXは768pxシート、384pxセル。WebP quality86。新規ライブラリ・外部サービス・セーブ変更なし。

## 組み込み

`data/playerMotions.js` を `index.html`・`arena-engine.html`・`dps-engine.html` に追加。職業別の描画設定と全ての演出数値をここに置いた。熊・狼のモーションは、ドルイドの変身IDから共通描画で選ぶ。蒐集者の変身でも使用。

- パラディン：熱狂・祝福の鎚は鎚攻撃。盾・誓い・鎖・天の裁きは聖なる発動。常時オーラは従来の持続VFXを使用し、毎秒の効果で人物の攻撃を中断しない。
- バーバリアン：通常・投げ斧・焦土は双剣。旋風斬は8方向の回転。鉄の皮膚・狂戦士の怒り・束縛・祖霊は雄叫び。常時オーラは人物を中断しない。
- ドルイド：人間は自然の詠唱。熊・狼の通常攻撃はそれぞれの爪連撃。変身と咆哮・樹皮・狼召喚・蔓は咆哮、攻撃系の技は爪動作。熊は重い速度、狼は速い速度で再生。

手元/武器の光をコマ別の座標で追従。床のVFXも変身後の倍率と同じ足元を使用。foregroundにも atlas の切出しを通し、シート全体を描かない。新VFXだけは一度作るキャンバスでセルの端を減衰し、光が四角く切れる境目を抑える。元画像は保持、加工キャッシュは各768pxシート1枚で、毎フレームの生成はしない。控えめ表示に対応。

変身/解除時は前の姿の動作と予約を破棄し、描画時にも姿IDを確認して混ぜない。未読込・未知の姿は元の静止画へ戻る。通常攻撃で大技を中断せず、異なる大技は1件順次再生。演出の完了と実際のダメージ発生は完全同期ではない。能力・射程・HP・クールダウン・変身時間は維持。

## 素材準備と確認

原図を4×2から切出し、各動作内の共通縮尺・共通足元で配置。上体のアルファ位置から横位置を合わせ、隣セルの断片を除外した。動作の最初の姿を基準に人物の高さを揃え、全コマの武器/爪が256pxセルに収まる倍率を各姿で共有。熊の爪がセルを越えた初版は生成編集で余白を修正し、行全体の4つの人物連結成分で切り分けて爪の先まで回収。VFXは各時点を336pxへ正規化し、24pxの透明余白をつけて384pxセルへ格納。23枚の破損・透明背景・寸法を確認。

ブラウザの共通描画で15動作・左右反転・手/床の演出を拡大確認。`warrior-motion-test.js` は実際の技の発動と通常攻撃、順次再生、中断防止、持続オーラ、左右の手/床、変身後の足元倍率、控えめ濃度、描画による状態不変、セル切出し、熊/狼の変身・解除、能力倍率・ダメージ維持、気絶、未読込代替、蒐集者の変身を確認。

## 生成指示

### 人物の共通指示

人物の各最終指示は「この共通指示＋下の人物指定＋Animation:＋各動作の指示」を連結したもの。真の透過背景を指定して内蔵 imagegen を使用。

> Use case: stylized-concept. Asset type: transparent painted dark fantasy RPG character animation atlas. Input images are identity references, preserve their exact subject. Western dark fantasy painterly high contrast detailed textures matching reference. Slightly overhead 3/4 view facing RIGHT, whole body. EXACTLY EIGHT consecutive temporal frames in FOUR columns by TWO rows of equal cells, reading order. Exactly ONE figure per cell. Same camera, consistent body scale, stable foot baseline in all cells, generous transparent gutters on every edge. Each figure INCLUDING ALL weapons paws ears antlers tail and coat must be FULLY CONTAINED in its own cell; no overlap or cropping. Character drawn at most70percent of cell width and80percent of cell height. No ground shadow, no scenic backdrop, no text, numbers, borders, grid lines, no checkerboard. Genuine transparent alpha background. Bigger magic effects will be added separately; no painted large FX. 

### パラディン

参照：`assets/player_paladin.png`、`assets/player_paladin_attack.png`。

> Same armored paladin from reference: enclosed steel helmet, polished silver plate with rich antique gold edging, white sun-emblem tabard and white gold kite shield. One SHORT square-headed WAR HAMMER in weapon hand, one shield in opposite hand. Exact helmet shield hammer armor emblems preserved.

**walk**（元画像 `exec-37470c9a-33e9-4564-8a46-ac4202ddb513.png`）

> 8-frame looping armored walking cycle: right-foot contact, weight transfer, passing feet, left-foot contact, opposite weight transfer, passing, next contact, closing cycle. Alternating legs clearly distinct. Hammer held low and shield braced; heavy measured steps, subtle tabard follow-through. No attacks.

**attack**（元画像 `exec-b041ed2a-f8a5-4aba-92b2-c9ccbc2794fe.png`）

> 8-frame hammer attack: guard, hammer pulls back, lifts above shoulder, strong diagonal overhead strike, low follow-through in front, withdraw, return guard, settle. Shield stays protective. Clear weight shift and readable arc, feet planted; hammer head fully inside cell.

**prayer**（元画像 `exec-701f6e09-8aec-48ae-9e70-3c246cd22fb4.png`）

> 8-frame holy invocation: poised, draws hammer close to chest, raises hammer vertically toward shoulder, presents shield toward enemy, resolute chest lifted blessing pose, lowers hammer, relaxes shield, returns exact initial stance. Planted feet, confident dignified knight, subtle tabard follow-through. No kneeling or giant flash.

### バーバリアン

参照：`assets/player.png`。

> Exact barbarian from reference: rugged muscular adult male with dark shoulder-length wild hair and short beard, fur mantle with wolf-head pauldron, iron armor, leather straps, blue sash, steel leg armor, two broad steel swords. Preserve his face, BOTH swords, blue sash and fur armor in every frame.

**walk**（元画像 `exec-f8419d0c-d2e3-4feb-a97b-1d9adb8cb598.png`）

> 8-frame smooth looping heavy walk. Alternate right and left foot contact with passing steps and believable weight transfer. Both swords held low, shoulder armor and blue sash follow through. No attack.

**attack**（元画像 `exec-80256ff2-3925-4ba3-814e-f7e2f3ca88d3.png`）

> 8-frame dual sword combination: guard, pulls right sword back, right sword diagonal slash across front, left sword counter slash, powerful low crossed follow-through, uncross, recover, initial guard. BOTH swords always visible, not axes. Arms hands blades entirely inside cells. Feet planted around same pivot, strong readable body rotation.

**whirl**（元画像 `exec-a2c6e43d-b38d-4b47-9afe-473a94e98da1.png`）

> 8-frame complete spinning dual sword whirlwind: front-right guard, right side rotation, back-right, back facing, back-left, left side, front-left, front-right closing the cycle. Same character rotating around fixed foot pivot in place, both swords held outward with bent elbows to FIT INSIDE EACH CELL. Torso and blue sash visibly turn, believable overhead3/4 view. No giant sword trails, wind or glow painted into image.

**shout**（元画像 `exec-74085886-15d4-48ea-b311-d8c64042b34d.png`）

> 8-frame battle shout: ready stance, bends knees gathering breath, chest expands, chin lifts and both sword arms spread, ROARS at strongest pose, shoulder and fur recoil, lowers arms, returns stance. Strong heroic silhouette and planted feet; both swords retained. No magic cloud.

### ドルイド（人間）

参照：`assets/player_druid.png`。

> Exact human druid from reference: rugged bearded older male, antler crown, grey wolf pelt over fur/leather coat, muted green drapery, tall gnarled wooden vine-wrapped staff with small green orb. Preserve antlers beard cloak staff and outfit.

**walk**（元画像 `exec-26a2651b-a976-4bb4-8919-05028b1352ca.png`）

> 8-frame smooth looping walking cycle with alternating leg contacts and passing steps. Staff carried vertical slightly forward, pelt cloak antlers beard move gently, full staff and antlers stay inside cell. No attack.

**cast**（元画像 `exec-0622361b-a17c-4862-b9aa-62d067cb22b6.png`）

> 8-frame nature invocation with staff: neutral, gathering with free hand, lifting orb to shoulder height, extends free hand palm toward right, staff settles into ground touch, free fingers close, lowers arm, neutral. Both boots stay planted. Distinct wrist elbow staff movement, antlers not waving wildly; small green orb only, no large FX.

### 熊

参照：`assets/druid_bear.png`。

> Exact werebear from reference: giant brown-furred bipedal muscular bear, enormous long ivory claws and glowing green druidic tribal markings across chest shoulder and arms. Natural bear muzzle, no clothing, no weapon. Always same anatomy, markings and brown fur.

**walk**（元画像 `exec-7e7d12b2-a187-4e83-bd40-fac4ad135c70.png`）

> 8-frame smooth LOOPING heavy bipedal bear walk, on hind legs like reference. Alternating left/right hind paw contacts and passing steps, broad shoulder sway, forepaws held slightly forward. Clearly different leg positions, massive weight, green markings retained.

**attack**（元画像 `exec-e6d511f6-19c2-4e10-9296-fd5a6cd17149.png`）

> 8-frame heavy double claw attack: hunched ready, coils shoulders, raises right forepaw, strong sweeping right claw strike, opposite left claw follow-through, shoulders recoil, paws lower, initial guard. Hind paws rooted around stable foot pivot, long claws fully visible in each cell. No huge embedded slash effects.

**roar**（元画像 `exec-e8e2e0e4-b253-4d1a-84dc-3dcb187c225b.png`）

> 8-frame mighty bear roar and ground stomp: ready, lowers shoulders taking breath, rises tall with forepaws raised, muzzle opens ROARING, drives forepaws downward with weight shifting into planted hind paws, chest and shoulders settle, lowers arms, initial stance. Heavy and readable, green markings retained. NO debris or magic in sprite.

### 狼

参照：`assets/druid_wolf.png`。

> Exact werewolf from reference: lean muscular grey-furred bipedal wolf-man, long bushy tail, green glowing eyes, long claws, dark grey back and lighter chest. Hunched predatory posture, no clothes or weapons. Always same anatomy, muzzle, tail and fur pattern.

**walk**（元画像 `exec-35705ebe-67a9-4f54-aa16-c9812a9e8f7e.png`）

> 8-frame smooth LOOPING fast bipedal stalking run, wolf-man on two hind legs as reference, NEVER a quadruped wolf. Alternating hind leg contact, recoil, passing, opposite contact, recoil, passing and loop closure; hunch and tail respond. Big clear strides without moving out of fixed cell.

**attack**（元画像 `exec-41af45e2-19ce-4198-a01d-f5ff735e6977.png`）

> 8-frame fast wolf-man claw combo: hunched guard, pulls right forepaw back, quick diagonal claw strike, low opposing left claw swipe, jaws snap toward right, recoil shoulders, regain guard, initial stance. Stable hind paw pivot, athletic and sharp, tail follows; no leap out of cell, no embedded FX.

**roar**（元画像 `exec-68d2e7a3-bbde-4490-9d93-dd4fe08092f2.png`）

> 8-frame wolf-man howl: hunched ready, rises slightly on hind paws, shoulders draw back, muzzle lifts skyward HOWLING, forepaws open outward, chest relaxes, lowers muzzle, returns hunch. Tail follows gently, same hind paw baseline. No clothing, no quadruped transformation, no FX.

### 熊の爪・余白の編集

初版 `exec-14de2115-51dc-4c2f-9fab-51af05dc2ae3.png` を編集対象、`assets/druid_bear.png` を本人参照として使用。

> Use case: precise-object-edit. Edit target image1 is the bear attack animation sheet. Image2 is the exact bear identity reference. Keep the SAME eight poses in the SAME four columns by two rows reading order, same camera, same green tribal markings brown fur and ivory claws. Fix the sprite atlas layout: REDUCE EACH bear figure uniformly by25percent and center it inside its OWN equal cell with broad transparent gutters. Restore all cropped or overlapping forepaw/claw tips, especially frame3 top row third and frame5 bottom left. Every forepaw, every claw, hind paw and all fur MUST fit entirely inside its cell with clear empty alpha gap between adjacent figures. Do not let any figure reach a cell edge. All eight full bodies, no extra figures, no text grid lines scenery or ground shadow. Genuine transparent alpha background. Preserve exact character identity and all eight attack pose directions; change only figure sizing/placement and repair clipped extremities.

### paladinHammerImpact

元画像 `exec-6b9b2c42-ca6d-46d9-b4f5-2d242693bb83.png`。参照なしの新規生成。

> Use case: stylized-concept. Asset type: transparent dark fantasy game VFX animation atlas. Exactly FOUR temporal phases in a precise TWO columns by TWO rows equal square grid, reading order. Each effect centered in its own cell with generous20percent transparent margins, absolutely NO overlap or clipping. Same fixed camera, slightly overhead. Painterly magical effects readable at70px, textured but clear silhouettes, hollow transparent centers rather than solid white discs. True alpha transparent background, no scenic ground, no figures, weapons, letters, numbers, labels, grid lines or checkerboard. HOLY HAMMER impact: white-gold short radial streaks, amber sparks and restrained grey dust curls. 1 small compact golden spark,2 sharp expanding broken golden shock ring with a handful luminous shards,3 wider faint broken arcs and scattered warm sparks,4 thin fading flecks. Antique gold and ivory, powerful controlled impact, not a gigantic sun or flower.

### barbarianBladeWind

元画像 `exec-0cb9b9d2-925b-4a42-b774-931629427627.png`。参照なしの新規生成。

> Use case: stylized-concept. Asset type: transparent dark fantasy game VFX animation atlas. Exactly FOUR temporal phases in a precise TWO columns by TWO rows equal square grid, reading order. Each effect centered in its own cell with generous20percent transparent margins, absolutely NO overlap or clipping. Same fixed camera, slightly overhead. Painterly magical effects readable at70px, textured but clear silhouettes, hollow transparent centers rather than solid white discs. True alpha transparent background, no scenic ground, no figures, weapons, letters, numbers, labels, grid lines or checkerboard. DUAL SWORD WHIRLWIND: cool steel-silver crescent wind trails with a few muted blue accents and dust motes.1 two small intersecting sharp curved slashes,2 lively spiral ring of two sweeping metallic silver arcs,3 broad thinner broken vortex trails,4 dissipating short wisps and specks. Fast blade wind, do not draw literal swords, geometric runes or bright solid discs.

### druidPrimalPulse

元画像 `exec-1e5cc6e8-d120-41e2-a4b0-902a95addcdb.png`。参照なしの新規生成。

> Use case: stylized-concept. Asset type: transparent dark fantasy game VFX animation atlas. Exactly FOUR temporal phases in a precise TWO columns by TWO rows equal square grid, reading order. Each effect centered in its own cell with generous20percent transparent margins, absolutely NO overlap or clipping. Same fixed camera, slightly overhead. Painterly magical effects readable at70px, textured but clear silhouettes, hollow transparent centers rather than solid white discs. True alpha transparent background, no scenic ground, no figures, weapons, letters, numbers, labels, grid lines or checkerboard. PRIMAL NATURE ROAR pulse: emerald green spirit wind with brown leaf fragments and restrained antique gold glints.1 small green curling breath knot,2 expanding hollow organic ring of thin green wind and a few leaves,3 wide broken arcs of nature mist and flying leaf fragments,4 faint scattered leaves and curling wisps dissolving. Distinct organic wisps, not a green floral mandala, no trunk, no character, no animal.

## 検証の最終状況

初回の全体テストは45/46成功。アリーナ側の設定読み込み漏れを修正し、`arena-engine.html` と `dps-engine.html` に共通のモーション設定を追加した。再実行中に実行環境が切断されたが、2026-10-12に復旧後、最新mainのPR #190を取り込んだコミット `e0a5139251c96b05ba3422ba5e677956cb4b3ac9` を独立した作業ディレクトリへ取得し、`node tools/run-tests.js` を最初から最後まで実行。**46/46すべて成功**。

新規 `warrior-motion-test.js` も成功。パラディン・バーバリアン・ドルイド・蒐集者について実攻撃、技別再生、持続オーラ、左右のFX、変身/解除、足元、気絶、画像未読込、能力/ダメージ維持を確認。完成画像23枚の透明背景・破損・寸法、および5つの姿・15動作の共通描画も確認済み。

最新mainのPR #190（おすすめ装備のソケット評価修正）を取り込み、HANDOFFの同時追記は両方保持。SPEC・optimizerとそのテストは最新mainのまま保持し、今回の全体テストにはその変更も含む。
