# RaNi Music Stats

ラジオNIKKEI第2「RaNi Music」で流れた曲を記録し、統計と絞り込みができる静的サイトとして公開する。

- 何を作るか：`docs/requirements.md`
- どう作るか：`docs/design.md`

仕様や構成を変えたときは、この2つの文書も合わせて更新する。

## 構成

npm workspaces のモノレポ。Node.js 24 以上。

- `packages/core`：型、曲キーの正規化、公式JSONから曲を取り出す処理、集計。ブラウザと Node の両方で動くコードだけを置く
- `packages/fetcher`：CLI（`tsx` で直接実行する）。公式JSONの取得、iTunes での発表年の検索、サイト用の集計データの生成
- `packages/site`：Vite ＋ React ＋ Chart.js のサイト
- `data/`：記録したデータ。fetch ワークフローが毎日 commit する

## コマンド

```sh
npm test                 # 全パッケージの単体テスト（Vitest）
npm run typecheck        # 全パッケージの型チェック
npm run fetch -- --days 7                              # 直近7日の公式JSONを取得
npm run fetch -- --from 2025-10-10 --to 2026-10-09     # 期間を指定して取得
npm run years -- --max 200                             # 発表年が未検索の曲を iTunes で検索
npm run overrides:draft  # 発表年が不明な曲の下書きを data/year-overrides.draft.json に書き出す
npm run overrides:apply  # 下書きに書いた年を data/year-overrides.json に取り込む
npm run dev              # 集計データを作ってから開発サーバーを起動
npm run build            # 集計データを作ってからサイトをビルド
```

## 守ること

- 公式JSONはファイルに保存しない。`time`・`title`・`artist` だけを取り出して `data/onair/` に保存する
- 外部へのリクエストは間隔を空ける（公式サイト：2秒、iTunes：3.5秒）。間隔を縮めない
- `data/years.json` は手で編集しない。発表年を直すときは `data/year-overrides.json` に書く（不明な曲は `overrides:draft` → 記入 → `overrides:apply` の順で補完できる）
- 曲の同一判定は `songKey`（`packages/core/src/normalize.ts`）に集約する。ほかの場所で独自に正規化しない
