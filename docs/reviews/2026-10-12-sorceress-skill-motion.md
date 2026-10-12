# ソーサレス専用技の絵とモーション

ユーザー要望：歩行を保ち、メテオの動きを改善し、フロストノヴァを別の動きにし、杖と地面にエフェクトを出す。

## 成果物

- `assets/sorceress/meteor.webp`：8セル×256px。杖を胸元へ引き、高く掲げ、天へ指示し、構えへ戻る。840ms。
- `assets/sorceress/nova.webp`：8セル×256px。杖を前に構え、地面へ突き、冷気を広げ、構えへ戻る。680ms。
- 歩行/通常詠唱の既存ファイルは維持。共通足元(128,234)、透過・可逆WebP。追加約650KiB。
- 炎/冷光は既存fireball/hitIce、床はrageWisp/frostCrownの絵を使い、コマごとの杖座標へ追従。床を人物の後ろ、宝珠を人物の前へ描く。控えめ設定では35%濃度。

## 生成

組込みの image_gen を使用（CLIではない）。見本は painted-v4 の `frames/cast-00.png`。最終メテオは1回目のシートを参照してレイアウト修正、ノヴァは人物参照から生成した。

メテオの最終生成プロンプト：

> Edit this EXACT meteor animation sheet, identity-preserve. Keep all8 poses and same character, 4 columns x2 rows uniform cells, transparent background. Correct the layout: the raised staff in frames3 and4 is CLIPPED at top and other parts nearly touch borders. Redraw all8 figures SMALLER inside their equal cells, each whole figure and complete ornate staff has at least 12% transparent margin on all four sides. Same body scale and feet baseline in every cell. FULL STAFF JEWEL in overhead frames must be completely visible with generous space ABOVE it. Do not crop the staff or shorten the staff. Keep face, hair, exact crimson gold black dress/boots, anatomy and gestures. Neutral1 gather2 raise3 invoke4 direct5 lower6 recover7 neutral8. Refined painterly western darkfantasy. No new background, no lettering, no floor, no bakedin projectiles. Corrected sprite sheet.

ノヴァの最終生成プロンプト：

> Use case: identity-preserve. Game animation sprite sheet: FROST NOVA, exactly eight frames arranged four columns by two rows equal square cells. True transparent background. Same mature sorceress as reference, SAME face and dark chestnut hair and gold hair ornament, crimson black antique-gold corset skirt boots, same ornate long red gold staff. Painterly western dark fantasy, polished controlled powerful gestures. Right-facing 3/4 fullbody, camera and body scale identical all8. Leave at least 15% empty transparent margin inside EACH cell on all sides; full staff and boots MUST fit, no parts touching sheet edges. Her body occupies ONLY middle 55% of cell height. Fullbody. Sequence frames: 1 upright ready, 2 brings staff in front vertically with two hands, 3 lifts staff slightly ready to plant bottom tip, 4 knees flex and strongly plants staff bottom into ground in front-right beside boots with both hands, 5 planted staff, cool cyan magical light runs from shaft down to tip, cloak lifted subtly by expanding cold, 6 planted staff controlled recoil, 7 straightens and raises staff from ground, 8 ready as1. Same staff length and shape, jewel cools to subtle pale cyan during frames3-6 instead of fiery orange. No giant effects baked in, no ground, no ring, no scenery, no projectile. Actual ground effect will be layered separately. Eight successive poses of ONE identical woman with consistent face costume size and grounded foot position, NOT different costumes or characters. No lettering, labels, borders, grids, shadows or background. Clean 4x2 sheet with generous empty spacing.

メテオの生成6番目のコマは杖がセル右端で切れたため不採用。3番目の斜め構えを復帰の途中に再使用。行境界と接地点を個別に確認して切り出し、足元を揃えた。ノヴァの屈む姿は身体を伸ばさずそのまま使用。

## 仕様と検証

専用技は通常の詠唱より優先。同時発動は次の専用技を1件だけ保持。これらは視覚だけで、技の成立、ダメージ、CD、保存形式を変えない。詠唱と命中の完全な時間同期は今回の対象外。

`sorceress-motion-test.js` は通常動作に加え、実際の技成功からの切替、通常攻撃での中断防止、別技の順次再生、杖/床の描画、左向き、控えめ、描画時に戦闘状態を変更しないこと、死亡での停止を確認する。ゲームの描画処理を使った拡大表示で杖の位置と床の重なりも目視確認した。
