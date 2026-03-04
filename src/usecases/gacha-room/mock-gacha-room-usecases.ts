import { GachaLobbySnapshot, LoadGachaLobbyUseCase } from '@/usecases/gacha-room/load-gacha-lobby-usecase';
import { RollGachaInput, RollGachaResult, RollGachaUseCase } from '@/usecases/gacha-room/roll-gacha-usecase';

const banners: GachaLobbySnapshot['banners'] = [
  { key: 'ukanmuri', name: 'うかんむりガチャ', rareRateText: 'UR 3% / SSR 8%' },
  { key: 'hihen', name: 'ひへんガチャ', rareRateText: 'UR 4% / SSR 10%' },
  { key: 'shinnyo', name: 'しんにょうガチャ', rareRateText: 'UR 3% / SSR 9%' },
  { key: 'kanken1', name: '漢検1級ガチャ', rareRateText: 'UR 7% / SSR 15%', usesGold: true },
];

export class MockLoadGachaLobbyUseCase implements LoadGachaLobbyUseCase {
  async execute(): Promise<GachaLobbySnapshot> {
    return {
      banners,
      pawnCurrency: 3000,
      goldCurrency: 20,
      history: ['UR 爆', 'SSR 宇', 'R 安'],
    };
  }
}

export class MockRollGachaUseCase implements RollGachaUseCase {
  async execute(input: RollGachaInput): Promise<RollGachaResult> {
    return {
      success: true,
      label: `UI_ONLY ${input.gachaId}`,
    };
  }
}
