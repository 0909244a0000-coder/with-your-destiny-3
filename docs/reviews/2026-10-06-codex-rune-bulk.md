# ルーン未保護一括分解（2026-10-06 Codex）

- 工房の抽選欄の下に「未保護を一括分解（対象数）」を追加。確認ダイアログで数/欠片返却量/保護対象/不可逆を表示。キャンセルで状態は変わらない。
- 個別と一括で同じcanDiscard判定を使い、ロック/装着/ビルド参照/再抽選結果待ちは除外。確定時も再判定。0件は無効、分解後は保存更新と選択更新、実際の返却量を通知。
- 数値変更なし。返却はdata/runeSkills.js.discardEssence=1を既存どおり使用。保存形式/抽選/戦闘/絵の変更なし。

確認コマンド：
```
NODE_OPTIONS=--require=/tmp/wyd-playwright-preload.cjs node tools/rune-bulk-test.js
NODE_OPTIONS=--require=/tmp/wyd-playwright-preload.cjs node tools/rune-skills-test.js
git diff --check
```
起動補助は環境専用Chromium設定。製品コードに適用しない。

結果：6技のうち保護/装着/ビルド/再抽選待ちの4技は残り、2技だけ削除。欠片10→12。キャンセルでは全状態一致、再実行0件で返却増加なし。保存復元後も技能/欠片/未確定結果維持。全保護解除後は残る4技を分解して欠片16、空リストを正常表示。390px幅で横はみ出しなし、ボタン高さ48px。既存150組合せ/抽選/移行/対人テストも成功、例外0。実機タッチ操作は未測定。

PR #116を継承し、指定ClaudeブランチへPR。マージはユーザー。
