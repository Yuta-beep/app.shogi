/** 対局画面用（`assets/stage-shogi/`） */
export const stageShogiBattleAssets = {
  backButton: require('../../assets/stage-shogi/戻る.png'),
  victory: require('../../assets/stage-shogi/勝利.png'),
  /** 盤上の「敗北」用画像（リポジトリでは `敗北.png` ファイル名） */
  defeat: require('../../assets/stage-shogi/敗北.png'),
} as const;

export const stageShogiBattleAssetPreloadTargets = [
  stageShogiBattleAssets.backButton,
  stageShogiBattleAssets.victory,
  stageShogiBattleAssets.defeat,
] as const;
