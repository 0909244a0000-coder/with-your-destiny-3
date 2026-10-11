# 冥爆術師：モーションと爆炎の生成・組込み

## 保存した素材

- `assets/bombmancer/idle.webp`：仕込みの最初の構え、256×256。
- `assets/bombmancer/walk.webp`：歩行8コマ、2048×256、600msループ。
- `assets/bombmancer/cast.webp`：種を集めて放つ8コマ、2048×256、640ms。通常攻撃は攻撃間隔まで短縮。
- `assets/bombmancer/finale.webp`：静かな指鳴らし8コマ、2048×256、600ms。
- `assets/vfx/bombAshBurstAtlas.webp`：発火/爆炎/灰煙/消散、2×2セル384px、768×768。

全部透過・可逆WebP。追加約1.1MiB。画像生成は組込み image_gen（CLIではない）を使用。人物は元の `player_bombmancer.png` を参照。歩行は最初の生成シートを再編集した。

## 最終プロンプト

### 歩行

> Edit this exact eight-frame walk sheet. Preserve same elegant male feather-shouldered black/plum/gold bombmancer identity and costume, same right-facing overhead 3/4 viewpoint and 4 columns x2rows layout, transparent alpha, fullbody margins. Correct WALK LEG ALTERNATION: currently all8 show nearly the same leg forward. Top row frames1-4: near/right leg is forward then passes backward under body; far/left leg swings forward. Bottom row frames5-8: FAR/LEFT LEG CLEARLY AHEAD of the near leg, near/right leg behind, then far leg passes back and near leg swings forward. Both legs are visible, opposite limbs take turns leading, natural graceful real walking. The apparent lead foot must alternate in frames1 and5, passing legs in3 and7. Stable upper body and forward hand cupping tiny purple ember; subtle coat flow. Do not mirror the character facing direction and do not change face mask feather mantle clothes or body size. Exact same fullbody scale and foot baseline in everycell, plenty space, no clipping, no overlaps, no background no text no floor shadow. Show different leg positions, not eight copies of same pose.

### 仕込み・投擲

> Use case identity-preserve. One game sprite sheet, exactly eight successive animation frames, 4 columns x2 rows equal rectangular cells, transparent alpha background. THE SAME MALE BOMB MAGE in reference: swept black hair, pale ivory halfmask face, white ivory feather shoulder mantle, dark charcoal/plum long tailored coat fine antique gold embroidery, leather boots and gold pocketwatch at belt. Western painted dark fantasy, right-facing 3/4 slight overhead FULLBODY. Animation: PLANTING / THROWING A CURSED SEED. A precise elegant small gesture, calm menacing, no dramatic staff swinging, no gender change. 1 neutral same stance as reference with seed cupped in forward hand; 2 draws hand toward chest, 3 fingers gather around seed, 4 leans slightly and extends forearm toward target, 5 releases seed with open fingertips and assertive forward point, 6 closes hand softly, 7 draws arm back, 8 returns exactly to neutral. Coat and feather secondary movement only, feet grounded. Every frame same anatomical proportions, body scale, coat details and common foot baseline. Tiny purple/amber ember on seed in hand, no large projectile/flame/ground FX baked in. Generous transparent space between figures; full head coat boots fingers entirely visible, no cropping. No scenery, floor, shadows, lettering, dividers or checkerboard. Eight distinct believable sequential poses, same character.

### 指鳴らし

> Use case identity-preserve. Game sprite animation sheet exactly8 successive poses in a 4 columns x2 rows equal-cell grid, genuinely transparent background. Same exact MALE bombmancer from reference: dark swept long hair, pale ivory halfmask face, ivory feather shoulder cape, tailored black plum long embroidered gold coat, brown leather boots, gold pocketwatch at belt. Mature sinister gentleman, refined western dark fantasy painted fullbody, right-facing 3/4 slightly overhead. Animation TERMINAL FINGER SNAP to detonate bombs. Understated controlled menace; no giant fireball and no combat lunge. Sequence 1 calm neutral holding forward hand near sternum; 2 slowly raises hand next to shoulder; 3 thumb and middle finger drawn together; 4 poised fingertips touching ready to snap; 5 SNAP with middle finger sliding to palm and index subtly extended, tiny amber violet spark at fingers; 6 elegant wrist flick outwards; 7 hand lowers toward chest; 8 returns exactly to1. Same planted feet and body size/position in eachcell, slight head turn and cloak response, exact outfit face identity preserved. Clearly distinct finger/forearm gesture to read at small game size, no anatomical hand glitches or extra fingers. Eight total fullbody figures, generous empty transparent margins in every cell, boots coat and fingers entirely visible, no overlaps or cropping, no floor shadows no text no lines no background or checkerboard. Light at fingertips minimal, bigger FX rendered separately.

### 爆炎

> Use case stylized-concept. One game VFX animation sprite sheet exactly FOUR temporal phases in a precise 2 columns by2 rows equal square cells. A CURSED BOMB EXPLOSION, western dark fantasy oil-painted magical blast with violet purple core, orange amber embers and charcoal ash smoke. True transparent background, NO opaque colored square behind cells, no checkerboard. Viewed slightly overhead at a blast centered on ground plane, no ground surface drawn. Each effect centered within own equal cell, full diffuse edges within margin, no overlap. Reading order: upper left1 compact white-violet ignition spark with restrained tiny orange wisps; upper right2 powerful expanding asymmetric purple-orange fire bloom with rolling layered dark ash, shards and sparks; lower left3 broad rolling charcoal plum ash cloud, thinner orange rim embers and purple filaments; lower right4 dissipating soft fine grey-violet ash curls with a handful fading orange embers, center nearly transparent. Same burst evolving over time, not four unrelated designs. Clear shapes readable at80px, rich painterly textures and depth but avoid bright solid white disk. Dynamic violent but tasteful, smoke remains charcoal not a featureless white fog. No character no weapon no letters no UI no gridlines no background scenery. Square sheet. Four isolated equal-size cells with generous transparent space.

## 準備と検証

シートの境界に入り込んだ隣セルの切れ端は、主な人物のアルファ連結成分から切り分けて除去。上体を基準に左右を合わせ、共通縮尺と足元を保持。手元の座標をセルごとに設定した。元の参照静止画は未読込代替として維持。

ソーサレスの共通アニメーション描画を利用するため、新しいscriptの追加なし。本編/アリーナ/DPSで同じ描画を使う。手元の火種・閃光と床の煙/輪は既存画像を活用。爆炎は専用4コマを既存補間で描く。性能と保存は変更しない。実際の爆発と指鳴らしの完了は完全同期ではない。

`bombmancer-motion-test.js` は実際の死の種/終幕からのモーション選択、通常攻撃による中断防止、順次再生、歩行、左右反転での手/床、控えめ濃度、描画による状態不変、4コマ切出しと表示サイズ上限、時限の新爆炎と終幕の輪の区別、ダメージ/能力値維持、未読込代替を確認する。既存 `bombmancer-test.js` の252構成も成功。ブラウザの共通描画で仕込みと指鳴らしの手元/床を目視確認した。
