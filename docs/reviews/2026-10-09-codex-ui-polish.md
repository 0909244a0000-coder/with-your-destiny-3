# 宝石画面と装備窓の視覚調整

- 基点：`main` `dab82c5`（PR #152まで）。宝石・装備操作がひとつの窓にまとまった後の見せ方を改善。
- 宝石の入口を伝説の宝石と区別する専用の透過絵に変更。生成指示：`A compact cluster of three distinct cut gemstones: ruby red, deep sapphire blue, green emerald, held in a worn antique bronze socket. Western dark fantasy RPG navigation icon, painterly realistic materials, centered bold silhouette readable at 32–48 px, transparent background, no text or frame.` 組み込み画像生成ツールを使用、256px WebPに変換。
- 宝石の窓：検索・絞り込みの下に所持と装着の概要。宝石一覧と合成／再合成の工房を分け、色と余白で能力・個数・操作を読みやすくした。狭い画面では一覧を工房より先に置く。
- 装備の窓：装備情報、主要操作、強化と加工、その他の順に表示。見出しとボタンの焦点表示を追加。画面入口は開いている窓を示す。
- 実画面の確認で初期職の装備窓の肖像が空になることを発見。職業差分ではなく適用済みプレイヤー画像を参照し、表示を修正。
- 続きの調整：Statusでは持ち物一覧を重複表示せず、能力と装備だけを並べる。窓を内容の高さに合わせ、職業の立ち絵を大きく、説明文も表示。戦闘リザルトが元の固定位置に飛び出さないよう窓内に戻す。Bagには従来どおり持ち物を残す。
- 戦闘の挙動・数値は変更しない。スクリプト構文と差分の空白チェック、透過画像の検査、宝石画面（空と所持）のHTML生成、装備窓の操作ボタン生成は成功。`node tools/run-tests.js` は試行したが、実行環境のPlaywright Chromium実行ファイルがなく、各ブラウザテストが起動段階で失敗した。対応版のブラウザ取得もZIP破損のため失敗。公開プレビューで入口と装備窓を目視確認。実機タッチ操作は未確認。
