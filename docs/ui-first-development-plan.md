# UI First Development Plan

## Purpose
このプロジェクトの初期開発は、useCaseやRepositoryの実装より先に、UI（画面と遷移）の設計・実装を優先する。

## Agreement
- 開発の起点は `ui` とする。
- 参考実装は旧 `SHOGI_GAME` の HTML を使う。
- まずは見た目と画面遷移を実装し、データ取得や対局ロジックは後で接続する。

## Reference
- 分析資料: `../repo_core_report_20260304.md`
- 主要参照画面（HTML）
  - `title.html`
  - `home.html`
  - `stage_select.html`
  - `stage_shogi.html`
  - `deck_builder.html`
  - `piece_info.html`
  - `piece_shop.html`
  - `gacha_room.html`
  - `matching.html`
  - `online_battle.html`

## UI Scope (Phase 1)
対象は「画面レイアウト・表示状態・遷移導線」のみ。

### In Scope
- 画面構造の再現（配置、主要要素、モーダル、ボタン）
- 画面遷移（Expo Router）
- ダミーデータによる表示（固定JSON/定数）
- 画面内の基本アニメーション（必要最小限）

### Out of Scope
- AI対戦API接続
- Supabase接続
- 認証
- 永続化
- 本番の対局ルール判定

## Layer Direction
依存方向は UI から内側に向かう設計を維持する。

- `app` -> `features/*/ui` -> `components`
- `hooks`, `usecases`, `repositories`, `infra` は後続フェーズで接続
- UI実装時点で `infra` への直接依存は作らない

## Directory Policy (UI First)

```text
app/
  (routes only)

features/
  <feature>/
    ui/
      screens/
      sections/
      parts/

components/
  common/
  board/
  modals/

constants/
  ui.ts
  mock-data/
```

- `app`: ルーティングと画面エントリのみ。
- `features/<feature>/ui`: 画面固有の表示部品。
- `components`: 複数画面で再利用する部品。
- `constants/ui.ts`: 色、余白、タイポ、角丸、影、レイヤー順、アニメーション時間。
- `constants/mock-data`: UI表示確認用のダミーデータ。

## Screen Build Order
1. `title`
2. `home`
3. `stage_select`
4. `stage_shogi`（表示のみ、操作はダミー）
5. `deck_builder`
6. `piece_info`
7. `piece_shop`
8. `gacha_room`
9. `matching`
10. `online_battle`（表示のみ）

## Implementation Rules
- 既存HTMLのUIを先に忠実再現し、その後にモバイル最適化を行う。
- 画面固有UIを `components` に混在させない。
- 1画面が大きくなったら `sections` と `parts` に分割する。
- 色・余白・文字サイズの直書きを減らし、`constants/ui.ts` を参照する。

## Done Criteria (Phase 1)
- 主要10画面がExpo上で遷移可能。
- 各画面に主要UI要素が揃っている。
- 実データなしでもUI確認ができる。
- 依存方向違反（UIがDB/APIに直接依存）がない。

## Next (After Phase 1)
- UI確定後に hooks/useCase/repository interface を定義する。
- DB（Supabase）とAI APIは、UIを壊さない形で `infra` から接続する。
