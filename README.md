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
