import { sortOwnedPiecesForDeckBuilder } from '@/features/piece-shop/lib/sort-owned-pieces-for-deck-builder';

describe('sortOwnedPiecesForDeckBuilder', () => {
  it('places shop pieces first with newest shop purchase first', () => {
    const sorted = sortOwnedPiecesForDeckBuilder([
      {
        char: '香',
        name: '香',
        source: 'initial',
        acquiredAt: '2020-01-01T00:00:00.000Z',
        desc: '',
        skill: '',
        move: '',
      },
      {
        char: '走',
        name: '走',
        source: 'shop',
        acquiredAt: '2026-01-02T00:00:00.000Z',
        desc: '',
        skill: '',
        move: '',
      },
      {
        char: '種',
        name: '種',
        source: 'shop',
        acquiredAt: '2026-01-03T00:00:00.000Z',
        desc: '',
        skill: '',
        move: '',
      },
    ]);

    expect(sorted.map((piece) => piece.char)).toEqual(['種', '走', '香']);
  });
});
