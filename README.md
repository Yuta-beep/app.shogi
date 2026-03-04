# Shogi Mobile App Frontend

Expo + React Native + TypeScript で開発する、将棋モバイルアプリのフロントエンドです。

旧 `SHOGI_GAME` の HTML/CSS を参照しながら、UI起点で段階的に移植しています。

## Tech Stack
- Expo SDK 54
- React Native
- TypeScript
- Expo Router
- NativeWind (Tailwind for React Native)

## Development
### 1. Install
```bash
npm install
```

### 2. Start
```bash
npx expo start
```

キャッシュ起因の不整合が出る場合:
```bash
npx expo start --clear
```

## Current App Flow
- `/` : Title screen
  - Home用アセットを先読み
  - `Loading...` 表示
  - タップで `/home` に遷移
- `/home` : Home screen（再現中）
- その他画面: プレースホルダー導線のみ

## Directory Structure
```text
app/                 # Expo Router routes only
assets/              # Images and static files
src/
  components/
    atom/            # 最小単位のUI部品
    module/          # atomを組み合わせた部品
  constants/         # 定数・アセット参照・モック
  features/          # 機能単位（画面UI本体）
  hooks/             # 共通hooks
docs/                # 開発方針ドキュメント
```

## Architecture Policy
- UIファーストで開発
- `app/` はルーティング定義に限定
- 実画面実装は `src/features/*` に置く
- 共通UIは `src/components/atom|module` に集約
- 依存方向は `UI -> (hooks/useCase/repository...)` を維持

詳細方針:
- `docs/ui-first-development-plan.md`

## Naming Rules
- Feature名はユーザー価値ベース
- 例: `home`, `battle`, `stage-selection`, `deck-builder`, `piece-catalog`, `piece-shop`, `gacha`, `matching`, `player-profile`

## Notes
- Expo 54 は Node の最新メジャーで不安定になる場合があります。
- 可能なら Node 20/22 LTS の利用を推奨します。

