# RaNi Music Stats 設計書

- 版：初版（2026-10-10）
- ステータス：ドラフト
- 何を作るかは `docs/requirements.md`（要件定義書）に書く。この文書は、それをどう実現するかを書く

## 全体はどう動くのか

```
公式オンエアJSON ──┐
                   ├─ fetch ワークフロー（GitHub Actions、平日 20:00 JST）
iTunes Search API ─┘        │
                            │ data/ に commit
                            ▼
                     deploy ワークフロー（ビルド → GitHub Pages）
                            │
                            ▼
                     静的サイト（ブラウザ側で絞り込みと集計）
```

1. fetch ワークフローが、直近7日間のうち未保存の日の公式JSONを取得し、曲の項目だけに削ぎ落として `data/onair/` に保存する
2. 同じワークフローが、発表年が未検索の曲を iTunes Search API で検索し、`data/years.json` を更新する
3. 変更を main に commit し、続けて deploy ワークフローを呼ぶ
4. deploy ワークフローが `data/` を集計してサイトをビルドし、GitHub Pages に配置する
5. サイトは集計済みのJSONを読み込み、絞り込み・並べ替え・棒グラフをブラウザ側で行う

サーバーは持たない。AWS などの外部サービスも使わない。

## 技術スタックは何か

| 用途 | 選択 | 理由 |
|---|---|---|
| 言語 | TypeScript | 取得処理とサイトで、曲の判定と正規化のコードを共有する |
| ランタイム | Node.js 24 | GitHub Actions の `actions/setup-node` で使える |
| パッケージ構成 | npm workspaces | 取得処理（Node）とサイト（ブラウザ）で tsconfig を分ける |
| サイト | Vite ＋ React | 静的サイトの標準的な構成 |
| グラフ | Chart.js（react-chartjs-2） | 横棒グラフが簡単に描ける |
| テスト | Vitest | Vite と同じツールチェーン |
| CI / 定期実行 / 公開 | GitHub Actions ＋ GitHub Pages | 要件定義書のとおり |

## リポジトリはどう構成するのか

```
.
├── data/
│   ├── onair/
│   │   └── 2026/
│   │       └── 2026-10-09.json      # 曲の項目だけに削ぎ落としたデータ（1日1ファイル）
│   ├── years.json                   # iTunes の検索結果と発表年（曲キー → 結果）
│   └── year-overrides.json          # オーナーが手で直した発表年（曲キー → 年）
├── packages/
│   ├── core/                        # 共有ロジック：型、曲キーの正規化、曲の判定、集計
│   ├── fetcher/                     # CLI：公式JSONの取得、iTunes 検索
│   └── site/                        # Vite ＋ React のサイト
├── .github/workflows/
│   ├── fetch.yml                    # 定期取得 → commit → deploy を呼ぶ
│   └── deploy.yml                   # ビルド → GitHub Pages
├── docs/
│   ├── requirements.md
│   └── design.md
├── package.json                     # workspaces の親
└── CLAUDE.md
```

## データはどう持つのか

### オンエアデータ：`data/onair/YYYY/YYYY-MM-DD.json`

公式JSONから、集計に必要な項目だけを取り出して保存する。公式JSONそのものは保存しない。公開されているデータを丸ごと複製して持つことを避けるためである。

```json
{
  "date": "2026-10-09",
  "fetchedAt": "2026-10-09T11:05:00Z",
  "plays": [
    { "time": "08:30:14", "title": "Golden", "artist": "HUNTR/X" },
    { "time": "08:33:20", "title": "A New Day", "artist": "Beverly" }
  ]
}
```

- `plays` には、後述の判定で曲と判断した要素だけを、時刻順に入れる
- 各要素は `time`、`title`、`artist` の3項目だけを持つ。値は公式JSONのまま（正規化しない）。表示に使うためである
- 曲がない日（土日など）は `plays` を空の配列にして保存する。取得済みであることを記録し、翌日以降に取り直さないようにするためである
- 1日あたり約10KB、1年で約2.5MBになる

曲の判定ルールを後から直す必要が出たときは、公式JSONを取り直して作り直す。公式JSONは1年以上前の日付も取得できるので、取り直しは可能である。

#### 公式JSONの形

参考として、公式JSONの各要素の形を記す（2026-10-10 時点）。保存するのは `time`、`title`、`artist` だけである。

```json
{
  "id": "6357396",
  "time": "08:30:14",
  "title": "Golden",
  "artist": "HUNTR/X",
  "url": "",
  "appletrackid": "",
  "lyricsid": "",
  "appletrackurl": "",
  "appleartwork100": ""
}
```

- `id` は「その日の放送1回」に付く番号で、同じ曲でも日によって変わる。曲の同一判定には使えないので、保存しない
- `url` と、`appletrackid` などの Apple Music 用の項目は、調べた範囲では曲の要素ではすべて空だった。保存しない
- 土日は、挨拶文だけの1要素（例：`"title": "よい週末を！", "artist": "RaNi Music♪"`）が返る

### 発表年：`data/years.json`

曲キー（後述）をキーにしたオブジェクト。検索結果がなかった曲も記録し、毎回検索し直さないようにする。

```json
{
  "golden\thuntr/x": {
    "year": 2025,
    "lookedUpAt": "2026-10-10T11:00:00Z",
    "itunes": {
      "trackId": 1820000000,
      "trackName": "Golden",
      "artistName": "HUNTR/X, EJAE, オードリー・ヌナ, REI AMI & KPop Demon Hunters Cast",
      "releaseDate": "2025-06-19"
    }
  },
  "some song\tsome artist": {
    "year": null,
    "lookedUpAt": "2026-10-10T11:00:00Z",
    "itunes": null
  }
}
```

検索結果の `trackName` と `artistName` を残すのは、別の曲がヒットしていないかをオーナーが後から確かめられるようにするためである。

### 手直しした発表年：`data/year-overrides.json`

曲キーをキーに、年だけを持つ。`years.json` より優先する。

```json
{
  "camera\tcharli xcx": 2026
}
```

### 曲キー

曲名とアーティストをそれぞれ次の手順で正規化し、タブ文字でつないだ文字列を曲キーとする。

1. Unicode の NFKC 正規化（全角英数字と記号を半角にする。`／` は `/` になる）
2. 前後の空白を取り除く（公式JSONには `"What Am I "` のように末尾に空白が付く例がある）
3. 連続する空白を1つの半角スペースにする
4. 小文字にする

表示には、正規化前の値のうち、最初に出現したものを使う。

### 曲の判定と番組の区切り

公式JSONには、曲と番組の区切りが同じ配列に混ざっている。次の条件のどちらかを満たす要素を「番組の区切り」とみなし、それ以外を曲とみなす。

- `artist` が時刻の範囲（例：`17:00 〜 17:10`）である
- `artist` が `RaNi Music♪` である

区切りが入るのは、RaNi Music 以外の番組（例：`農のミライ 8:01 〜 8:30`、`判断力の源 15:00 〜 15:03`）と、RaNi Music の開始と終了の挨拶だけである。RaNi Music の各枠（Morning、Day など）には区切りがない。そのため「直前の区切りの番組に属する」とは判定できない。

曲は、`title` に `RaNi Music` を含まない区切りの時刻の範囲に入っているときだけ、集計から除外する。それ以外の曲はすべて RaNi Music の曲として扱う。この判定は取得時（fetcher の `fetch`）に行い、除外した曲と番組の区切りは保存しない。

放送時間は日によって変わる（調べた範囲では、最初の曲が 08:01 の日、09:00 の日、11:30 の日があった）。この判定は放送時間に依存しないので、変動があっても影響を受けない。

2026-10-10 に調べた8日ぶんの公式JSONでは、この条件で除外される曲は0件だった。公式JSONには、はじめから RaNi Music の曲だけが載っていると考えられる。判定は、将来の変化に備えた安全装置として持つ。

### ビルド時に作る集計データ

deploy ワークフローのビルドで、`packages/core` が `data/onair/` と発表年のデータを読み、サイトが読み込む2つのJSONを `packages/site/public/data/` に生成する。

- `songs.json`：曲の配列。各要素は曲キー、表示用の曲名とアーティスト、発表年（不明は `null`）、初回オンエア日、総オンエア回数
- `plays.json`：オンエアの配列。各要素は `[曲の添字, "YYYY-MM-DD", "HH:MM:SS"]`

1年ぶんで曲が約6,000、オンエアが約40,000になる見込みである。この量ならブラウザ側で絞り込んでも問題ない。数年ぶん溜まって重くなったら、年ごとにファイルを分けて読み込む方式に変える。

## 取得処理はどう動くのか

### fetcher CLI

`packages/fetcher` に、次の2つのコマンドを持つ。

**`fetch`：公式JSONを取得して保存する**

- 引数：`--days N`（直近 N 日）または `--from YYYY-MM-DD --to YYYY-MM-DD`
- 日付は JST で計算する
- 対象の日付のうち、ファイルがまだない日を取得する。直近2日は、ファイルがあっても取り直し、削ぎ落とした後の内容が変わっていれば上書きする（当日の訂正を拾うため）
- リクエストの間隔は2秒以上空ける
- レスポンスがJSONの配列でなければ、その日は保存しない。警告を出して続行する
- 取得した配列から、番組の区切りと、RaNi Music 以外の番組の時刻の範囲に入る要素を除き、残った曲の `time`、`title`、`artist` だけを保存する。公式JSONはメモリ上でだけ扱い、ファイルには残さない
- 取得した日のうち、平日なのに集計対象の曲が0件の日が「今日」なら、終了コードを1にする（放送の取得漏れを知らせるため）

**`years`：発表年が未検索の曲を iTunes で検索する**

- `data/onair/` の全曲キーのうち、`years.json` にないキーを対象にする
- `--retry-missing` を付けたときだけ、`year` が `null` の曲も検索し直す
- 検索は `https://itunes.apple.com/search` に `term=<曲名> <アーティスト>`, `country=JP`, `media=music`, `entity=song`, `limit=1` で問い合わせ、1件目の `releaseDate` の年を取る
- リクエストの間隔は3.5秒以上空ける（iTunes Search API の目安は1分に20回）
- 1回の実行で検索する曲数の上限を `--max N` で指定できる

### fetch ワークフロー（`.github/workflows/fetch.yml`）

- 起動：`schedule` で `0 11 * * 1-5`（UTC。JST では平日 20:00）、および手動（`workflow_dispatch`）
- 権限：`contents: write`
- 同時実行の抑止：`concurrency: data` で、手動と定期の実行が重ならないようにする
- 手順
  1. checkout、Node のセットアップ、`npm ci`
  2. `fetch --days 7`
  3. `years --max 200`
  4. `data/` に変更があれば commit し、`git pull --rebase` のうえ push する。commit メッセージは `data: YYYY-MM-DD までのオンエアデータを追加`
  5. 変更があれば deploy ワークフローを `workflow_call` で呼ぶ

`GITHUB_TOKEN` による push は、他のワークフローの `on: push` を起動しない。そのため、deploy は fetch ワークフローから `workflow_call` で明示的に呼ぶ。

### 失敗の通知

ワークフローが失敗すると、GitHub がワークフローファイルを最後に変更した人にメールを送る（GitHub の既定の通知設定）。次の場合に失敗させる。

- 公式JSONの取得が、今日のぶんについて失敗した（HTTP エラー、JSON でない、平日なのに曲が0件）
- push に失敗した

過去の日付の取得失敗は、次回以降の実行で回収できるので、警告にとどめて失敗させない。

### 初回の取り込み

サービス構築時に、オーナーが手元で次を実行し、結果を commit して push する。

```
fetch --from 2025-10-10 --to 2026-10-09      # 約250リクエスト、2秒間隔で約10分
years                                        # 約6,000リクエスト、3.5秒間隔で約6時間
```

`years` は途中で止めても、`years.json` に書いたところまでは保存され、再実行で続きから検索する。

## サイトはどう作るのか

### デプロイ

- deploy ワークフロー（`.github/workflows/deploy.yml`）
  - 起動：main への push（`packages/`, `data/` の変更）、fetch ワークフローからの `workflow_call`、手動
  - 手順：`npm ci` → `core` の集計 → `site` の `vite build` → `actions/upload-pages-artifact` → `actions/deploy-pages`
- GitHub Pages の設定は「GitHub Actions からデプロイ」にする
- 公開URLは `https://expajp.github.io/rani-music-stats/`。Vite の `base` を `/rani-music-stats/` にする

### 画面の構成

1ページで構成する。上から順に次の要素を置く。

1. **絞り込み条件**
   - 期間：開始日と終了日。プリセット（直近7日・30日・90日・全期間）のボタンを置く。初期値は直近30日
   - 曲名：部分一致（正規化してから比較する）
   - アーティスト：部分一致（同上）
   - 発表年：下限と上限。どちらかを入れたら、発表年が不明の曲を除外する
   - 「期間内に初めて流れた曲だけ」のチェックボックス
2. **上位 N 曲の棒グラフ**
   - 横棒グラフ。N は 10・30・50 から選べ、初期値は30
   - 絞り込み条件を反映する
3. **曲の一覧**
   - 列：曲名、アーティスト、発表年（不明は「不明」）、期間内の回数、初回オンエア日
   - 各列で並べ替えられる。初期値は回数の多い順
   - 各行から、その曲のオンエア日時の一覧を開ける

絞り込み条件は URL のクエリに反映し、ブックマークや再読み込みで復元できるようにする。

### 集計の定義

- 期間内の回数：`plays.json` のうち、曲が一致し、日付が期間内のものの件数
- 初回オンエア日：記録している全期間での、その曲の最初のオンエア日。期間の指定に影響されない
- 「期間内に初めて流れた曲」：初回オンエア日が期間内にある曲

## どうテストするのか

- `core`：Vitest で単体テストを書く
  - 曲キーの正規化（全角と半角、空白、大文字と小文字、`／`）
  - 番組の区切りの判定と、RaNi Music 以外の枠の除外
  - 集計（回数、初回オンエア日）
  - フィクスチャは、公式JSONの形をまねて手で作った数件の要素にする。実際の公式JSONはリポジトリに入れない
- `fetcher`：日付の計算と、取得するべき日の判定を単体テストする。HTTP はモックする
- `site`：手動で確認する。自動テストは当面書かない

## 実装の順序

1. リポジトリの土台：npm workspaces、TypeScript、Vitest、CLAUDE.md
2. `core`：型、曲キー、曲の判定、集計、テスト
3. `fetcher`：`fetch` と `years`、テスト
4. 初回の取り込み（手元で実行し、`data/` を commit する）
5. `site`：集計JSONの読み込み、絞り込み、一覧、棒グラフ
6. ワークフロー：deploy → fetch の順に作り、GitHub Pages を有効にする
7. 運用開始。初日の自動実行を確認する

## 設計で決めていないこと

- 曲キーの正規化で、`feat.` や `ft.` の表記ゆれ、括弧付きの副題（`(Remix)` など）をどう扱うか。まず素朴なルールで運用し、重複が目立ったら追加する
- 同じ曲が別名義（例：`スガシカオ×小林武史`）で流れたときの扱い。当面は別の曲として扱う
- 集計データが大きくなったときの分割方法
