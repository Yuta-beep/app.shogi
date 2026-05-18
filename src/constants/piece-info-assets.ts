export const pieceInfoAssets = {
  background: require('../../assets/piece-info/piece-info-bg.png'),
  backButton: require('../../assets/piece-info/戻る.png'),
  pieces: {
    香: require('../../assets/piece-info/pieces/香.png'),
    桂: require('../../assets/piece-info/pieces/桂.png'),
    銀: require('../../assets/piece-info/pieces/銀.png'),
    忍: require('../../assets/piece-info/pieces/忍.png'),
    竜: require('../../assets/piece-info/pieces/竜.png'),
  },
} as const;

export const pieceInfoPreloadTargets = [
  pieceInfoAssets.background,
  pieceInfoAssets.backButton,
  ...Object.values(pieceInfoAssets.pieces),
] as const;
