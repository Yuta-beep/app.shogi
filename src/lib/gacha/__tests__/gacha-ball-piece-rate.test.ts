import {
  effectiveGachaPieceWeight,
  pieceRateMultiplierForColorIndex,
} from '@/lib/gacha/gacha-ball-piece-rate';

describe('gacha-ball-piece-rate', () => {
  it('applies color multipliers', () => {
    expect(pieceRateMultiplierForColorIndex(0)).toBe(1);
    expect(pieceRateMultiplierForColorIndex(1)).toBe(1.05);
    expect(pieceRateMultiplierForColorIndex(4)).toBe(1.5);
  });

  it('leaves currency weights unchanged', () => {
    expect(effectiveGachaPieceWeight('歩', 66, 4)).toBe(66);
    expect(effectiveGachaPieceWeight('灯', 15, 1)).toBe(15 * 1.05);
  });
});
