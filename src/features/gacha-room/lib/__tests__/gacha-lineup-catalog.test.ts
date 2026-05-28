import { enrichGachaBanner, UKANMURI_GACHA_LINEUP } from '@/constants/gacha-lineup-catalog';
import {
  gachaLineupDropRatePercent,
  gachaLineupWeightTotal,
} from '@/features/gacha-room/lib/gacha-lineup-rates';
import type { GachaBanner } from '@/usecases/gacha-room/load-gacha-lobby-usecase';

describe('gacha-lineup-catalog ukanmuri', () => {
  const total = gachaLineupWeightTotal(UKANMURI_GACHA_LINEUP);

  it('has the specified piece drop rates', () => {
    const rate = (char: string) =>
      gachaLineupDropRatePercent(UKANMURI_GACHA_LINEUP.find((e) => e.char === char)!, total);

    expect(rate('室')).toBe(7);
    expect(rate('定')).toBe(10);
    expect(rate('安')).toBe(10);
    expect(rate('宋')).toBe(3);
    expect(rate('歩')).toBe(45);
    expect(rate('金')).toBe(25);
  });

  it('fills empty API lineup from catalog', () => {
    const apiBanner: GachaBanner = {
      key: 'ukanmuri',
      name: 'うかんむりガチャ',
      rareRateText: '',
      pieceRateText: '',
      description: null,
      lineup: [],
      pawnCost: 10,
      goldCost: 0,
    };
    const enriched = enrichGachaBanner(apiBanner);
    expect(enriched.lineup).toHaveLength(6);
    expect(enriched.lineup.map((e) => e.char)).toEqual(['室', '定', '安', '宋', '歩', '金']);
  });
});
