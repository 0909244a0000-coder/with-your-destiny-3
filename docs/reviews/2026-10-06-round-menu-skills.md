# 円形アイコンとSkills専用画面

PR124の続き。Skillsの専用アイコンと共通の円形フレームを組み込み画像生成で作成。出力は `assets/ui/nav-skills.webp` と `assets/ui/nav-ring.webp`、指示は `assets/ui/round-menu-prompts.json`。

全11メニューの名称・ツールチップ・アクセシブル名を英語化。Skillsからスキルを開き、Statusでは能力・装備を表示する。ゲーム全体の翻訳ではなく、今回依頼されたメニューアイコンの表記変更。

Chromiumで6画面サイズの正円・画面内配置・英語ラベルを検証。SkillsとStatusの分離、各画面の入口、ルーン、DPS、旧倉庫の移行と再読込も検証。
