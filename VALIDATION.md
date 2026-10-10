# Phase 0.7 Apps Script版 検証記録

判定：**実装・自動テスト済みの接続候補。実翻訳接続待ち。完成条件未達。**
記録日：2026-10-08（日本時間）

## 変更内容

正式ベースは同セッションに残るPhase 0.6のソースと最新版ZIP。既存の入力/結果カード、4レベル、500文字、個人情報注意、途中結果、もう一回、オフライン制御、PWAを維持。Cloudflare方式を採用せず、Apps Script Code.gsへ変更。config.jsのBACKEND_URLだけが接続先設定。

NDJSONストリーミングの代わりに、段階ごとのPOST応答で実翻訳の進捗を更新。サーバーが重複なしルートを選択。署名付き続行情報の前段結果を次段へ渡す。sourceLanguageを毎段明示する。最後にjaへ戻る。

## LanguageAppと言語

公式LanguageApp.translate(text, sourceLanguage, targetLanguage)を確認。APIキー不要の標準サービスを採用。公式参照が案内するコード表も確認したが、参照表だけで今回の実アカウントでの実行成功は判定しない。

候補18言語：マルタmt、ウェールズcy、バスクeu、アイルランドga、アルバニアsq、ジョージアka、アルメニアhy、タミルta、テルグte、グジャラートgu、ベンガルbn、ネパールne、シンハラsi、スワヒリsw、ハイチht、カザフkk、モンゴルmn、エストニアet。

**実際に利用できた言語一覧：まだ未取得。** setupLanguagesは各候補を日本語→候補→日本語で実行し、成功したコードだけをScript Propertiesへ登録する。12候補以上確認できるまでゲームを開始しない。日本語との往復確認は全ての外国語間のペア成功まで保証しない。実行中の失敗は1回再試行後、画面へ復帰する。

## 自動テスト（実行済み）

`node tests/apps-script.mjs`：全件PASS。Node VM内のApps Scriptサービス/DOM/ネットワーク代替を使用するテスト。実Google翻訳ではない。

| 確認 | 結果 |
|---|---|
| 3/5/8/12言語 | 4/6/9/13回、各前段出力が次段入力になり、source/targetが正しく最後jaになることを検証 |
| 桃太郎指定全文 | テストの入力として利用、連鎖の入出力を検証。実際の翻訳変化は未確認 |
| もう一回3回以上 | 各ルートが直前と異なる、重複なし |
| 入力 | 空/型違い/501文字/13経由/英語コード/余分なパラメータを拒否 |
| 続行情報 | 改ざん署名を拒否。任意target指定不可 |
| 失敗 | LanguageApp代替の例外で2回試行後ok:false。技術情報を画面へ出さず再操作可能 |
| レート制限 | 共有POSTカウンター上限で拒否。Lockによる更新保護はコード確認 |
| 表示 | 最終結果・原文/外国語/帰国の途中結果・ルートが表示されることをDOM代替で確認 |
| 連打 | 翻訳中の追加開始なし |
| オフライン | オンライン時hidden、オフライン時だけ案内。復帰イベント後hidden、通信失敗後もボタン復帰 |
| ブラウザ送信設定 | URLに本文なし、POST body、text/plain;charset=UTF-8、mode:cors、credentials:omit、redirect:follow |
| 構文 | app.js、Code.gsのJS構文検査成功 |

## 実翻訳・ブラウザ通信の状態

公開Apps Script Web Appの/exec URL、デプロイ済みプロジェクト、Googleアカウント操作権限がこのセッションにない。LanguageAppの実行環境もローカルにはない。

そのため以下は**全て未実施**：

- 実LanguageAppの各言語成功確認
- 桃太郎3/5/8/12言語の実翻訳、最終日本語の変化、3回再実行の結果差
- GitHub Pages→Apps Scriptの実POST、リダイレクト後のJSON読み取り、CORSレスポンスヘッダーの実測
- Android実機縦画面、通信断/復帰、旧PWAキャッシュからの実更新

接続障害を観測したわけではなく、接続先未提供のため検証できていない。シンプルPOSTはpreflight発生要因を避けるが、CORS成功を保証しない。ContentService/TextOutputのgoogleusercontent.comへのリダイレクトは公式仕様で確認。レスポンスのCORSヘッダーはApps Scriptで任意設定できる前提にしていない。GETヘルスチェックが開けるだけではPOST成功としない。

本文なしのPOST probeを毎プレイ冒頭で行い、応答を読めない場合は入力文送信前に止める。no-cors、JSONP、GETへの本文移動は不使用。CORSの問題が実測された場合、LanguageApp→Cloud Translation APIへの変更だけでは通信境界が変わらず解消しないため、別の接続構成の検討が必要。

## 安全性・保存

APIキー不使用。自動生成署名秘密はScript Propertiesのみ、公開ソース/クライアントへ埋め込まない。ユーザー文章は実行中のメモリとブラウザのPOST/応答にのみ保持。Propertiesに本文、途中、完成文を保存しない。保存はコード一覧、日時、署名秘密、利用回数だけ。console.logは管理用確認の成否・コード・変化の真偽のみ。ユーザー本文のログなし。DB、Spreadsheet、CacheService、ブラウザstorage、分析送信なし。サービス提供者内部の取り扱いはGoogle側の条件に従う。

500文字を両側で検証。開始6回/分、POST80回/分、翻訳予約1000回/24時間。各段階2回予約で最大26回/1プレイ。未許可コード、経由12超、本文/続行情報上限を検証。署名付きトークンは改ざん防止であり暗号化やユーザー認証ではない。15分で失効。トークン再使用による呼び出しも共有上限で制限するが、完全な悪用防止ではない。公開匿名URLのため第三者に共有上限を消費される可能性がある。

広告/SNS/外部チャット/位置/カメラ/マイクなし。作成済みCloud Translationキーや.envをZIPへ同梱しない。

## PWA・Android

kotoba-phase07へキャッシュ更新。旧kotobaキャッシュのみ削除。資産network-first、登録updateViaCache:none/update()、skipWaiting/clients.claim。翻訳POSTと外部Originはキャッシュ対象外。旧ページの実更新は未検証。

Phase 0.6のviewport/safe-area/最大540px縦1カラムを保持。Android実機確認済みとは扱わない。

## 既知の制約と次の確認

- 設定URLは空欄のまま。未設定時は大人に設定を依頼する表示。
- ブラウザ待機45秒。LanguageApp側の個別タイムアウトやブラウザ中断の伝播は指定できず、その1段階がサーバーで続く場合がある。自動で同じPOSTを再送しない。
- Apps Script割当、公開アクセス設定、リダイレクト/CORSに依存。稼働保証なし。
- 実翻訳は原文と同じになる場合があり、誤訳を挿入する偽装なし。
- setupLanguages/verifyGameを実行し、/exec URL設定後、実ブラウザから全条件を確認して記録を更新する。完成判断はその後。

参照：
https://developers.google.com/apps-script/reference/language/language-app
https://developers.google.com/apps-script/reference/content/text-output
https://developers.google.com/apps-script/guides/web
https://developers.google.com/apps-script/guides/services/quotas
