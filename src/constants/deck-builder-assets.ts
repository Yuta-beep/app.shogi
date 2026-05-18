export const deckBuilderAssets = {
  bg: require('../../assets/deck-builder/deck-bg.png'),
  backButton: require('../../assets/deck-builder/戻る.png'),
} as const;

export const deckBuilderPreloadTargets = [
  deckBuilderAssets.bg,
  deckBuilderAssets.backButton,
] as const;
