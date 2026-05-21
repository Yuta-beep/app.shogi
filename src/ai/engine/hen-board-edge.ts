/** 将棋盤の辺（9路盤）。 */
export type HenBoardEdge = 'top' | 'bottom' | 'left' | 'right';

export const HEN_BOARD_EDGES: readonly HenBoardEdge[] = ['top', 'bottom', 'left', 'right'];

export function henBoardEdgeCells(edge: HenBoardEdge): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  if (edge === 'top') {
    for (let col = 0; col <= 8; col += 1) out.push({ row: 0, col });
  } else if (edge === 'bottom') {
    for (let col = 0; col <= 8; col += 1) out.push({ row: 8, col });
  } else if (edge === 'left') {
    for (let row = 0; row <= 8; row += 1) out.push({ row, col: 0 });
  } else {
    for (let row = 0; row <= 8; row += 1) out.push({ row, col: 8 });
  }
  return out;
}

export function pieceOnHenBoardEdge(piece: { row: number; col: number }, edge: HenBoardEdge): boolean {
  if (edge === 'top') return piece.row === 0;
  if (edge === 'bottom') return piece.row === 8;
  if (edge === 'left') return piece.col === 0;
  return piece.col === 8;
}

export function parseHenBoardEdge(value: string | null | undefined): HenBoardEdge | null {
  if (value === 'top' || value === 'bottom' || value === 'left' || value === 'right') {
    return value;
  }
  return null;
}
