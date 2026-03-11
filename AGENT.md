# AGENT Guidelines

Codex はこの `AGENT.md` を作業開始時に読むこと。

## 1. 作業開始時の必須確認
- 最初に `README.md` を読む。
- ディレクトリ構成、実行手順、設計方針を確認してから実装に入る。

## 2. アーキテクチャ原則（厳守）
- 現在の責務分離と依存関係に沿って実装する。
- 依存方向は `UI -> UseCase -> Repository(interface) -> DataSource` を守る。
- 画面ルーティングは `src/app`、機能実装は `src/features`、業務ロジックは `src/usecases`、ドメインは `src/domain`、実装詳細は `src/infra` に置く。
- 既存レイヤーを横断する近道実装（責務の混在）は行わない。

## 3. ブランチ運用
- コミット前に、必ず `main` からブランチを切る。
- ブランチ名は `<prefix>/branch-name` 形式にする。
- 例: `feat/update-home-ui`
- `main` へ直接コミットしない。

## 4. コミット運用
- コミットメッセージは必ず 1 行で `<prefix>:message` 形式にする。
- 例: `feat:add home sakura animation`
- 変更内容と無関係な差分はコミットに含めない。

## 5. PR運用
- PR本文は `.github/pull_request_template.md` のテンプレートに必ず従う。
- テンプレートの各項目を空欄にしない。

## 6. Push運用
- push は必ず `personal` と `origin` の両方に行う。
- 片方だけに push して終わらない。

## 7. README更新ルール
- 機能追加や動作要件の変更を行った場合、`README.md` の更新要否を必ず確認する。
- 必要な場合は実装と同じPRに README 更新を含める。
