import {
  applyPlayerMove,
  BoardPiece,
  getLegalTargetsFromVectors,
  hasKing,
} from '@/features/stage-shogi/domain/game-rules';

function sortCells(cells: { row: number; col: number }[]) {
  return [...cells].sort((a, b) => a.row - b.row || a.col - b.col);
}

describe('stage shogi game rules', () => {
  it('returns legal targets from move vectors and blocks at own piece', () => {
    const placements: BoardPiece[] = [
      { side: 'player', row: 4, col: 4, pieceCode: 'HI', char: '飛' },
      { side: 'player', row: 4, col: 6, pieceCode: 'FU', char: '歩' },
      { side: 'enemy', row: 4, col: 2, pieceCode: 'FU', char: '歩' },
    ];

    const targets = getLegalTargetsFromVectors(
      placements,
      placements[0],
      [
        { dx: 1, dy: 0, maxStep: 8 },
        { dx: -1, dy: 0, maxStep: 8 },
      ],
      9,
    );

    expect(sortCells(targets)).toEqual(
      sortCells([
        { row: 4, col: 5 },
        { row: 4, col: 3 },
        { row: 4, col: 2 },
      ]),
    );
  });

  it('mirrors vector orientation for enemy pieces', () => {
    const placements: BoardPiece[] = [
      { side: 'enemy', row: 4, col: 4, pieceCode: 'FU', char: '歩' },
    ];
    const targets = getLegalTargetsFromVectors(
      placements,
      placements[0],
      [{ dx: 0, dy: -1, maxStep: 1 }],
      9,
    );

    expect(targets).toEqual([{ row: 5, col: 4 }]);
  });

  it('applies player move and captures destination piece', () => {
    const placements: BoardPiece[] = [
      { side: 'player', row: 6, col: 4, pieceCode: 'FU', char: '歩' },
      { side: 'enemy', row: 5, col: 4, pieceCode: 'FU', char: '歩' },
    ];

    const next = applyPlayerMove(placements, { row: 6, col: 4 }, { row: 5, col: 4 });

    expect(next).toEqual([{ side: 'player', row: 5, col: 4, pieceCode: 'FU', char: '歩' }]);
  });

  it('detects game end by king presence', () => {
    const placements: BoardPiece[] = [
      { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王' },
      { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '玉' },
    ];

    expect(hasKing(placements, 'player')).toBe(true);
    expect(hasKing(placements, 'enemy')).toBe(true);
    expect(
      hasKing(
        placements.filter((p) => p.side !== 'enemy'),
        'enemy',
      ),
    ).toBe(false);
  });
});
