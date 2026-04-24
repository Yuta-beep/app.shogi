import { getLocalPieceImageModules, getLocalPieceImageSource } from '@/lib/piece-image-registry';

export type PieceImageLike = {
  pieceId?: number;
  pieceCode?: string | null;
  char?: string | null;
  imageSignedUrl?: string | null;
};

export function resolvePieceImageSource(piece: PieceImageLike): number | null {
  return getLocalPieceImageSource({
    pieceId: piece.pieceId,
    pieceCode: piece.pieceCode,
    char: piece.char,
  });
}

export function listLocalPieceImageModules() {
  return getLocalPieceImageModules();
}
