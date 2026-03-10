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

### 3. Test
```bash
npm run test
```

## Environment Variables
- `EXPO_PUBLIC_API_BASE_URL`
  - BFF のベースURL（例: `http://localhost:3000`）
- `EXPO_PUBLIC_DATA_SOURCE`
  - `mock` または `api`
  - `api` のとき `UseCase -> Repository -> DataSource(API)` で BFF 接続
  - 未設定時は `mock` 扱い

## Current App Flow
- `/` : Title screen
  - Home用アセットを先読み
  - `Loading...` 表示
  - タップで `/home` に遷移
- `/home` : Home screen（再現中）
- その他画面: プレースホルダー導線のみ

## Directory Structure
```text
assets/              # Images and static files
src/
  app/               # Expo Router routes only
  components/
    atom/            # 最小単位のUI部品
    molecule/        # atomを組み合わせた中位部品
    organism/        # 画面セクション単位の複合UI
    module/          # 互換レイヤー（段階移行用）
  constants/         # 定数・アセット参照・モック
  domain/
    models/          # ドメイン型
    repositories/    # Repository interface
  features/          # 機能単位（画面UI本体）
  hooks/             # 共通hooks
  infra/
    di/              # UseCase factory（mock/api切替）
    http/            # APIクライアント
    datasources/     # HTTP DataSource
    repositories/    # Repository実装
  usecases/          # ユースケース（mock / api 実装）
docs/                # 開発方針ドキュメント
```

## Audio Policy
- 音源は `assets/audio` 配下に配置する
- 推奨構成:
```text
assets/audio/
  bgm/
  se/
```
- 再生実装は `expo-audio` を利用する（`expo-av` は新規採用しない）
- 音源マッピングは `src/constants/audio-assets.ts` で管理する
- 画面ごとのBGM方針（HTML移植ベース）:
  - `title` -> `title`
  - `home` -> `home`
  - `stage-select` -> `dungeonSelect`
  - `stage-shogi` -> `battle`
  - `deck-builder` -> `deckBuilder`
  - `piece-info` -> `catalog`
  - `piece-shop` -> `shop`
  - `gacha-room` -> `gacha`
  - `matching` -> `matching`
  - `online-battle` -> `onlineBattle`
  - `special-dungeon` -> `specialDungeon`

## Architecture Policy
- UIファーストで開発
- `src/app/` はルーティング定義に限定（Expo Router）
- 実画面実装は `src/features/*` に置く
- 共通UIは `src/components/atom|molecule|organism` に集約
- 依存方向は `UI -> UseCase -> Repository(interface) -> DataSource(API)` を維持

詳細方針:
- `docs/ui-first-development-plan.md`

## Naming Rules
- Feature名はユーザー価値ベース
- 例: `home`, `battle`, `stage-selection`, `deck-builder`, `piece-catalog`, `piece-shop`, `gacha`, `matching`, `player-profile`

## Notes
- Expo 54 は Node の最新メジャーで不安定になる場合があります。
- 可能なら Node 20/22 LTS の利用を推奨します。
