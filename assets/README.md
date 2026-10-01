# assets（画像）

今は絵を使わず、丸や四角で表示しています。

絵に差し替えるときは：
1. 画像（PNG推奨、背景透過）をこのフォルダに入れる。例：`assets/player.png`
2. `data/player.js` や `data/enemies.js` の `image: null` を `image: "assets/player.png"` のように書きかえる

画像が読み込めないときは、自動で丸の表示に戻ります。
