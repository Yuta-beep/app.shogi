/** デッキ反映・保存前に駒が必須のマス（将棋の段・筋の1始まり表記）。 */
const REQUIRED_CELLS_1_BASED: readonly { row: number; col: number }[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => ({ row: 7, col })),
  { row: 8, col: 2 },
  { row: 8, col: 8 },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => ({ row: 9, col })),
];

export const DECK_REQUIRED_CELL_MESSAGE = '赤色マスに駒を配置してください';

export type DeckBoardCell = { row: number; col: number };

function toUiCell(oneBased: { row: number; col: number }): DeckBoardCell {
  return { row: oneBased.row - 1, col: oneBased.col - 1 };
}

export const DECK_REQUIRED_UI_CELLS: readonly DeckBoardCell[] =
  REQUIRED_CELLS_1_BASED.map(toUiCell);

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

/** 必須マスのうち、まだ駒が置かれていないマス（UI 0始まり座標）。 */
export function listEmptyRequiredDeckCells(
  placements: ReadonlyArray<{ row: number; col: number }>,
): DeckBoardCell[] {
  const occupied = new Set(placements.map((p) => cellKey(p.row, p.col)));
  return DECK_REQUIRED_UI_CELLS.filter((cell) => !occupied.has(cellKey(cell.row, cell.col)));
}

export function isDeckRequiredFormationComplete(
  placements: ReadonlyArray<{ row: number; col: number }>,
): boolean {
  return listEmptyRequiredDeckCells(placements).length === 0;
}
