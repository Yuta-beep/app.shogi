export type BgmTrack =
  | 'title'
  | 'home'
  | 'dungeonSelect'
  | 'battle'
  | 'deckBuilder'
  | 'catalog'
  | 'shop'
  | 'gacha'
  | 'matching'
  | 'onlineBattle'
  | 'specialDungeon';
export type SeTrack = 'tap' | 'confirm' | 'cancel';

export const bgmSources: Record<BgmTrack, number | null> = {
  title: require('../../assets/audio/bgm/title.mp3'),
  home: require('../../assets/audio/bgm/home.mp3'),
  dungeonSelect: require('../../assets/audio/bgm/dungeon-select.mp3'),
  battle: require('../../assets/audio/bgm/battle.mp3'),
  deckBuilder: require('../../assets/audio/bgm/deck-builder.mp3'),
  catalog: require('../../assets/audio/bgm/catalog.mp3'),
  shop: require('../../assets/audio/bgm/shop.mp3'),
  gacha: require('../../assets/audio/bgm/gacha.mp3'),
  matching: require('../../assets/audio/bgm/matching.mp3'),
  onlineBattle: require('../../assets/audio/bgm/online-battle.mp3'),
  specialDungeon: require('../../assets/audio/bgm/special-dungeon.mp3'),
};

export const seSources: Record<SeTrack, number | null> = {
  tap: require('../../assets/audio/se/tap.wav'),
  confirm: require('../../assets/audio/se/confirm.wav'),
  cancel: require('../../assets/audio/se/cancel.wav'),
};
