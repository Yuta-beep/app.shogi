const RANKS = 'abcdefghi';

export type BoardCellCoord = {
  row: number;
  col: number;
};

/** USI 風座標（例 `7g`）を 0-based row/col に変換 */
export function parseMatchingSquare(square: string): BoardCellCoord {
  const normalized = square.trim().toLowerCase();
  if (!/^[1-9][a-i]$/.test(normalized)) {
    throw new Error(`invalid square: ${square}`);
  }
  const file = Number.parseInt(normalized[0] ?? '', 10);
  const rank = normalized[1] ?? '';
  return {
    row: RANKS.indexOf(rank),
    col: 9 - file,
  };
}

export function formatMatchingSquare(row: number, col: number): string {
  return `${9 - col}${RANKS[row]}`;
}
