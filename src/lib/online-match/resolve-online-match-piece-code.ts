import { getGachaPieceMeta } from '@/constants/gacha-piece-metadata';
import { CHAR_TO_CODE } from '@/features/stage-shogi/domain/piece-conversion';

/** オンライン対戦の battle-setup / 盤面配置用 pieceCode（BFF カタログキーと一致させる） */
export function resolveOnlineMatchPieceCode(char: string): string {
  const trimmed = char.trim();
  if (!trimmed) return '';
  const gacha = getGachaPieceMeta(trimmed);
  if (gacha?.pieceCode) return gacha.pieceCode.trim().toUpperCase();
  const mapped = CHAR_TO_CODE[trimmed];
  if (mapped) return mapped.toUpperCase();
  return trimmed.toUpperCase();
}
