/** 対局終了オーバーレイ用（`assets/stage-shogi/`） */
export const stageShogiBattleAssets = {
  victory: require('../../assets/stage-shogi/勝利.png'),
  /** 盤上の「敗北」用画像（リポジトリでは `敗北.png` ファイル名） */
  defeat: require('../../assets/stage-shogi/敗北.png'),
} as const;

export const stageShogiBattleAssetPreloadTargets = [
  stageShogiBattleAssets.victory,
  stageShogiBattleAssets.defeat,
] as const;
