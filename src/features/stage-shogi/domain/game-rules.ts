import { MoveVector } from '@/usecases/piece-info/load-piece-catalog-usecase';

export type Side = 'player' | 'enemy';

export type BoardCell = {
  row: number;
  col: number;
};

export type BoardPiece = {
  side: Side;
  row: number;
  col: number;
  pieceCode: string | null;
  char: string;
};

function isInsideBoard(row: number, col: number, boardSize: number) {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function findPieceAt<T extends BoardPiece>(placements: T[], row: number, col: number) {
  return placements.find((piece) => piece.row === row && piece.col === col) ?? null;
}

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

export function sameCell(a: BoardCell, b: BoardCell) {
  return a.row === b.row && a.col === b.col;
}

export function hasKing(placements: BoardPiece[], side: Side) {
  return placements.some(
    (piece) => piece.side === side && (piece.char === '王' || piece.char === '玉'),
  );
}

export function applyPlayerMove<T extends BoardPiece>(
  placements: T[],
  from: BoardCell,
  to: BoardCell,
): T[] {
  const next = placements.filter((piece) => !(piece.row === to.row && piece.col === to.col));
  const movingIndex = next.findIndex(
    (piece) => piece.side === 'player' && piece.row === from.row && piece.col === from.col,
  );
  if (movingIndex < 0) return placements;

  const moving = next[movingIndex];
  next[movingIndex] = { ...moving, row: to.row, col: to.col };
  return next;
}

export function getLegalTargetsFromVectors<T extends BoardPiece>(
  placements: T[],
  piece: T,
  vectors: MoveVector[],
  boardSize = 9,
) {
  const results: BoardCell[] = [];
  const seen = new Set<string>();
  const orient = piece.side === 'player' ? 1 : -1;

  for (const vector of vectors) {
    const maxStep = Math.max(1, vector.maxStep);
    const dx = vector.dx * orient;
    const dy = vector.dy * orient;

    for (let step = 1; step <= maxStep; step += 1) {
      const targetRow = piece.row + dy * step;
      const targetCol = piece.col + dx * step;
      if (!isInsideBoard(targetRow, targetCol, boardSize)) break;

      const occupied = findPieceAt(placements, targetRow, targetCol);
      if (occupied && occupied.side === piece.side) break;

      const key = cellKey(targetRow, targetCol);
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ row: targetRow, col: targetCol });
      }

      if (occupied) break;
    }
  }

  return results;
}
