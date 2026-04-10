import {
  GachaLineupEntry,
  GachaLobbySnapshot,
  LoadGachaLobbyUseCase,
} from '@/usecases/gacha-room/load-gacha-lobby-usecase';
import {
  GachaPiece,
  RollGachaInput,
  RollGachaResult,
  RollGachaUseCase,
} from '@/usecases/gacha-room/roll-gacha-usecase';

function formatPieceRateFromLineup(lineup: GachaLineupEntry[]): string {
  const total = lineup.reduce((sum, e) => sum + Math.max(0, e.weight), 0);
  if (total <= 0) return '';
  return lineup
    .map((e) => `${e.char}${Math.round((Math.max(0, e.weight) / total) * 100)}%`)
    .join('・');
}

const ukanmuriLineup: GachaLineupEntry[] = [
  { char: '歩', name: '歩', rarity: 'N', weight: 45, description: '歩通貨が1増える。' },
  { char: '金', name: '金', rarity: 'N', weight: 25, description: '金通貨が1増える。' },
  { char: '定', name: '定', rarity: 'R', weight: 10, description: '相手の戦略を固定しろ。' },
  { char: '安', name: '安', rarity: 'R', weight: 10, description: '敵の駒を安くする。' },
  {
    char: '室',
    name: '室',
    rarity: 'SR',
    weight: 7,
    description: 'セーフルームを用意して「王」を守る。',
  },
  { char: '宋', name: '宋', rarity: 'UR', weight: 3, description: '味方に繁栄をもたらす。' },
];

const hiHenLineup: GachaLineupEntry[] = [
  { char: '歩', name: '歩', rarity: 'N', weight: 45, description: '歩通貨が1増える。' },
  { char: '金', name: '金', rarity: 'N', weight: 25, description: '金通貨が1増える。' },
  {
    char: '爆',
    name: '爆',
    rarity: 'UR',
    weight: 5,
    description: '爆発で周囲の敵駒を吹き飛ばす破壊的な駒。',
  },
  { char: '煽', name: '煽', rarity: 'SR', weight: 10, description: '相手を煽りたい人の為に。' },
  { char: '灯', name: '灯', rarity: 'R', weight: 15, description: '闘心に火を付けろ。' },
];

const shinnyoLineup: GachaLineupEntry[] = [
  { char: '歩', name: '歩', rarity: 'N', weight: 45, description: '歩通貨が1増える。' },
  { char: '金', name: '金', rarity: 'N', weight: 25, description: '金通貨が1増える。' },
  { char: '辺', name: '辺', rarity: 'SR', weight: 7, description: '盤面の辺を利用した戦略。' },
  { char: '逸', name: '逸', rarity: 'R', weight: 10, description: '敵駒を盤面から逸脱させる。' },
  { char: '進', name: '進', rarity: 'R', weight: 10, description: '次はどこに進んでいくのか。' },
  {
    char: '逃',
    name: '逃',
    rarity: 'UR',
    weight: 3,
    description: '移動すると味方の王も同じ方向へ逃がす緊急離脱の駒。',
  },
];

const kanken1Lineup: GachaLineupEntry[] = [
  { char: '歩', name: '歩', rarity: 'N', weight: 66, description: '歩通貨が1増える。' },
  { char: '金', name: '金', rarity: 'N', weight: 25, description: '金通貨が1増える。' },
  {
    char: '艸',
    name: '艸',
    rarity: 'UR',
    weight: 3,
    description: '草の力を操り盤面を支配する自然の駒。',
  },
  { char: '閹', name: '閹', rarity: 'UR', weight: 3, description: '敵の動きを封じる封印の駒。' },
  {
    char: '膠',
    name: '膠',
    rarity: 'SSR',
    weight: 3,
    description: '盤面を膠着させ敵の動きを止める粘着の駒。',
  },
];

const banners: GachaLobbySnapshot['banners'] = [
  {
    key: 'ukanmuri',
    name: 'うかんむりガチャ',
    rareRateText: 'UR 3% / SSR 8%',
    pieceRateText: formatPieceRateFromLineup(ukanmuriLineup),
    description: '定・室・安・宋・歩・金のいずれかがランダムで排出されます。',
    lineup: ukanmuriLineup,
    pawnCost: 30,
    goldCost: 0,
  },
  {
    key: 'hiHen',
    name: 'ひへんガチャ',
    rareRateText: 'UR 4% / SSR 10%',
    pieceRateText: formatPieceRateFromLineup(hiHenLineup),
    description: '歩・金・爆・煽・灯のいずれかがランダムで排出されます。',
    lineup: hiHenLineup,
    pawnCost: 30,
    goldCost: 0,
  },
  {
    key: 'shinnyo',
    name: 'しんにょうガチャ',
    rareRateText: 'UR 3% / SSR 9%',
    pieceRateText: formatPieceRateFromLineup(shinnyoLineup),
    description: '歩・金・辺・逸・進・逃のいずれかがランダムで排出されます。',
    lineup: shinnyoLineup,
    pawnCost: 30,
    goldCost: 0,
  },
  {
    key: 'kanken1',
    name: '漢検１級ガチャ',
    rareRateText: 'UR 7% / SSR 15%',
    pieceRateText: formatPieceRateFromLineup(kanken1Lineup),
    description: '歩・金・艸・閹・膠のいずれかがランダムで排出されます。',
    lineup: kanken1Lineup,
    usesGold: true,
    pawnCost: 0,
    goldCost: 1,
  },
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
  hiHen: {
    hitRate: 0.3,
    goldFailRate: 0.25,
    pawnFailReward: 6,
    goldFailReward: 1,
    pieces: [
      {
        char: '歩',
        name: '歩',
        rarity: 'N',
        weight: 45,
        description: '歩通貨が1増える。',
        isCurrency: true,
        currencyType: 'pawn',
      },
      {
        char: '金',
        name: '金',
        rarity: 'N',
        weight: 25,
        description: '金通貨が1増える。',
        isCurrency: true,
        currencyType: 'gold',
      },
      {
        char: '爆',
        name: '爆',
        rarity: 'UR',
        weight: 5,
        description: '爆発で周囲の敵駒を吹き飛ばす破壊的な駒。',
      },
      { char: '煽', name: '煽', rarity: 'SR', weight: 10, description: '相手を煽りたい人の為に。' },
      { char: '灯', name: '灯', rarity: 'R', weight: 15, description: '闘心に火を付けろ。' },
    ],
  },
  ukanmuri: {
    hitRate: 0.3,
    goldFailRate: 0.2,
    pawnFailReward: 5,
    goldFailReward: 1,
    pieces: [
      {
        char: '歩',
        name: '歩',
        rarity: 'N',
        weight: 45,
        description: '歩通貨が1増える。',
        isCurrency: true,
        currencyType: 'pawn',
      },
      {
        char: '金',
        name: '金',
        rarity: 'N',
        weight: 25,
        description: '金通貨が1増える。',
        isCurrency: true,
        currencyType: 'gold',
      },
      { char: '定', name: '定', rarity: 'R', weight: 10, description: '相手の戦略を固定しろ。' },
      { char: '安', name: '安', rarity: 'R', weight: 10, description: '敵の駒を安くする。' },
      {
        char: '室',
        name: '室',
        rarity: 'SR',
        weight: 7,
        description: 'セーフルームを用意して「王」を守る。',
      },
      { char: '宋', name: '宋', rarity: 'UR', weight: 3, description: '味方に繁栄をもたらす。' },
    ],
  },
  shinnyo: {
    hitRate: 0.3,
    goldFailRate: 0.22,
    pawnFailReward: 7,
    goldFailReward: 1,
    pieces: [
      {
        char: '歩',
        name: '歩',
        rarity: 'N',
        weight: 45,
        description: '歩通貨が1増える。',
        isCurrency: true,
        currencyType: 'pawn',
      },
      {
        char: '金',
        name: '金',
        rarity: 'N',
        weight: 25,
        description: '金通貨が1増える。',
        isCurrency: true,
        currencyType: 'gold',
      },
      { char: '辺', name: '辺', rarity: 'SR', weight: 7, description: '盤面の辺を利用した戦略。' },
      {
        char: '逸',
        name: '逸',
        rarity: 'R',
        weight: 10,
        description: '敵駒を盤面から逸脱させる。',
      },
      {
        char: '進',
        name: '進',
        rarity: 'R',
        weight: 10,
        description: '次はどこに進んでいくのか。',
      },
      {
        char: '逃',
        name: '逃',
        rarity: 'UR',
        weight: 3,
        description: '移動すると味方の王も同じ方向へ逃がす緊急離脱の駒。',
      },
    ],
  },
  kanken1: {
    hitRate: 0.3,
    goldFailRate: 0.35,
    pawnFailReward: 10,
    goldFailReward: 2,
    pieces: [
      {
        char: '歩',
        name: '歩',
        rarity: 'N',
        weight: 66,
        description: '歩通貨が1増える。',
        isCurrency: true,
        currencyType: 'pawn',
      },
      {
        char: '金',
        name: '金',
        rarity: 'N',
        weight: 25,
        description: '金通貨が1増える。',
        isCurrency: true,
        currencyType: 'gold',
      },
      {
        char: '艸',
        name: '艸',
        rarity: 'UR',
        weight: 3,
        description: '草の力を操り盤面を支配する自然の駒。',
      },
      {
        char: '閹',
        name: '閹',
        rarity: 'UR',
        weight: 3,
        description: '敵の動きを封じる封印の駒。',
      },
      {
        char: '膠',
        name: '膠',
        rarity: 'SSR',
        weight: 3,
        description: '盤面を膠着させ敵の動きを止める粘着の駒。',
      },
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
    if (!config)
      return { type: 'miss', currency: 'pawn', amount: 5, pawnCurrency: 3005, goldCurrency: 20 };

    if (Math.random() < config.hitRate) {
      const picked = pickWeightedRandom(config.pieces);
      if (picked.isCurrency && picked.currencyType) {
        return {
          type: 'miss',
          currency: picked.currencyType,
          amount: 1,
          pawnCurrency: picked.currencyType === 'pawn' ? 3001 : 3000,
          goldCurrency: picked.currencyType === 'gold' ? 21 : 20,
        };
      }
      return {
        type: 'hit',
        piece: {
          char: picked.char,
          name: picked.name,
          rarity: picked.rarity,
          description: picked.description,
        },
        alreadyOwned: false,
        pawnCurrency: 3000,
        goldCurrency: 20,
      };
    }

    const isGold = Math.random() < config.goldFailRate;
    return {
      type: 'miss',
      currency: isGold ? 'gold' : 'pawn',
      amount: isGold ? config.goldFailReward : config.pawnFailReward,
      pawnCurrency: isGold ? 3000 : 3000 + config.pawnFailReward,
      goldCurrency: isGold ? 20 + config.goldFailReward : 20,
    };
  }
}
