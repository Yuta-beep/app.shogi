import { getDisplayCharFromPieceCode } from '@/lib/piece-image-registry';
import {
  CHAR_TO_CODE,
  CODE_TO_CHAR,
  PROMOTED_CODE_TO_CHAR,
} from '@/features/stage-shogi/domain/piece-conversion';
import type { BoardPiece } from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';
import { toBasePieceCode } from '@/ai/model/move';

const LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE: Partial<Record<string, number>> = {
  FU: require('../../../../assets/pieces/promoted/tokin.png'),
  KY: require('../../../../assets/pieces/promoted/narikyo.png'),
  KE: require('../../../../assets/pieces/promoted/narikei.png'),
  GI: require('../../../../assets/pieces/promoted/narigin.png'),
  HI: require('../../../../assets/pieces/promoted/ryuo.png'),
  RYU: require('../../../../assets/pieces/promoted/ryuo.png'),
  KA: require('../../../../assets/pieces/promoted/ryuma.png'),
};

const PROMOTED_DISPLAY_CHARS = new Set([
  'と',
  'と金',
  '杏',
  '圭',
  '全',
  '成香',
  '成桂',
  '成銀',
  '馬',
  '龍',
  '龍王',
  '竜王',
  '龍馬',
]);

const PROMOTED_CHAR_TO_BASE_CODE: Record<string, string> = {
  と: 'FU',
  と金: 'FU',
  杏: 'KY',
  圭: 'KE',
  全: 'GI',
  成香: 'KY',
  成桂: 'KE',
  成銀: 'GI',
  馬: 'KA',
  龍: 'HI',
  龍王: 'HI',
  竜王: 'HI',
  龍馬: 'KA',
};

const VISUAL_PROMOTED_PIECE_CODES = new Set(['TO', 'NY', 'NK', 'NG', 'UM', 'RY']);

export function pieceCharFromCodeForDisplay(
  pieceCode: string,
  side: 'player' | 'enemy',
  promoted: boolean,
) {
  if (promoted && PROMOTED_CODE_TO_CHAR[pieceCode]) {
    return PROMOTED_CODE_TO_CHAR[pieceCode];
  }
  if (pieceCode === 'OU') {
    return side === 'enemy' ? '玉' : '王';
  }
  const fromRegistry = getDisplayCharFromPieceCode(pieceCode);
  if (fromRegistry) return fromRegistry;
  return CODE_TO_CHAR[pieceCode] ?? '?';
}

export function getDisplayChar(piece: BoardPiece) {
  if (piece.promoted && piece.pieceCode && PROMOTED_CODE_TO_CHAR[piece.pieceCode]) {
    return PROMOTED_CODE_TO_CHAR[piece.pieceCode];
  }
  return piece.char ?? (piece.pieceCode ? (CODE_TO_CHAR[piece.pieceCode] ?? '?') : '?');
}

export function isPromotedVisualPiece(piece: BoardPiece) {
  if ((piece.pieceCode?.toUpperCase() ?? '') === 'RYU' && !piece.promoted) {
    return false;
  }
  if (!piece.promoted && piece.char === '竜') {
    return false;
  }
  if (piece.promoted) return true;
  if (PROMOTED_DISPLAY_CHARS.has(piece.char)) return true;
  const pc = piece.pieceCode?.toUpperCase() ?? '';
  if (pc && VISUAL_PROMOTED_PIECE_CODES.has(pc)) return true;
  return false;
}

export function collectStandardBaseCodesForLocalPromotedImage(piece: BoardPiece): string[] {
  const out: string[] = [];
  if (piece.pieceCode) {
    const u = piece.pieceCode.toUpperCase();
    out.push(u);
    const b = toBasePieceCode(u);
    if (b) out.push(b);
  }
  if (piece.char) {
    const fromKanji = CHAR_TO_CODE[piece.char];
    if (fromKanji) {
      out.push(fromKanji);
      const bb = toBasePieceCode(fromKanji);
      if (bb) out.push(bb);
    }
    const fromPromotedKanji = PROMOTED_CHAR_TO_BASE_CODE[piece.char];
    if (fromPromotedKanji) out.push(fromPromotedKanji);
  }
  return out;
}

export function localPromotedModuleFromBaseCodeCandidates(
  candidates: Iterable<string>,
): number | null {
  for (const raw of candidates) {
    if (!raw) continue;
    const u = raw.toUpperCase();
    const mapped = (toBasePieceCode(u) ?? u).toUpperCase();
    const img = LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE[mapped];
    if (img != null) return img;
    if (mapped === 'RY') {
      const alt = LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE.HI ?? LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE.RYU;
      if (alt != null) return alt;
    }
  }
  return null;
}

export function resolvePromotedImageSource(piece: BoardPiece) {
  if ((piece.pieceCode?.toUpperCase() ?? '') === 'RYU' && piece.char === '竜') {
    return null;
  }
  if (!piece.promoted && piece.char === '竜') {
    return null;
  }
  if (!isPromotedVisualPiece(piece)) return null;

  if (piece.promoted) {
    const quick = localPromotedModuleFromBaseCodeCandidates(
      collectStandardBaseCodesForLocalPromotedImage(piece),
    );
    if (quick != null) return quick;
  }

  const pc = piece.pieceCode?.toUpperCase() ?? '';
  const codeFromPiece = toBasePieceCode(piece.pieceCode);
  const codeFromChar = PROMOTED_CHAR_TO_BASE_CODE[piece.char] ?? null;

  let key = codeFromPiece ?? codeFromChar;
  if (!key && (piece.char === '龍' || piece.char === '竜王' || piece.char === '龍王')) {
    key = 'HI';
  }
  if (!key && (pc === 'HI' || pc === 'RY')) {
    key = 'HI';
  }
  if (!key && piece.promoted && piece.char === '飛') {
    key = 'HI';
  }
  if (!key && piece.promoted && piece.char) {
    const fromKanji = CHAR_TO_CODE[piece.char];
    if (fromKanji) {
      key = toBasePieceCode(fromKanji) ?? fromKanji;
    }
  }

  if (!key) return null;
  const fromMap = LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE[key] ?? null;
  if (fromMap != null) return fromMap;

  if (isPromotedVisualPiece(piece) && piece.char) {
    for (const [code, kanji] of Object.entries(PROMOTED_CODE_TO_CHAR)) {
      if (piece.char === kanji) {
        const m = LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE[code];
        if (m != null) return m;
      }
    }
  }

  return null;
}
