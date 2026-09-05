# COMIC TROOPERS

スマホ縦持ちで **1分だけ**遊べる、コミック調の 3D シューター。three.js 製。

▶ **https://bubbleshaker.github.io/comic-troopers/**

## 遊び方

- 画面**左半分**をドラッグ → 移動（触れた場所にスティックが出る）
- 画面**右半分**をスワイプ → ダッシュ（発動中は無敵）
- 射撃は**自動**。最も近い敵へロックオンして撃ち続ける

PC では WASD / 矢印キーで移動、Space でダッシュ。

## 開発

```bash
npm install
npm run dev     # 開発サーバ
npm test        # core のロジックテスト
npm run build   # 型チェック + 本番ビルド
```

### 動作確認用のスクリーンショット

```bash
npm run preview                                     # 別ターミナルで
npm run shot -- http://localhost:4173/comic-troopers/ shot.png 8000
```

スマホ相当（390×844）で指定ミリ秒だけ待ってから撮る。ページ内のエラーもそのまま流れる。

## 構成

- `src/core/` — ゲームロジック。**three.js に依存しない**ので Node 上でテストできる
- `src/render/` — three.js の描画。core の状態を読むだけ
- `src/input/` — バーチャルスティックとスワイプ
- `src/ui/` — HUD などの DOM

設計と段取りは [PLAN.md](./PLAN.md)、用語の定義は [CONTEXT.md](./CONTEXT.md) にある。
