# ことばの世界旅行（逆翻訳ゲーム Phase 0.5）

日本語を選んだ数だけの外国語へ順番に翻訳し、日本語へ戻す小さなスマートフォン向けゲームです。入力文は画面内の一時状態として扱い、ブラウザ保存や独自ログ送信はしません。

## 使うもの

- フロントエンド: HTML / CSS / JavaScript（GitHub Pages）
- 翻訳: Google Cloud Translation Basic v2
- APIキー保護: Cloudflare WorkerプロキシのSecret
- 対応言語: ウェールズ語 (cy)、アルバニア語 (sq)、ジョージア語 (ka)、グジャラート語 (gu)、ベンガル語 (bn)、タミル語 (ta)、テルグ語 (te)、スワヒリ語 (sw)、ハイチ語 (ht)、エストニア語 (et)、ネパール語 (ne)、アフリカーンス語 (af)、インドネシア語 (id)、クメール語 (km)、ラオ語 (lo)、ラトビア語 (lv)、マラヤーラム語 (ml)、マラーティー語 (mr)。途中に英語・日本語は選びません。

コードはGoogle公式のCloud Translation言語サポート表で確認したNMT対応コードを使用しています。対応状況は更新されることがあるため、運用前に公式表を再確認してください。

## 起動と公開

1. `worker/wrangler.toml` の `ALLOWED_ORIGIN` をGitHub Pagesのオリジンへ変更します。ユーザー名が `example` の場合、通常は `https://example.github.io` です。リポジトリ名までを含めません。
2. Google Cloudでプロジェクトを作成し、課金とCloud Translation APIを有効にします。APIキーはTranslation APIのみに制限し、利用上限・予算アラートも設定してください。
3. Cloudflareへログインし、`worker` で `npx wrangler deploy` を実行します。
4. WorkerのSecretとしてGoogle APIキーを登録します: `npx wrangler secret put GOOGLE_TRANSLATE_KEY`。入力値はプロンプトへ貼り付けます。`wrangler.toml`、JavaScript、GitHubへ書かないでください。
5. `app.js` の `API_BASE` をデプロイされたWorkerのURL（例 `https://kotoba-trip-proxy.<account>.workers.dev`）に置き換えます。`https://SET_YOUR_WORKER_URL` のままでは本番翻訳できません。
6. このフォルダの内容をGitHubリポジトリのルートへ置き、Settings → Pagesから公開します。
7. Android Chromeで公開URLを開き、必要ならブラウザメニューから「ホーム画面に追加」します。

WorkerにはGitHub Pagesの正確なOriginのみ許可させます。ただしOrigin検査だけでサーバー間の不正利用を完全には防げません。Google APIキーのAPI制限とGoogle Cloudの割当・予算アラートを併用してください。キー制限でHTTPリファラーを必須にしないでください（呼び出し元はWorkerです）。

## ローカル確認

Workerの開発用キーを `worker/.dev.vars` に保存し（Gitへ追加しない）、次を実行します。

```sh
cd worker
npx wrangler dev
```

開発時は `app.js` が `http://127.0.0.1:8787` を使います。フロントエンドは別途ローカルHTTPサーバーで開きます。`ALLOWED_ORIGIN` はそのフロントエンドのOriginと一致させてください。

## データ・安全性

- 広告、アカウント、共有、チャット、ランキング、履歴保存はありません。
- フロントエンドは入力文や翻訳結果をLocal Storage等に保存しません。
- Workerは本文を永続保存せず、アプリ側でも全文ログを出しません。翻訳処理のため文章はGoogle Cloud Translationへ送信されます。
- Workerのオリジン制限は一般的なブラウザからの呼び出しを制限します。Google CloudのAPIキー制限・利用割当を必ず併用します。
- PWAのService Workerはアプリ本体ファイルのみキャッシュし、翻訳API通信はキャッシュしません。オフライン翻訳には対応しません。
