import {
  filterOwnedPiecesForDeckBuilder,
  isPieceExcludedFromDeckBuilder,
} from '@/features/deck-builder/lib/deck-builder-excluded-pieces';

describe('deck-builder-excluded-pieces', () => {
  it('excludes 殲 and 賚 from owned piece list', () => {
    const pieces = [
      { char: '逸', name: '逸' },
      { char: '殲', name: '殲' },
      { char: '賚', name: '賚' },
      { char: '膠', name: '膠' },
    ];
    expect(filterOwnedPiecesForDeckBuilder(pieces).map((p) => p.char)).toEqual(['逸', '膠']);
  });

  it('isPieceExcludedFromDeckBuilder returns true only for excluded chars', () => {
    expect(isPieceExcludedFromDeckBuilder({ char: '殲' })).toBe(true);
    expect(isPieceExcludedFromDeckBuilder({ char: '賚' })).toBe(true);
    expect(isPieceExcludedFromDeckBuilder({ char: '灯' })).toBe(false);
  });
});
