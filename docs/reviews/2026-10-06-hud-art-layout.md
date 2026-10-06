# HUDの重なり修正・装飾パネル

HPとCanvas側スキルバーの配置基準が異なり、成長後の長い名前と冒険ログが重なっていた。共通の下部ドックへ移し、ログを通常フローで積むよう変更した。PCの右上操作はゲームの実描画幅に合わせた。

## 確認
- Chromium実ブラウザ、1920×1080・1363×936・1024×768・844×390・768×1024・390×844。
- Lv50、修練133、スキル有効、冒険ログ展開時のHP／スキル／ログの非交差、画面内配置。
- 人物・ルーン・装備・賭け・DPS窓の操作、Escape、背景進行、セーブ再読込。
- ローカルテスト用セーブを使用。ゲームバランス・ユーザーのセーブ形式は変更していない。

## 画像
- 生成画像から透明余白を切り取り、幅1200px以内のWebPへ変換。
- 配置: `assets/ui/combat-panel.webp`。CSSの背景として使用。
- 生成指示: A single wide horizontal empty dark iron and aged muted gold panel, front-facing orthographic flat UI art, restrained gothic corner brackets, tiny dark crimson gemstone centered on upper rim, smooth nearly black interior, thin refined borders, no text/icons/buttons, worn metal, transparent outer background.
