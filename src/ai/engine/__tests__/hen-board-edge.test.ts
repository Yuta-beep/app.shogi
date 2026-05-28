import { henBoardEdgeCells, pieceOnHenBoardEdge } from '@/ai/engine/hen-board-edge';

describe('hen-board-edge', () => {
  it('lists 9 cells per edge', () => {
    expect(henBoardEdgeCells('top')).toHaveLength(9);
    expect(henBoardEdgeCells('left')).toHaveLength(9);
  });

  it('detects pieces on edge', () => {
    expect(pieceOnHenBoardEdge({ row: 0, col: 4 }, 'top')).toBe(true);
    expect(pieceOnHenBoardEdge({ row: 1, col: 4 }, 'top')).toBe(false);
    expect(pieceOnHenBoardEdge({ row: 4, col: 8 }, 'right')).toBe(true);
  });
});
