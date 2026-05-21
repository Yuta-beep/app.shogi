import {
  HI_HEN_GACHA_LINEUP,
  KANKEN1_GACHA_LINEUP,
  SHINNYO_GACHA_LINEUP,
  UKANMURI_GACHA_LINEUP,
} from '@/constants/gacha-lineup-catalog';
import { isGachaCollectibleChar } from '@/constants/gacha-piece-metadata';
import { formatPieceRateTextFromLineup } from '@/features/gacha-room/lib/gacha-lineup-rates';
import {
  addGachaMockCurrency,
  getGachaMockWallet,
  grantDuplicateGoldReward,
  grantGachaCollectible,
  spendGachaRollCost,
} from '@/features/gacha-room/lib/gacha-mock-store';
import {
  gachaCurrencyRewardAmount,
  lineupToGachaRollPieces,
  type GachaRollPiece,
} from '@/features/gacha-room/lib/gacha-roll-pieces';
import { ApiClientError } from '@/infra/http/api-client';
import { GachaLobbySnapshot, LoadGachaLobbyUseCase } from '@/usecases/gacha-room/load-gacha-lobby-usecase';
import { RollGachaInput, RollGachaResult, RollGachaUseCase } from '@/usecases/gacha-room/roll-gacha-usecase';

export const banners: GachaLobbySnapshot['banners'] = [
  {
    key: 'ukanmuri',
    name: 'うかんむりガチャ',
    rareRateText: 'UR 3% / SR 7%',
    pieceRateText: formatPieceRateTextFromLineup(UKANMURI_GACHA_LINEUP),
    description: '室・定・安・宋・歩・金のいずれかがランダムで排出されます。',
    lineup: UKANMURI_GACHA_LINEUP,
    pawnCost: 30,
    goldCost: 0,
  },
  {
    key: 'hiHen',
    name: 'ひへんガチャ',
    rareRateText: 'UR 4% / SSR 10%',
    pieceRateText: formatPieceRateTextFromLineup(HI_HEN_GACHA_LINEUP),
    description: '歩・金・爆・煽・灯のいずれかがランダムで排出されます。',
    lineup: HI_HEN_GACHA_LINEUP,
    pawnCost: 30,
    goldCost: 0,
  },
  {
    key: 'shinnyo',
    name: 'しんにょうガチャ',
    rareRateText: 'UR 3% / SSR 9%',
    pieceRateText: formatPieceRateTextFromLineup(SHINNYO_GACHA_LINEUP),
    description: '歩・金・辺・逸・進・逃のいずれかがランダムで排出されます。',
    lineup: SHINNYO_GACHA_LINEUP,
    pawnCost: 30,
    goldCost: 0,
  },
  {
    key: 'kanken1',
    name: '漢検１級ガチャ',
    rareRateText: 'UR 7% / SSR 15%',
    pieceRateText: formatPieceRateTextFromLineup(KANKEN1_GACHA_LINEUP),
    description: '歩・金・艸・閹・膠のいずれかがランダムで排出されます。',
    lineup: KANKEN1_GACHA_LINEUP,
    usesGold: true,
    pawnCost: 0,
    goldCost: 1,
  },
];

type GachaConfig = {
  /** HTML 版同様 1 = 毎回排出テーブルから抽選（表示の排出率と一致） */
  hitRate: number;
  goldFailRate: number;
  pawnFailReward: number;
  goldFailReward: number;
  pieces: GachaRollPiece[];
};

const GACHA_CONFIGS: Record<string, GachaConfig> = {
  ukanmuri: {
    hitRate: 1,
    goldFailRate: 0.2,
    pawnFailReward: 5,
    goldFailReward: 1,
    pieces: lineupToGachaRollPieces(UKANMURI_GACHA_LINEUP),
  },
  hiHen: {
    hitRate: 1,
    goldFailRate: 0.25,
    pawnFailReward: 6,
    goldFailReward: 1,
    pieces: lineupToGachaRollPieces(HI_HEN_GACHA_LINEUP),
  },
  shinnyo: {
    hitRate: 1,
    goldFailRate: 0.22,
    pawnFailReward: 7,
    goldFailReward: 1,
    pieces: lineupToGachaRollPieces(SHINNYO_GACHA_LINEUP),
  },
  kanken1: {
    hitRate: 1,
    goldFailRate: 0.35,
    pawnFailReward: 10,
    goldFailReward: 2,
    pieces: lineupToGachaRollPieces(KANKEN1_GACHA_LINEUP),
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
    const { pawnCurrency, goldCurrency } = getGachaMockWallet();
    return {
      banners,
      pawnCurrency,
      goldCurrency,
      history: [],
    };
  }
}

export class MockRollGachaUseCase implements RollGachaUseCase {
  async execute(input: RollGachaInput): Promise<RollGachaResult> {
    const config = GACHA_CONFIGS[input.gachaId];
    if (!config) {
      const wallet = addGachaMockCurrency({ pawn: 5 });
      return {
        type: 'miss',
        currency: 'pawn',
        amount: 5,
        pawnCurrency: wallet.pawnCurrency,
        goldCurrency: wallet.goldCurrency,
      };
    }

    const spent = spendGachaRollCost(input.gachaId);
    if (!spent.ok) {
      throw new ApiClientError({
        code: 'INSUFFICIENT_CURRENCY',
        message: '効果が足りません',
      });
    }

    if (Math.random() < config.hitRate) {
      const picked = pickWeightedRandom(config.pieces);
      if (picked.isCurrency && picked.currencyType) {
        const amount = gachaCurrencyRewardAmount(input.gachaId, picked.currencyType);
        const wallet = addGachaMockCurrency(
          picked.currencyType === 'pawn' ? { pawn: amount } : { gold: amount },
        );
        return {
          type: 'miss',
          currency: picked.currencyType,
          amount,
          pawnCurrency: wallet.pawnCurrency,
          goldCurrency: wallet.goldCurrency,
        };
      }

      const piece = {
        char: picked.char,
        name: picked.name,
        rarity: picked.rarity,
        description: picked.description,
      };

      if (isGachaCollectibleChar(picked.char)) {
        const isNew = grantGachaCollectible(picked.char);
        if (!isNew) {
          const wallet = grantDuplicateGoldReward();
          return {
            type: 'hit',
            piece,
            alreadyOwned: true,
            duplicateGoldGranted: 1,
            pawnCurrency: wallet.pawnCurrency,
            goldCurrency: wallet.goldCurrency,
          };
        }
        const wallet = getGachaMockWallet();
        return {
          type: 'hit',
          piece,
          alreadyOwned: false,
          pawnCurrency: wallet.pawnCurrency,
          goldCurrency: wallet.goldCurrency,
        };
      }
    }

    const isGold = Math.random() < config.goldFailRate;
    const amount = isGold ? config.goldFailReward : config.pawnFailReward;
    const wallet = addGachaMockCurrency(isGold ? { gold: amount } : { pawn: amount });
    return {
      type: 'miss',
      currency: isGold ? 'gold' : 'pawn',
      amount,
      pawnCurrency: wallet.pawnCurrency,
      goldCurrency: wallet.goldCurrency,
    };
  }
}
