export const deckBuilderAssets = {
  bg: require('../../assets/deck-builder/deck-bg.png'),
  backButton: require('../../assets/deck-builder/戻る.png'),
  helpButton: require('../../assets/deck-builder/ヘルプ.png'),
} as const;

export const deckBuilderPreloadTargets = [
  deckBuilderAssets.bg,
  deckBuilderAssets.backButton,
  deckBuilderAssets.helpButton,
] as const;
