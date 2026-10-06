# 防御・支援エフェクトの組み込み（Codex、2026-10-06）

## 続きの範囲
ユーザー指定：「作業が中断してて続きから」。前回PR #114の主力7枚・描画を引き継ぎ、進行中の防御/支援5枚を組み込んで確認する。前回の絵は描き直していない。戦闘/回復/対人補正/セーブ/操作の仕様は変更しない。

## 変更と根拠
従来src/render.js.drawPlayerはp.buffがあれば職業に関係なくshieldと円を重ねる。data/vfx.jsでは骨の鎧と樹皮の守りの発動煙がgraveWisp、祈り/力の持続はholyWispを共有。発動絵だけ交換しても、効果中の見た目は同じだったため持続側まで差別化した。

| 技 | 発動/持続の専用画像 | 見た目 |
|---|---|---|
| マナシールド | arcaneBarrierAtlas.webp | 青い曲面と魔力のガラス障壁 |
| 骨の鎧 | boneCarapaceAtlas.webp | 象牙の肋骨と緑の死霊煙 |
| 樹皮の守り | oakBulwarkAtlas.webp | 木板・根・苔の外殻 |
| 祈り | sanctuaryBloomAtlas.webp | 淡緑/白の上向きの回復光 |
| 力 | warEmbersAtlas.webp | 銅赤の細い炎と火花 |

専用防御が読めるときは共通円とshieldを置換。効果中のみ持続2コマを補間し、効果切れ/死亡で描画しない。画像未読込時は従来の盾/輪へ戻る。p.buffには新しい保存情報を足さず、既存の職業/効果状態を読んで描く。オーラは範囲全面を塗る光から術者中心の縦の形へ。祈りの毎秒の共通発動煙は重ねない。範囲/味方支援の計算は従来どおり。

src/vfx.js.drawGroundはctx.globalAlphaを0.9で上書きしていた。アリーナのdata/arena.js.visual.fieldAlpha=0.6が無視されていたため、掛け算へ修正。長く残る火炎床はアリーナで0.9→0.54、PvE通常は0.9を維持。data/vfx.js.groundAlpha=0.9。描画の不具合修正で、ダメージ範囲は変えない。

## 演出の設定と制作
data/vfx.js：castOverridesに3防御の専用画像、buffStylesに職業別の持続絵/sizeRatio1.4〜1.5/alphaFactor0.55〜0.8、auraStylesに祈り110px/力100px/alphaFactor0.7。atlasesの上限は130〜170px、透明度0.7〜0.8、接地点anchorY0.5/0.72。持続周期1.4秒・中間2コマ補間。第1弾のatlasQuietAlpha0.65を継承。画像制作は組み込みimage_gen.imagegen、黒背景2×2連続4コマ。tools/prepare_sprite.pyでシート全体を768×768へ縮小、RGB WebP quality88/method6。1コマ384px、5枚計382,148バイト（約382KB）。前回と合計12枚1,024,660バイト。

## 検証
Playwright/Chromium。390×844、アリーナ画像は1100×900。実行：

```sh
NODE_OPTIONS=--require=/tmp/wyd-playwright-preload.cjs node tools/support-vfx-test.js
NODE_OPTIONS=--require=/tmp/wyd-playwright-preload.cjs node tools/skill-vfx-test.js
NODE_OPTIONS=--require=/tmp/wyd-playwright-preload.cjs node tools/arena-team-test.js
git diff --check
```

- 支援4職の専用画像/持続/コマ切り出し/発動/死亡解除/控えめ/390px、描画による戦闘状態/能力値/セーブの不変を確認。すべて成功。
- 地面描画で入力alpha0.6→描画0.54、描画後は0.6に復帰を確認。
- 専用アリーナ確認は6キャラLv40、3技以上Lv6、HP35%で防御発動条件を作る。3秒進行で5種すべてを検出、原状態不変、例外0。これは演出確認用で勝率の測定ではない。
- 前回7職の命中位置/画像読込、今回を含む12画像の384pxコマ境界・最大2描画/上限140/遅延/有限値/控えめ、実3対3と390pxは成功。
- arena-team-testは通常のLv40/全技Lv6で3編成×3試合、9試合すべてwinner、20.85〜35.60秒。支援範囲/最強オーラ/編成保存/味方攻撃なし/所有者/セーブ分離/390px・48px操作に異常なし。
- results/support-{sorceress,necromancer,druid,paladin,teams}.pngを目視。空いた中心でキャラを読み取れ、障壁/骨/樹皮の材質を分ける。実機iPhone FPSは未測定。環境の日本語フォント不足があるため文字の目視評価は対象外。
- 残り：共通の攻撃/防御/召喚煙、ルーンの形状/属性別、火炎床そのものの立体化。今回全技を刷新したとは扱わない。

## 元画像と生成指示（全文）
元画像は/workspace/scratch/e719226b53b6/generated_images/。最終ファイルは各見出し。transparent_background=false。

### assets/vfx/arcaneBarrierAtlas.webp
元画像：exec-7865f356-d1bb-4277-b156-691d08e1185b.png

```text
Production game VFX animation atlas, Western dark fantasy, gritty painterly, THREE QUARTER overhead camera with real volume through occlusion and side shading. Square image with EXACTLY 2 columns and 2 rows of FOUR equal square cells, chronological frames left to right then top to bottom of ONE effect: protective ice-blue magical barrier: four separated curved glass facets form an open shell, then a complete translucent three-dimensional faceted dome open at front with thin azure glints, then same intact dome with subtly shifted electric glints, then dissolving glass flakes. Very hollow dark center, thin edges, no filled glowing ball, no hexagonal grid. Consistent scale and camera across all cells; all components inside cell; independently centered with at least 12% pure BLACK margin and BLACK gutters. Pure solid black background for additive compositing, all edges black, NO separator lines, NO characters, scenery, text, labels, watermark, borders or icons. At 80px display the silhouette must remain clear. Frame two and three must be nearly identical poses for a seamless persistent loop.
```

### assets/vfx/boneCarapaceAtlas.webp
元画像：exec-ddd8217c-b58c-4a80-b14b-822da8a249e9.png

```text
Production game VFX animation atlas, Western dark fantasy, gritty painterly, THREE QUARTER overhead camera with real volume through occlusion and side shading. Square image with EXACTLY 2 columns and 2 rows of FOUR equal square cells, chronological frames left to right then top to bottom of ONE effect: necromancer bone armor: ivory rib-like crescents assemble into a protective open cage, then stable overlapping curved rib shields with muted jade mist, then same stable rib cage with subtly moving jade wisps, then fading bone fragments. No skull or torso, only ribs forming a volumetric protective shell. Hollow center. Consistent scale and camera across all cells; all components inside cell; independently centered with at least 12% pure BLACK margin and BLACK gutters. Pure solid black background for additive compositing, all edges black, NO separator lines, NO characters, scenery, text, labels, watermark, borders or icons. At 80px display the silhouette must remain clear. Frame two and three must be nearly identical poses for a seamless persistent loop.
```

### assets/vfx/oakBulwarkAtlas.webp
元画像：exec-80bb1130-c0c2-4e42-b34d-5b8514d9e4ed.png

```text
Production game VFX animation atlas, Western dark fantasy, gritty painterly, THREE QUARTER overhead camera with real volume through occlusion and side shading. Square image with EXACTLY 2 columns and 2 rows of FOUR equal square cells, chronological frames left to right then top to bottom of ONE effect: druid protective bark: three rough bark plates and sparse roots emerge around an empty center, then stable open half shell of curved wood and moss with tiny green leaves, then same stable wood shell with leaves gently shifted, then drifting leaves and dissolving roots. Clearly three dimensional rugged brown bark plates, no tree or character, hollow center. Consistent scale and camera across all cells; all components inside cell; independently centered with at least 12% pure BLACK margin and BLACK gutters. Pure solid black background for additive compositing, all edges black, NO separator lines, NO characters, scenery, text, labels, watermark, borders or icons. At 80px display the silhouette must remain clear. Frame two and three must be nearly identical poses for a seamless persistent loop.
```

### assets/vfx/sanctuaryBloomAtlas.webp
元画像：exec-ca808958-5bd8-41d3-a3f9-425ee035f7f2.png

```text
Production game VFX animation atlas, Western dark fantasy, gritty painterly, THREE QUARTER overhead camera with real volume through occlusion and side shading. Square image with EXACTLY 2 columns and 2 rows of FOUR equal square cells, chronological frames left to right then top to bottom of ONE effect: healing aura: sparse mint-green and warm ivory motes rise in three curved ribbons from a small ground ellipse, then stable delicate vertical healing streams with leaf-shaped glimmers, then same streams with glimmers gently shifted, then softly fading motes. No full ring, no opaque central glow, no cross, no symbol. Elegant restrained upward shape. Consistent scale and camera across all cells; all components inside cell; independently centered with at least 12% pure BLACK margin and BLACK gutters. Pure solid black background for additive compositing, all edges black, NO separator lines, NO characters, scenery, text, labels, watermark, borders or icons. At 80px display the silhouette must remain clear. Frame two and three must be nearly identical poses for a seamless persistent loop.
```

### assets/vfx/warEmbersAtlas.webp
元画像：exec-d9fd884a-b851-4d46-92ab-f4fd55da579a.png

```text
Production game VFX animation atlas, Western dark fantasy, gritty painterly, THREE QUARTER overhead camera with real volume through occlusion and side shading. Square image with EXACTLY 2 columns and 2 rows of FOUR equal square cells, chronological frames left to right then top to bottom of ONE effect: attack support aura: copper-red ember streaks rise from three separated dark steel shards at ground level, then stable rugged upward flames shaped like sharp narrow banners, then same stable flame banners with gently shifted ember streaks, then fading scattered red-gold sparks. No actual flag, weapon, rune, full ring or character. Hollow center, restrained dark red light. Consistent scale and camera across all cells; all components inside cell; independently centered with at least 12% pure BLACK margin and BLACK gutters. Pure solid black background for additive compositing, all edges black, NO separator lines, NO characters, scenery, text, labels, watermark, borders or icons. At 80px display the silhouette must remain clear. Frame two and three must be nearly identical poses for a seamless persistent loop.
```

## 引き継ぎ
PR #114（主力7系統）とそれ以前を継承、マージはユーザー。
試遊：https://raw.githack.com/0909244a0000-coder/with-your-destiny-3/codex/support-vfx-depth-2026-10-06/index.html

