import type { PieceCatalogItem } from '@/domain/models/piece';

/** `legal-moves.ts` の CONCAVE_SLIDE_VECTORS と同一（図鑑グリッド用）。 */
const CONCAVE_CATALOG_MOVE_VECTORS: PieceCatalogItem['moveVectors'] = [
  { dx: -1, dy: -1, maxStep: 9 },
  { dx: 1, dy: -1, maxStep: 9 },
  { dx: -1, dy: 0, maxStep: 9 },
  { dx: 1, dy: 0, maxStep: 9 },
  { dx: 0, dy: 1, maxStep: 9 },
  { dx: -1, dy: 1, maxStep: 9 },
  { dx: 1, dy: 1, maxStep: 9 },
];

const CONCAVE_CATALOG_MOVE_TEXT =
  '斜め前・左右・後ろ・斜め後の各筋に何マスでも進める。盤の端が空マスで、進路上に敵駒がいないとき、味方駒を飛び越えてその端まで進める（前方への直進の筋を除く）。貫通で端へ入る着手では敵駒を取れない。';

function isConcaveCatalogPiece(piece: PieceCatalogItem): boolean {
  const code = (piece.pieceCode ?? '').toUpperCase();
  return piece.char === '凹' || code.includes('CONCAVE') || code.includes('48204DCCFA56');
}

function isSearCatalogPiece(piece: PieceCatalogItem): boolean {
  const code = (piece.pieceCode ?? '').toUpperCase();
  return piece.char === '焼' || code.includes('SEAR') || code.includes('FDC83CF95746');
}

function isStewCatalogPiece(piece: PieceCatalogItem): boolean {
  const code = (piece.pieceCode ?? '').toUpperCase();
  return piece.char === '煮' || code.includes('STEW') || code.includes('8DE5676A5E92');
}

function isSauteCatalogPiece(piece: PieceCatalogItem): boolean {
  const code = (piece.pieceCode ?? '').toUpperCase();
  return piece.char === '炒' || code.includes('SAUTE') || code.includes('1732246A37D8');
}

export function normalizeCatalogSkillText(piece: PieceCatalogItem): string {
  const code = (piece.pieceCode ?? '').toUpperCase();
  const isDepressionPiece =
    piece.char === '鬱' || code.includes('DEPRESSION') || code.includes('9E27F89F65C5');
  if (isDepressionPiece) {
    return '移動後、左右1マスの空きマスを2ターン侵入禁止の×マスにする。';
  }
  const isChrysanthemumPiece =
    piece.char === '菊' || code.includes('CHRYSANTHEMUM') || code.includes('8254C41BA326');
  if (isChrysanthemumPiece) {
    return '移動後、周囲8マスにいる味方駒1体（玉除く）に2ターンの復活効果を付与する。復活中は敵に取られても元の陣営の手駒に戻る。';
  }
  if (isConcaveCatalogPiece(piece)) {
    return 'なし。';
  }
  if (isSearCatalogPiece(piece)) {
    return '敵駒を取ったとき、盤上のランダムな空きマスに味方の「炎」駒を1体召喚する。';
  }
  if (isStewCatalogPiece(piece)) {
    return '敵駒を取ったとき、盤上のランダムな空きマスに味方の「火」駒を1体召喚する。';
  }
  if (isSauteCatalogPiece(piece)) {
    return '敵駒を取ったとき、盤上のランダムな空きマスに味方の「炎」駒または「火」駒のどちらかをランダムに1体召喚する。';
  }
  const pc = (piece.pieceCode ?? '').toUpperCase();
  if (piece.char === '銭' || pc.includes('SEN') || pc.includes('EACC7F540399')) {
    return '移動するたびに20％の確率で「金」に、10％の確率で「宝」に変化する。';
  }
  if (piece.char === '財' || pc.includes('ZAI') || pc.includes('7FC715661514')) {
    return '敵駒を取ったとき、味方の「銭」駒を1体、取った敵駒と同じ駒へ変化させる。';
  }
  if (piece.char === '巨' || pc.includes('GIANT') || pc.includes('C4AEB81F3634')) {
    return '敵に取られず、あらゆるスキルの特殊効果を受けない。本体が占める4マスには他の駒は入れない。移動先の2×2マス内の敵駒をまとめて取れる。味方駒が1マスでも重なるマスへは進めない。';
  }
  if (piece.char === '鶏' || pc.includes('CHICKEN') || pc.includes('F1A6EF3B99DF')) {
    return 'なし';
  }
  const skill = (piece.skill ?? '').trim();
  if (skill.length > 0 && skill !== '-' && skill !== '準備中') {
    return skill;
  }
  const desc = (piece.desc ?? '').trim();
  if (desc.length > 0 && desc !== '-' && desc !== '準備中') {
    return desc;
  }
  return '詳細は準備中です。';
}

export function normalizeCatalogMoveText(piece: PieceCatalogItem): string {
  if (isConcaveCatalogPiece(piece)) {
    return CONCAVE_CATALOG_MOVE_TEXT;
  }
  const move = (piece.move ?? '').trim();
  return move.length > 0 && move !== '-' && move !== '準備中' ? move : '準備中';
}

export function normalizeCatalogMoveVectors(
  piece: PieceCatalogItem,
): PieceCatalogItem['moveVectors'] {
  const code = (piece.pieceCode ?? '').toUpperCase();
  const isDepressionPiece =
    piece.char === '鬱' || code.includes('DEPRESSION') || code.includes('9E27F89F65C5');
  if (isDepressionPiece) {
    return [
      { dx: 0, dy: -1, maxStep: 1 },
      { dx: -1, dy: -1, maxStep: 1 },
      { dx: 1, dy: -1, maxStep: 1 },
      { dx: -1, dy: 1, maxStep: 1 },
      { dx: 1, dy: 1, maxStep: 1 },
    ];
  }
  if (isConcaveCatalogPiece(piece)) {
    return CONCAVE_CATALOG_MOVE_VECTORS;
  }
  return piece.moveVectors;
}

/** 駒図鑑画面と同じスキル・移動・移動ベクトル表記に揃える。 */
export function normalizePieceCatalogItemForDisplay<T extends PieceCatalogItem>(piece: T): T {
  return {
    ...piece,
    skill: normalizeCatalogSkillText(piece),
    move: normalizeCatalogMoveText(piece),
    moveVectors: normalizeCatalogMoveVectors(piece),
  };
}

export function buildPieceCatalogByCharMap(
  items: readonly PieceCatalogItem[],
): Map<string, PieceCatalogItem> {
  const map = new Map<string, PieceCatalogItem>();
  for (const item of items) {
    const normalized = normalizePieceCatalogItemForDisplay(item);
    map.set(normalized.char, normalized);
  }
  return map;
}

export function lookupCatalogPieceByChar(
  catalogByChar: Map<string, PieceCatalogItem>,
  char: string,
): PieceCatalogItem | undefined {
  return catalogByChar.get(char);
}
