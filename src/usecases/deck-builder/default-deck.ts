import type { OwnedPiece, SaveDeckPlacement } from '@/domain/models/deck-builder';

export const DECK_BOARD_ROWS = 4;
export const DECK_BOARD_COLS = 9;
export const MY_DECK_NAME = 'マイデッキ';

type StandardDeckCell = {
  rowNo: number;
  colNo: number;
  aliases: readonly string[];
};

const STANDARD_SHOGI_CELLS: readonly StandardDeckCell[] = [
  { rowNo: 1, colNo: 0, aliases: ['歩'] },
  { rowNo: 1, colNo: 1, aliases: ['歩'] },
  { rowNo: 1, colNo: 2, aliases: ['歩'] },
  { rowNo: 1, colNo: 3, aliases: ['歩'] },
  { rowNo: 1, colNo: 4, aliases: ['歩'] },
  { rowNo: 1, colNo: 5, aliases: ['歩'] },
  { rowNo: 1, colNo: 6, aliases: ['歩'] },
  { rowNo: 1, colNo: 7, aliases: ['歩'] },
  { rowNo: 1, colNo: 8, aliases: ['歩'] },
  { rowNo: 2, colNo: 1, aliases: ['角', '角行'] },
  { rowNo: 2, colNo: 7, aliases: ['飛', '飛車'] },
  { rowNo: 3, colNo: 0, aliases: ['香', '香車'] },
  { rowNo: 3, colNo: 1, aliases: ['桂', '桂馬'] },
  { rowNo: 3, colNo: 2, aliases: ['銀', '銀将'] },
  { rowNo: 3, colNo: 3, aliases: ['金', '金将'] },
  { rowNo: 3, colNo: 4, aliases: ['玉', '王', '玉将', '王将'] },
  { rowNo: 3, colNo: 5, aliases: ['金', '金将'] },
  { rowNo: 3, colNo: 6, aliases: ['銀', '銀将'] },
  { rowNo: 3, colNo: 7, aliases: ['桂', '桂馬'] },
  { rowNo: 3, colNo: 8, aliases: ['香', '香車'] },
];

function isCellInDeckBoard(rowNo: number, colNo: number): boolean {
  return rowNo >= 0 && rowNo < DECK_BOARD_ROWS && colNo >= 0 && colNo < DECK_BOARD_COLS;
}

function hasAlias(piece: OwnedPiece, aliases: readonly string[]): boolean {
  return aliases.some((alias) => piece.char === alias || piece.name.includes(alias));
}

function findPieceForAliases(
  ownedPieces: OwnedPiece[],
  aliases: readonly string[],
): OwnedPiece | null {
  return ownedPieces.find((piece) => hasAlias(piece, aliases)) ?? null;
}

export function createStandardDeckPlacements(
  ownedPieces: OwnedPiece[],
): { rowNo: number; colNo: number; piece: OwnedPiece }[] {
  return STANDARD_SHOGI_CELLS.filter((cell) => isCellInDeckBoard(cell.rowNo, cell.colNo))
    .map((cell) => {
      const piece = findPieceForAliases(ownedPieces, cell.aliases);
      if (!piece) return null;
      return { rowNo: cell.rowNo, colNo: cell.colNo, piece };
    })
    .filter((placement): placement is { rowNo: number; colNo: number; piece: OwnedPiece } => {
      return placement !== null;
    });
}

export function createStandardDeckSavePlacements(ownedPieces: OwnedPiece[]): SaveDeckPlacement[] {
  return createStandardDeckPlacements(ownedPieces)
    .filter((placement) => typeof placement.piece.pieceId === 'number')
    .map((placement) => ({
      rowNo: placement.rowNo,
      colNo: placement.colNo,
      pieceId: placement.piece.pieceId as number,
    }));
}

export function filterDeckBoardPlacements<T extends { row: number; col: number }>(
  placements: T[],
): T[] {
  return placements.filter((placement) => isCellInDeckBoard(placement.row, placement.col));
}
