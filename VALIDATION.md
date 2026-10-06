# VALIDATION

## 実装内容

- 逆翻訳レベル: 3 / 5 / 8 / 12言語。初期値は5言語。
- 18のGoogle Cloud Translation NMT対応言語を候補化。英語・日本語は経由言語から除外。
- 1ルート内で重複なしのランダム選択。
- 翻訳中表示、現在の中継数、帰国間近メッセージ、戻り結果、言語ルート、折りたたみ式途中結果。
- 再翻訳で入力を保ったまま新しいルートを選択。
- 1回の自動リトライ、18秒タイムアウト、通信失敗/オフライン案内、入力上限3000文字。
- PWA manifest / Service Worker。アプリ画面はキャッシュするが翻訳処理はオンライン必須。
- Google APIキーはWorker Secretに置く設計。Workerは設定済みOriginのみ受け付け、許可したコード以外はGoogle APIへ送らない。

## 翻訳APIと言語

Google Cloud Translation Basic v2を使用。言語コードは公式サポート一覧のNMT対象を参照: https://cloud.google.com/translate/docs/languages

cy, sq, ka, gu, bn, ta, te, sw, ht, et, ne, af, id, km, lo, lv, ml, mr

## 確認結果

- 既存コード: 作業開始時のフォルダに既存ソースなし。
- 3 / 5 / 8 / 12言語: ルート生成関数は各指定数を選び、18候補から重複なく抽出する実装。実Google API実行確認は未実施（認証情報未設定）。
- 再翻訳連打: busyフラグとボタン無効化で同時実行を抑止する実装。
- 通信失敗: 翻訳ごとに最大2回試行、最後は子供向けメッセージを表示する実装。
- オフライン: navigator.onLineで事前案内し、通信中断時もオフライン案内。実機ネットワーク切断試験は未実施。
- Android縦画面: viewport/safe-area対応の縦1カラムレイアウト。Android実機確認は未実施。
- 長文: 3000文字まで入力でき、Workerでも同上限を検証する実装。Google API実送信の確認は未実施。
- 空欄: 翻訳前に入力を促す実装。
- APIキー: ブラウザコードにキーなし。Cloudflare secret binding経由。
- 永続化/ログ: アプリ独自の文章保存・全文ログなし。翻訳本文はGoogle APIへ送られる。

## 未実施・注意

- Cloudflare WorkerとGoogle Cloudの実アカウント設定、デプロイ、Google APIキー発行は利用者側で必要。
- Worker URLの設定後に実翻訳とAndroid実機の表示・通信を確認する必要がある。
- WorkerのOrigin検査は非ブラウザからの悪用を完全に防ぐ認証ではない。Google APIキーのAPI制限、割当、予算通知を併用する。
- オフライン翻訳、履歴、追加ゲーム機能は未実装。
