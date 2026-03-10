# Shogi Mobile App Frontend

将棋モバイルアプリのフロントエンド（Expo + React Native + TypeScript）です。

## 動作環境
- Node.js 20 以上（推奨: 20/22 LTS）
- Bun（推奨）または npm
- Xcode / Android Studio（実機・エミュレータ利用時）

## Tech Stack
- Expo SDK 54
- React Native
- TypeScript
- Expo Router
- NativeWind

## セットアップ
```bash
# 依存関係インストール
bun install
# or
npm install
```

## 環境変数
`.env.example` をコピーして `.env` を作成してください。

```bash
cp .env.example .env
```

主な変数:
- `EXPO_PUBLIC_DATA_SOURCE`
  - `local` または `api`
  - `local`: ローカル固定データ（旧 `mock` も互換で同等動作）
- `EXPO_PUBLIC_API_BASE_URL`
  - API(BFF) のベースURL
  - 実機確認時は `http://<実機のIP>:3000` を使用
  - 例: `http://192.168.1.25:3000`

実機IPの確認:
- macOS: `ipconfig getifaddr en0`（取得できない場合: `ifconfig | grep "inet "`）
- Windows: `ipconfig`（`IPv4 Address` / `IPv4 アドレス` を使用）

## 起動
```bash
# 通常起動
bun run start
# or
npx expo start

# キャッシュクリア
bun run start:clear

# LAN / Tunnel
bun run start:lan
bun run start:tunnel
bun run start:lan:clear
bun run start:tunnel:clear
```

## よく使うコマンド
```bash
# iOS / Android / Web
bun run ios
bun run android
bun run web

# Lint / Format / Typecheck / Test
bun run lint
bun run format
bun run typecheck
bun run test

# CI相当チェック
bun run ci
```

## アーキテクチャ（概要）
依存方向:
`UI -> UseCase -> Repository(interface) -> DataSource(API/Supabase)`

主なディレクトリ:
```text
src/
  app/          # Expo Router のルート定義
  features/     # 画面・機能単位のUIと状態管理
  usecases/     # ユースケース
  domain/       # ドメインモデル・リポジトリIF
  infra/        # DI / Repository実装 / DataSource / HTTP
  components/   # 共通UIコンポーネント
  hooks/        # 共通フック
assets/         # 画像・音声などの静的アセット
```

## 補足
- API モードで動かす場合、backend が `:3000` で起動している必要があります。
- 実機と開発PCは同じネットワークに接続してください。
