# UI再現ギャップ一覧

作成日: 2026-03-09
調査方法: HTML版（`/SHOGI_GAME/*.html`）と RN実装（`src/features/`）の目視比較

> **スコープ**: UIの再現ギャップのみ。DB接続・データ取得・ゲームロジック正確性は対象外。

---

## ステータス凡例

- `[ ]` 未着手
- `[~]` 部分実装
- `[x]` 完了

---

## HOME (`home.html` → `src/features/home/`)

- [ ] ガチャボール色確認モーダル (`gachaBallImageModal`)
- [ ] 横スクロール特殊駒ショーケース (`horizontalScrollTrack`)
- [ ] 背景駒の浮遊アニメーション
- [ ] 支払いボタンの pulse アニメーション

---

## STAGE SELECT (`stage_select.html` → `src/features/stage-select/`)

- [ ] ロック済みステージの視覚表現（opacity + grayscale の `.locked` スタイル）
- [ ] SVGパス描画アニメーション (`@keyframes pathDraw`, `pathGlow`)
- [ ] ステージ選択時の情報パネル（ステージ名・難易度・報酬表示）
- [~] 「新出駒」バッジ（表示あり、スタイリング不足）
- [ ] パーティクル浮遊アニメーション

---

## STAGE SHOGI (`stage_shogi.html` → `src/features/stage-shogi/`)

- [ ] スキル発動演出オーバーレイ群（各駒スキルごとの演出）
- [ ] 状態異常インジケーター表示

---

## DECK BUILDER (`deck_builder.html` → `src/features/deck-builder/`)

- [ ] 駒詳細オーバーレイ（駒名・スキル説明・移動範囲グリッド・イラスト）
- [ ] デッキ保存UIモーダル（名前入力 → 保存）
- [ ] デッキロードUIモーダル（保存済み一覧・ロード・削除）
- [ ] アンドゥ機能（`undoLastAction`）
- [ ] デフォルトデッキ読込ボタン（確認モーダルつき）

---

## PIECE INFO (`piece_info.html` → `src/features/piece-info/`)

- [ ] 移動範囲グリッド可視化（移動可能マスのビジュアル表示）
- [ ] 下部ナビゲーションフッター（前後ボタン＋駒一覧サムネイル行）
- [ ] 解放条件テキスト表示

---

## PIECE SHOP (`piece_shop.html` → `src/features/piece-shop/`)

- [ ] 駒詳細モーダル（スキル説明・移動範囲・デッキコスト）
- [ ] 購入確認モーダル（はい/いいえ）
- [~] 「購入済み」バッジ（表示あり、スタイリング不足）

---

## GACHA ROOM (`gacha_room.html` → `src/features/gacha-room/`)

- [x] ガチャ演出動画オーバーレイ（expo-video / gacha-miss.mp4・gacha-hit.mp4）
- [x] 結果駒表示オーバーレイ（大きい駒イラスト、タップで閉じる）
- [x] ガチャ結果カード（当たり/はずれ/通貨 を駒画像つきで表示）
- [x] state machine（idle → video → pieceOverlay → done）
- [ ] 排出率バッジ (`hitRateBadge`)
- [ ] ガチャラインナップ表示（収録駒名一覧）

---

## MATCHING (`matching.html` → `src/features/matching/`)

- 大きなギャップなし

---

## ONLINE BATTLE (`online_battle.html` → `src/features/online-battle/`)

- [ ] ホーム退出確認モーダル (`goHomeConfirmOverlay`)
- [ ] ゲームログパネル
- [ ] スキル発動オーバーレイ群（啓発・ハート・転送等）
- [ ] 手駒表示（プレイヤー・相手双方）

---

## TITLE (`title.html` → `app/index.tsx`)

- [ ] グラデーションシフトアニメーション (`@keyframes gradientShift`)
- [ ] タイトルテキストのglow演出
- [ ] スタートボタンの pulse アニメーション
- [ ] タイピングエフェクト
- [ ] パーティクル・スパークル演出
- [ ] チュートリアルボタン（右下）

---

## 横断的ギャップ

### モーダル/オーバーレイ基盤
- [ ] 駒詳細モーダル（Deck Builder・Piece Shop・Piece Info で共通化可能）
- [ ] 確認ダイアログ（購入・デッキ操作・退出等で共通化可能）

### ナビゲーション
- [ ] 各画面のホームへの戻るボタン（Home画面含む一部で未設置）

---

## 優先度まとめ

### HIGH（核心的UI機能）
1. 駒詳細モーダル（Deck Builder / Piece Shop / Piece Info で共通）
2. Deck Builder 保存/ロードUI
3. ガチャ演出オーバーレイ（動画 or アニメーション + 結果表示）
4. 購入確認モーダル（Piece Shop）

### MEDIUM（UX完成度）
5. ステージロック視覚表現
6. 移動範囲グリッド可視化
7. 駒ナビゲーションフッター（Piece Info）
8. ステージ選択情報パネル
9. Online Battle 退出確認・手駒表示・ログパネル

### LOW（装飾アニメーション）
10. パーティクル・sparkle・浮遊アニメーション
11. Glow・pulse・グラデーションシフト
12. SVGパス描画アニメーション
13. チュートリアルボタン（Title）
