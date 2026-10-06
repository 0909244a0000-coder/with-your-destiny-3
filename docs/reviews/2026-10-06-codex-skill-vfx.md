# スキルの見た目と奥行き・第1弾（Codex、2026-10-06）

## 変更と根拠
data/vfx.jsのskillCastではフロストノヴァ/凍てつく檻がiceNovaを共有し、whirl系は静止絵の拡大・回転中心。src/world.jsのwhirlは技を問わず輪と28粒の放射を出していた。竜巻も一枚を回転。7系統の専用4コマ画像と時間補間へ変更した。

| クラス/技 | 専用画像 | 表現 |
|---|---|---|
| バーバリアン・旋風斬 | steelWhirlAtlas.webp | 鋼の重なる刃・砂塵 |
| ソーサレス・フロストノヴァ | frostCrownAtlas.webp | 立つ氷柱・砕ける結晶 |
| ネクロ・骨の嵐/屍爆 | corpseBloomAtlas.webp | 骨片と立ち上る死霊煙 |
| パラディン・天の裁き | holyJudgmentAtlas.webp | 縦の聖光と着弾破片 |
| アサシン・刃の舞 | violetAmbushAtlas.webp | 交差する紫の急襲斬撃 |
| ドルイド・竜巻 | stormColumnAtlas.webp | 前進する立体の風柱 |
| 冥爆術師・時限/地雷/追尾の実爆発 | voidDetonationAtlas.webp | 紅と琥珀の爆煙 |

全63技の置換ではなく、まず主力7系統。旧画像は保存。攻撃範囲/威力/CD/対人補正/セーブ変更なし。視覚乱数消費が減るため、同じ固定乱数による戦闘経過の完全一致は保証しない。

## 演出設定
すべてdata/vfx.jsに置く。atlasesは2列2行/4コマ、alpha0.75〜0.85、maxSize190〜240px、anchorY0.5〜0.8。新規animは0.6秒、刃の舞0.32秒、聖光0.75秒、竜巻ループ0.7秒。atlasQuietAlpha=0.65。新規画像は最大2コマの加算補間、echo/boost多重なし。spawn全体のmaxEffects=140を守る。
専用絵が読める時だけ共通輪/放射粒を置換。遅延旋風も現在位置で描く。屍爆は屍体の地点、天の裁きは設置地点、竜巻は前進地点。術者の足元に同じ絵を重ねない。竜巻は中間2コマを補間ループし、全体を横倒しに回転させない。

## 制作
組み込みimage_gen.imagegenを使用。既存絵の編集ではなく各エフェクトを専用生成。入力シートは1254px前後。prepare_sprite.pyでシート全体を768×768へ縮小、RGB WebP quality88/method6。セルごとのトリミングをせずカメラ/接地点を保持。7枚計642,512バイト（約643KB）、1コマ384px。ファイルはassets/vfx/。コマを切り出して描画し、シート全体を戦闘画面に出さない。

## 検証
実行環境はPlaywright/Chromium、390×844と1100×900。ランチャーのみ /tmp/wyd-playwright-preload.cjs（@sparticuz/chromium、file iframe用disable-web-security）。製品ファイルには設定しない。

```sh
NODE_OPTIONS=--require=/tmp/wyd-playwright-preload.cjs node tools/skill-vfx-test.js
NODE_OPTIONS=--require=/tmp/wyd-playwright-preload.cjs node tools/arena-team-test.js
NODE_OPTIONS=--require=/tmp/wyd-playwright-preload.cjs node tools/rune-skills-test.js
NODE_OPTIONS=--require=/tmp/wyd-playwright-preload.cjs node tools/class-specialization-test.js
git diff --check
```

- 専用画像7/7読み込み、7職の発動/発生地点7/7。屍爆x455と設置聖光x440を確認。各時点の切り出しは384×384で境界内、最大2描画、遅延中描画なし、値は有限。演出上限140、控えめ時の透明度減少を確認。
- 実3対3で鋼/氷/暗殺/聖光/屍爆の専用効果を検出。原セーブ不変、390px横はみ出しなし、例外0。移動竜巻は持続オブジェクトの描画なのでeffects検出の対象外だが、職業別テストで描画を実行。
- arena-team-test：3編成×3試合、全9試合winner、28.40〜36.55秒。味方回復/最強オーラ1つ/持ち主/脱落掃除/編成保存/セーブ分離/390px・48px操作は成功。
- rune-skills-test：150組合せ、抽選/部分再抽選/移行/PvP/390px成功。class-specialization-test：7職の固有挙動/セーブ/移動/死亡解除成功。
- results/skill-vfx-{gallery,teams,390}.pngを目視。輪郭/高さ/色で7系統を分け、HPバーは演出より後に表示。全技ONの3対3では従来の火炎床/オーラがまだ明るいため、次の更新対象。画像一覧の英語は検証用ラベルでゲームへは追加していない。
- 実機iPhoneのFPSは未測定。検証環境の日本語フォント不足でスクリーンショットの文字は四角になるため、文字品質は今回の画像から評価しない。4コマ補間は完全な3Dや骨格アニメではない。

## 生成指示（全文）
元画像は/workspace/scratch/e719226b53b6/generated_images/以下。最終保存先は各見出しのassets/vfx/*Atlas.webp。全てtransparent_background=false。

### assets/vfx/steelWhirlAtlas.webp
元画像：exec-4c748929-8e77-471a-adb8-17ac452946cf.png

```text
Use case: stylized-concept. Asset type: animated VFX sprite atlas for a dark fantasy ARPG. Create a square 2048x2048 production sprite sheet containing exactly 2 columns by 2 rows, FOUR equally sized square frames of ONE steel whirlwind attack progressing in time, read left-to-right top-to-bottom. Each frame centered independently with at least 12% perfectly BLACK empty margin, no connecting artwork across cells, NO dividing lines. Frame1: compact curved steel-blue slash and rising dust; frame2: larger three interwoven bright silver razor crescents spiraling upward around a hollow dark center; frame3: the strongest broad sculptural metallic vortex with shaded trailing smoke, sparks and distinct foreground blades; frame4: separated fading silver arcs and scattered grit. High 3/4 overhead camera, illusion of real depth and volume through occlusion and side lighting, NOT a flat circle icon. Gritty painterly Diablo-like Western dark fantasy. Steel-white and icy blue, restrained warm sparks. Hollow center preserves hero readability. Pure solid BLACK background in every cell, black gutters, black outer edges, no floor, no character, no real weapon object, no lettering, symbols, runes, borders or watermark. Same scale and camera across frames; effect contained inside each cell.
```

### assets/vfx/frostCrownAtlas.webp
元画像：exec-a2266d8b-83d8-436d-8013-10acbe38791b.png

```text
Asset type: animated dark fantasy game VFX atlas. Square sprite sheet, exactly TWO columns by TWO rows, FOUR separate equally sized chronological frames of ONE effect, reading left to right then top to bottom. ice-blue crystalline frost eruption: compact ice needles, then growing jagged crown of translucent ice shards with opaque shaded sides, strongest tall broken glacier crown with flying splinters, then scattered fading ice shards. No snowflake icon. Hollow center. High three-quarter overhead game camera, gritty painterly Western dark fantasy, real volume through occlusion, shaded smoke and side lighting. Every frame independently centered, 12% empty solid BLACK margins, black gutters and black outer edges. No artwork connecting cells, no dividing lines. Pure black background for additive blending. No lettering, symbols, runes, border, watermark or scenery. Consistent camera and coherent time progression; all artwork contained inside each cell.
```

### assets/vfx/corpseBloomAtlas.webp
元画像：exec-7c699e24-453e-470f-8bc0-5ac86ae4e603.png

```text
Asset type: animated dark fantasy game VFX atlas. Square sprite sheet, exactly TWO columns by TWO rows, FOUR separate equally sized chronological frames of ONE effect, reading left to right then top to bottom. necromancer corpse explosion: sickly emerald spectral smoke rising between ivory bone fragments, then expanding fractured rib-like arcs, strongest three-dimensional green death plume and tumbling bone chips, then fading thin spectral tendrils. No skull face, no living character. High three-quarter overhead game camera, gritty painterly Western dark fantasy, real volume through occlusion, shaded smoke and side lighting. Every frame independently centered, 12% empty solid BLACK margins, black gutters and black outer edges. No artwork connecting cells, no dividing lines. Pure black background for additive blending. No lettering, symbols, runes, border, watermark or scenery. Consistent camera and coherent time progression; all artwork contained inside each cell.
```

### assets/vfx/violetAmbushAtlas.webp
元画像：exec-a99e900f-6fa5-426e-afb7-7b65ee31864e.png

```text
Asset type: animated dark fantasy game VFX atlas. Square sprite sheet, exactly TWO columns by TWO rows, FOUR separate equally sized chronological frames of ONE effect, reading left to right then top to bottom. assassin ambush: two sharp violet-white curved claw slashes crossing diagonally in empty air with dark purple shaded trails, then three overlapping offset razored crescent cuts, strongest sculptural crossed slashes with foreground sparks, then separated fading violet streaks. No weapon or character. High three-quarter overhead game camera, gritty painterly Western dark fantasy, real volume through occlusion, shaded smoke and side lighting. Every frame independently centered, 12% empty solid BLACK margins, black gutters and black outer edges. No artwork connecting cells, no dividing lines. Pure black background for additive blending. No lettering, symbols, runes, border, watermark or scenery. Consistent camera and coherent time progression; all artwork contained inside each cell.
```

### assets/vfx/holyJudgmentAtlas.webp
元画像：exec-187ad375-2335-4749-ac61-fdd4b258bbfd.png

```text
Animated dark fantasy game VFX atlas: square sheet, exactly 2 columns and 2 rows, FOUR separate equal chronological frames of ONE effect, left to right then top to bottom: paladin judgment: gold spear of divine light descending vertically onto a small ground ellipse, radiant vertical impact with airborne gold fragments, strongest towering white-gold shaft surrounded by amber smoke and broken golden rays, dissipating embers. Not a circular seal. Three-quarter overhead camera, gritty painterly Western dark fantasy, depth through occlusion and shaded smoke, readable silhouette. Each frame centered, contained within cell, 12% empty pure BLACK margins, black gutters and edges. Pure black background for additive blending. No cell separators, lettering, symbols, runes, border, watermark, characters or scenery. Consistent camera.
```

### assets/vfx/stormColumnAtlas.webp
元画像：exec-24345420-5162-4e47-b186-065a955830f5.png

```text
Animated dark fantasy game VFX atlas: square sheet, exactly 2 columns and 2 rows, FOUR separate equal chronological frames of ONE effect, left to right then top to bottom: druid storm: compact teal-gray wind funnel, tall twisting volumetric tornado with overlapping shaded bands, strongest upright funnel carrying stone chips and cyan lightning filaments, thinning trailing spiral. No flat ground disk. Three-quarter overhead camera, gritty painterly Western dark fantasy, depth through occlusion and shaded smoke, readable silhouette. Each frame centered, contained within cell, 12% empty pure BLACK margins, black gutters and edges. Pure black background for additive blending. No cell separators, lettering, symbols, runes, border, watermark, characters or scenery. Consistent camera.
```

### assets/vfx/voidDetonationAtlas.webp
元画像：exec-178c5255-b711-4cee-8e49-03e8eb09c4ea.png

```text
Animated dark fantasy game VFX atlas: square sheet, exactly 2 columns and 2 rows, FOUR separate equal chronological frames of ONE effect, left to right then top to bottom: alchemist bomb explosion: dark rose-red imploding orb with amber fractures, rupturing charcoal smoke shell, strongest volumetric rose and amber explosion with overlapping smoky lobes and jagged sparks, fading charcoal wisps and red embers. No mushroom cloud. Three-quarter overhead camera, gritty painterly Western dark fantasy, depth through occlusion and shaded smoke, readable silhouette. Each frame centered, contained within cell, 12% empty pure BLACK margins, black gutters and edges. Pure black background for additive blending. No cell separators, lettering, symbols, runes, border, watermark, characters or scenery. Consistent camera.
```

## 試遊と引き継ぎ
PR #113のルーン技能/3対3までを継承。マージはユーザー。
試遊：https://raw.githack.com/0909244a0000-coder/with-your-destiny-3/codex/skill-vfx-depth-2026-10-06/index.html

