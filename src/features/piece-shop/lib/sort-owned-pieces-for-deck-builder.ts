import type { OwnedPiece } from '@/domain/models/deck-builder';

/** ショップ購入駒をデッキビルダー一覧の先頭に並べる */
export function sortOwnedPiecesForDeckBuilder(pieces: OwnedPiece[]): OwnedPiece[] {
  const shopPieces = pieces
    .filter((piece) => piece.source === 'shop')
    .sort((a, b) => {
      const aTime = a.acquiredAt ? Date.parse(a.acquiredAt) : 0;
      const bTime = b.acquiredAt ? Date.parse(b.acquiredAt) : 0;
      return bTime - aTime;
    });
  const otherPieces = pieces
    .filter((piece) => piece.source !== 'shop')
    .sort((a, b) => {
      const aTime = a.acquiredAt ? Date.parse(a.acquiredAt) : 0;
      const bTime = b.acquiredAt ? Date.parse(b.acquiredAt) : 0;
      return aTime - bTime;
    });
  return [...shopPieces, ...otherPieces];
}
