# スキル発動パーティクル画像

対局画面でスキル発動時に表示するパーティクル（キラキラ・光・煙など）の PNG/WebP を置くフォルダです。

## 配置場所

```
app.shogi/assets/battle/skill-particles/
```

## ファイル名の例

| ファイル名 | 用途 |
|-----------|------|
| `default.png` | 汎用（駒専用が無いときのフォールバック） |
| `sparkle.png` | 汎用キラキラ |
| `piece-幻.png` | 駒「幻」専用（任意） |
| `piece-霧.png` | 駒「霧」専用（任意） |

- 背景透過 PNG 推奨（512×512 前後など、正方形が扱いやすい）
- 追加したら `src/constants/skill-particle-assets.ts` に `require` を追記する

## コード側の登録

`src/constants/skill-particle-assets.ts` の `SKILL_PARTICLE_ASSETS` にキーと `require` を追加します。

```typescript
default: require('../../assets/battle/skill-particles/default.png'),
```

## 表示処理（参考）

現状のスキル発動 UI はトースト文言＋ SE のみです。画像を表示する場合は
`StageShogiSkillToast` または盤面オーバーレイから
`resolveSkillParticleAsset()` で画像ソースを取得して `Image` 表示します。

音声 SE は従来どおり `assets/audio/se/battle/` を使用します（パーティクル画像とは別）。
