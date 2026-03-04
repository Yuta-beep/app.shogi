# AGENT Rules

このリポジトリで作業するエージェントは、以下を必ず守ること。

## 1. README必読
- 作業開始前に `README.md` を必ず読む。
- ディレクトリ構成、設計方針、開発手順を確認してから編集を開始する。

## 2. ブランチ運用（機能単位）
- 作業は必ず機能単位でブランチを切る。
- `main` へ直接コミットしない。
- ブランチ名は機能内容が分かる名前にする。
- 例: `feature/home-ui`, `feature/stage-select-ui`, `fix/title-loading`

## 3. コミット運用（機能単位）
- 変更は機能単位でコミットする。
- 1つのコミットに無関係な変更を混ぜない。
- コミットメッセージは変更意図が分かる内容にする。
- 例: `feat(home): split home screen into sections and parts`

## 4. 追加原則
- `app/` はルーティング定義中心に保つ。
- 実装コードは `src/` 配下（`features`, `components`, `constants`, `hooks`）に置く。
- UIファースト方針は `docs/ui-first-development-plan.md` を参照する。

## 5. 命名規則（必須）
- ブランチは `type/short-description` 形式で命名する。
- `type` は `feat`, `fix`, `refactor`, `chore`, `hotfix` を使用する。
- 例: `fix/ui-update`, `feat/stage-select-ui`, `refactor/home-sections`
- コミットメッセージは `type: summary` 形式で記述する。
- `type` は `feat`, `fix`, `refactor`, `chore`, `hotfix` を使用する。
- 例: `feat: implement stage select ui`, `fix: adjust home header spacing`
