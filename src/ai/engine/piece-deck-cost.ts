import { toBasePieceCode } from '@/ai/model';
import { getDeckBuilderPieceCost } from '@/features/deck-builder/lib/deck-builder-piece-cost';
import { CODE_TO_CHAR } from '@/features/stage-shogi/domain/piece-conversion';

/** デッキビルダーと同じコスト表で駒のコストを返す（王・玉は 0）。 */
export function deckBuilderCostForPieceChar(
  char: string | null | undefined,
  nameHint?: string | null,
): number {
  return getDeckBuilderPieceCost(char, nameHint);
}

export function deckBuilderCostForBoardPiece(piece: {
  char: string;
  pieceCode?: string | null;
}): number {
  return deckBuilderCostForPieceChar(piece.char, piece.char);
}

export function deckBuilderCostForHandPieceCode(pieceCode: string): number {
  const base = toBasePieceCode(pieceCode) ?? pieceCode;
  const char = CODE_TO_CHAR[base] ?? base;
  return deckBuilderCostForPieceChar(char, char);
}
