import { normalizeDeckBuilderPieceChar } from '@/features/deck-builder/lib/deck-builder-piece-char';

/** デッキビルダーに表示・配置しない駒（未実装の漢検1級旧枠など） */
export const DECK_BUILDER_EXCLUDED_PIECE_CHARS = new Set(['殲', '賚']);

export function isPieceExcludedFromDeckBuilder(piece: {
  char: string;
  name?: string | null;
}): boolean {
  const ruleChar = normalizeDeckBuilderPieceChar(piece.char, piece.name);
  return DECK_BUILDER_EXCLUDED_PIECE_CHARS.has(ruleChar);
}

export function filterOwnedPiecesForDeckBuilder<T extends { char: string; name?: string | null }>(
  pieces: readonly T[],
): T[] {
  return pieces.filter((piece) => !isPieceExcludedFromDeckBuilder(piece));
}
