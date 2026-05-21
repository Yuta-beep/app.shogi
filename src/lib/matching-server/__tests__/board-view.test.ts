import { boardPiecesFromState, handSummary } from '@/lib/matching-server/board-view';

describe('matching-server board-view', () => {
  it('parses board cells from server state', () => {
    const pieces = boardPiecesFromState({
      version: 1,
      turn: 'black',
      board: {
        '7g': 'black:FU',
        '3c': 'white:OU',
      },
      hands: { black: {}, white: {} },
    });

    expect(pieces).toEqual([
      { row: 2, col: 6, side: 'white', pieceCode: 'OU' },
      { row: 6, col: 2, side: 'black', pieceCode: 'FU' },
    ]);
  });

  it('summarizes hand pieces', () => {
    expect(
      handSummary(
        {
          black: { FU: 2, OU: 1 },
          white: {},
        },
        'black',
      ),
    ).toBe('FU×2, OU×1');
  });
});
