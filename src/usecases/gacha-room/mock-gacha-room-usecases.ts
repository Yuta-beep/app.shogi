import { GachaLobbySnapshot, LoadGachaLobbyUseCase } from '@/usecases/gacha-room/load-gacha-lobby-usecase';
import { GachaPiece, RollGachaInput, RollGachaResult, RollGachaUseCase } from '@/usecases/gacha-room/roll-gacha-usecase';

const banners: GachaLobbySnapshot['banners'] = [
  { key: 'ukanmuri', name: 'うかんむりガチャ', rareRateText: 'UR 3% / SSR 8%' },
  { key: 'hihen', name: 'ひへんガチャ', rareRateText: 'UR 4% / SSR 10%' },
  { key: 'shinnyo', name: 'しんにょうガチャ', rareRateText: 'UR 3% / SSR 9%' },
  { key: 'kanken1', name: '漢検1級ガチャ', rareRateText: 'UR 7% / SSR 15%', usesGold: true },
];

type GachaConfig = {
  hitRate: number;
  goldFailRate: number;
  pawnFailReward: number;
  goldFailReward: number;
  pieces: (GachaPiece & {
    weight: number;
    isCurrency?: boolean;
    currencyType?: 'pawn' | 'gold';
  })[];
};

const GACHA_CONFIGS: Record<string, GachaConfig> = {
  hihen: {
    hitRate: 0.3,
    goldFailRate: 0.25,
    pawnFailReward: 6,
    goldFailReward: 1,
    pieces: [
      { char: '爆', name: '爆', rarity: 'UR', weight: 1, description: '爆発で周囲の敵駒を吹き飛ばす破壊的な駒。' },
      { char: '煽', name: '煽', rarity: 'SR', weight: 2, description: '相手を煽りたい人の為に。' },
      { char: '灯', name: '灯', rarity: 'R', weight: 3, description: '闘心に火を付けろ。' },
    ],
  },
  ukanmuri: {
    hitRate: 0.3,
    goldFailRate: 0.2,
    pawnFailReward: 5,
    goldFailReward: 1,
    pieces: [
      { char: '室', name: '室', rarity: 'SR', weight: 1, description: 'セーフルームを用意して「王」を守る。' },
      { char: '定', name: '定', rarity: 'R', weight: 1, description: '相手の戦略を固定しろ。' },
      { char: '安', name: '安', rarity: 'R', weight: 1, description: '敵の駒を安くする。' },
      { char: '宋', name: '宋', rarity: 'UR', weight: 1, description: '味方に繁栄をもたらす。' },
      { char: '歩', name: '歩', rarity: 'N', weight: 1, description: '歩通貨が1増える。', isCurrency: true, currencyType: 'pawn' },
      { char: '金', name: '金', rarity: 'N', weight: 1, description: '金通貨が1増える。', isCurrency: true, currencyType: 'gold' },
    ],
  },
  shinnyo: {
    hitRate: 0.3,
    goldFailRate: 0.22,
    pawnFailReward: 7,
    goldFailReward: 1,
    pieces: [
      { char: '辺', name: '辺', rarity: 'SR', weight: 2, description: '盤面の辺を利用した戦略。' },
      { char: '逸', name: '逸', rarity: 'R', weight: 3, description: '敵駒を盤面から逸脱させる。' },
      { char: '進', name: '進', rarity: 'R', weight: 3, description: '次はどこに進んでいくのか。' },
      { char: '逃', name: '逃', rarity: 'UR', weight: 1, description: '移動すると味方の王も同じ方向へ逃がす緊急離脱の駒。' },
    ],
  },
  kanken1: {
    hitRate: 0.3,
    goldFailRate: 0.35,
    pawnFailReward: 10,
    goldFailReward: 2,
    pieces: [
      { char: '艸', name: '艸', rarity: 'UR', weight: 1, description: '草の力を操り盤面を支配する自然の駒。' },
      { char: '閹', name: '閹', rarity: 'UR', weight: 1, description: '敵の動きを封じる封印の駒。' },
      { char: '賚', name: '賚', rarity: 'SSR', weight: 1, description: '報酬を与え味方を強化する恩恵の駒。' },
      { char: '殲', name: '殲', rarity: 'SSR', weight: 1, description: '敵を一掃する殲滅の駒。' },
      { char: '膠', name: '膠', rarity: 'UR', weight: 1, description: '盤面を膠着させ敵の動きを止める粘着の駒。' },
    ],
  },
};

function pickWeightedRandom<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export class MockLoadGachaLobbyUseCase implements LoadGachaLobbyUseCase {
  async execute(): Promise<GachaLobbySnapshot> {
    return {
      banners,
      pawnCurrency: 3000,
      goldCurrency: 20,
      history: [],
    };
  }
}

export class MockRollGachaUseCase implements RollGachaUseCase {
  async execute(input: RollGachaInput): Promise<RollGachaResult> {
    const config = GACHA_CONFIGS[input.gachaId];
    if (!config) return { type: 'miss', currency: 'pawn', amount: 5 };

    if (Math.random() < config.hitRate) {
      const picked = pickWeightedRandom(config.pieces);
      if (picked.isCurrency && picked.currencyType) {
        return { type: 'miss', currency: picked.currencyType, amount: 1 };
      }
      return {
        type: 'hit',
        piece: { char: picked.char, name: picked.name, rarity: picked.rarity, description: picked.description },
        alreadyOwned: false,
      };
    }

    const isGold = Math.random() < config.goldFailRate;
    return {
      type: 'miss',
      currency: isGold ? 'gold' : 'pawn',
      amount: isGold ? config.goldFailReward : config.pawnFailReward,
    };
  }
}
