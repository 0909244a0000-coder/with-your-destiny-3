# 傀儡師：歩行・操糸・裁断のモーションと終幕の演出

2026-10-12。組み込み先は PR #189 の作業ブランチ。

## 素材

- `assets/puppeteer/{idle,walk,cast,finale}.webp`。待機1コマ・ほか8コマ、256pxセル、足元(128,234)。人物の素材合計360,370バイト。
- `assets/vfx/puppetThreadBurstAtlas.webp`。2×2の4コマ、セル384px、164,878バイト。終幕の人形位置と裁断時の床で使用。
- 元の人物・人形の静止画は残す。人物が未読込のときは旧画像を表示。人形の通常攻撃は既存の攻撃ポーズを使用。

## 生成プロンプト

内蔵 imagegen で作成。元の人物2枚を人物の参照として使用。VFXは新規生成。赤い布の面が強かった初版を不採用にし、透過の隙間を増やした版を採用。

### 歩行

> Use case: stylized-concept. Asset type: transparent RPG sprite animation atlas. Reference image is the exact character identity: hooded dark leather puppeteer with red-lined ragged coat, gold clasps, red threads dangling from fingers. Create 8 consecutive frames of smooth WALK cycle facing right three-quarter view. Exactly 4 columns by 2 rows, equal rectangular cells, reading order left to right. One full body character per cell, identical proportions, camera, feet baseline and scale; generous transparent margins, no cell overlap, no clipping. Left/right leg alternating contact, passing, opposite contact, passing; subtle coat follow-through. Detailed painted dark fantasy game art like reference, visible hands and thread spools. No scenery, puppet, text, numbers, panels, labels, shadows on ground. True transparent background.

### 操糸

> Use case: stylized-concept. Asset type: transparent RPG sprite animation atlas. Reference image is exact character identity: hooded dark leather puppeteer with ragged red-lined coat, gold clasps and red threads from fingers. Create 8 consecutive frames of a theatrical PUPPET CONTROL gesture facing right three-quarter: poised hands, raising both hands, drawing fingers apart, tugging invisible strings with wrists, holding command, lowering hands, recovery, initial stance. Exactly 4 columns by 2 rows, equal cells, reading order left to right. One full body figure per cell; identical camera scale proportions and foot baseline, generous transparent gutters, no overlap or clipping. Detailed painted dark fantasy game art matching reference. Red threads stay close to hands, do not extend beyond cell. No actual puppet, scenery, text, numbers, panels, labels or ground shadow. True transparent background.

### 裁断・終幕

> Use case: stylized-concept. Asset type: transparent RPG sprite animation atlas. Reference image is exact character identity: hooded dark leather puppeteer, red-lined ragged coat, gold clasps and red control threads. Create 8 consecutive frames of dramatic RED THREAD SEVER / FINALE motion facing right three-quarter: arms gathered inward, windup, spreading hands high, crossing forearms sharply, sweeping right hand outward to cut threads, strong extended release, coat follows, settle back. Character silhouette expressive and readable. Exactly 4 columns by 2 rows equal cells, reading order left to right. One full body per cell, fixed camera scale proportions and feet baseline, generous gutters, no overlap or clipping. Painted dark fantasy style matching reference. Threads close to hands, no large effects embedded. No actual puppet, scenery, text, numbers, panels or ground shadow. True transparent background.

### 終幕の赤糸

> Use case stylized-concept. Game VFX atlas, EXACTLY FOUR square frames, 2 columns by2 rows. Transparent background. Delicate magical marionette STRING WEB, made solely of hair-thin glowing dark ruby RED THREADS like loose fishing line, tiny gold sparks at intersections. NOT ribbons, NOT cloth, NO fabric surfaces, NO red discs, NO filled shapes, NO smoke, NO petals, NO solid glow backing. Huge OPEN TRANSPARENT gaps between the few thin threads. Frame1 small tangled red thread knot; frame2 radial thread web expanding in a clean circular shape; frame3 snapped thin strands flying outward; frame4 a few faint curved thread fragments fading. Fine hand painted western dark fantasy texture. Four temporal phases of one effect centered in isolated cells with generous20percent empty alpha gutter. Fully contain effects within each cell, no clipping or overlap. Slight overhead view, no floor. NO text, grid, labels, puppet or human, no opaque backdrop or checkerboard.

## 組み込みと検証

人物は生成4×2シートをセル切り出し、隣セルの切れ端を主なアルファ連結成分から除外し、各動作内の共通縮尺で足元を合わせてWebPに変換。VFXは2×2を384pxセルに縮小、透明余白を確保。8コマの切替は共通プレイヤー描画を使用。新規scriptなし。本編・アリーナ・DPSテストの共通描画で使用。

命の糸・鉄杭・守り・針・絡め糸・身代わり・縫合→操糸。裁断・終幕→裁断動作。手元の光はコマ別の座標に追従し、床は足元に別レイヤーで描く。控えめ表示にも対応。通常攻撃が技の動きを途中で上書きしない。別の動作が同時に発動した場合は順次再生するため、ダメージ発生と動作の完了は完全同期ではない。

HP消費・人形の攻防・召喚数・射程・クールダウン・セーブを変更しない。`puppeteer-motion-test.js` は実際の召喚・裁断・終幕、HP消費、ダメージ、人形破壊、順次再生、中断防止、左右の手/床、控えめ濃度、状態不変、4コマ切出し・サイズ上限、歩行、未読込代替、死亡時のクリアを確認。人物3動作と左右反転・手/床をブラウザの共通描画で目視確認。

全テスト実行時、既存 `arena-rules-test.js` と `collector-test.js` が初回失敗。両方を `node tools/run-tests.js arena-rules collector` で再実行して2/2成功。アリーナは `chase` の比較で、テスト途中の装備差し替え後に更新前の能力値を比較しており、不安定さの原因と推定。蒐集者は単独で失敗を再現できず、乱数を使う戦闘条件が残る。このPRでは戦闘仕様や既存テストを変更していない。

