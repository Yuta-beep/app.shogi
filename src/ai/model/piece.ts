import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';
import { normalizePieceCode, toBasePieceCode } from '@/ai/model/move';

/** API やフォント由来の互換文字を駒ルール判定用に揃える。 */
function normKanjiForPieceRules(ch: string | null | undefined): string {
  if (!ch) return '';
  try {
    return ch.normalize('NFKC');
  } catch {
    return ch;
  }
}

/**
 * BFF のマスタが未更新でも、クライアント将棋エンジンと駒図鑑の表示を一致させる。
 * （ skill_definitions_v2 の 52/54 は assembleSkillDefinitionsV2ForSession で正典定義に上書き済み前提）
 */
function applyClientEnginePieceCatalogOverrides(item: PieceCatalogItem): PieceCatalogItem {
  const ch = normKanjiForPieceRules(item.char);
  const baseCode = toBasePieceCode(item.pieceCode);
  const moveCode = (item.moveCode ?? '').trim().toLowerCase();

  if (ch === '刀' || moveCode === 'katana') {
    return {
      ...item,
      moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
      move: '前方1マス。',
      skill:
        '前方ちょうど1マスに進んで敵駒を取ったとき、着地点の左右1マスにいる敵駒も同時に取ることができる。',
    };
  }

  if (ch === '銃' || baseCode === 'GUN') {
    return {
      ...item,
      moveVectors: [
        { dx: 0, dy: -1, maxStep: 2 },
        { dx: -1, dy: 1, maxStep: 2 },
        { dx: 1, dy: 1, maxStep: 2 },
      ],
      move: '前方1～2マス、または斜め後ろに2マス進める。',
      skill:
        '前方ちょうど2マスへ進む手について、1マス目と2マス目にいる敵駒を、移動（スキル）として同一の手でまとめて取れる。',
    };
  }

  if (ch === '書' || baseCode === 'BOOK') {
    return {
      ...item,
      skill: '移動範囲が1手前に相手が移動させた駒の移動範囲と同じになる。',
    };
  }

  if (ch === '封' || baseCode === 'SEAL') {
    return {
      ...item,
      skill: 'この駒の斜め4方向に隣接する敵駒は移動できない。',
    };
  }

  if (ch === '牛' || baseCode === 'COW') {
    return {
      ...item,
      moveVectors: [
        { dx: 0, dy: -1, maxStep: 1 },
        { dx: 0, dy: 1, maxStep: 1 },
      ],
      move: '前方1マス、または後方1マスに進める。',
      skill:
        '後ろに動くたびにチャージが1溜まり、前に進める最大マス数がその分だけ増える。通ったマスの敵駒はすべて取れる。前に1回でも進むとチャージは0になる。',
    };
  }

  if (ch === '豚' || baseCode === 'PIG') {
    return {
      ...item,
      moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
      move: '前方1マス。',
      skill: '敵駒を取ると、その駒の移動範囲を自分のものとして使える。',
    };
  }

  if (ch === '鶏' || baseCode === 'CHICKEN') {
    return {
      ...item,
      skill: 'なし',
    };
  }

  return item;
}

export type AiPieceDefinition = PieceCatalogItem;

export type AiPieceLookups = {
  pieceDefsByCode: Record<string, AiPieceDefinition>;
  promotedPieceDefsByCode: Record<string, AiPieceDefinition>;
  pieceDefsByChar: Record<string, AiPieceDefinition>;
};

export function normalizePieceDefinition(item: PieceCatalogItem): AiPieceDefinition {
  const overridden = applyClientEnginePieceCatalogOverrides(item);
  return {
    ...overridden,
    pieceCode: normalizePieceCode(overridden.pieceCode),
    canonicalCode: normalizePieceCode(overridden.canonicalCode),
    sfenCode: overridden.sfenCode?.toUpperCase() ?? null,
    moveVectors: overridden.moveVectors.map((vector) => ({ ...vector })),
    moveRules: overridden.moveRules?.map((rule) => ({ ...rule, params: { ...rule.params } })) ?? [],
    moveConstraints: overridden.moveConstraints ? { ...overridden.moveConstraints } : null,
  };
}

export function normalizePieceCatalog(items: PieceCatalogItem[]): AiPieceDefinition[] {
  return items.map(normalizePieceDefinition);
}

export function buildPieceLookups(pieceCatalog: AiPieceDefinition[]): AiPieceLookups {
  const pieceDefsByCode: Record<string, AiPieceDefinition> = {};
  const pieceDefsByChar: Record<string, AiPieceDefinition> = {};
  const promotedPieceDefsByCode: Record<string, AiPieceDefinition> = {};

  for (const item of pieceCatalog) {
    if (item.char) {
      pieceDefsByChar[item.char] = item;
    }
    const pieceCode = normalizePieceCode(item.pieceCode);
    if (pieceCode) {
      pieceDefsByCode[pieceCode] = item;
      if (item.isPromoted) {
        promotedPieceDefsByCode[pieceCode] = item;
      }
    }
    const canonicalCode = normalizePieceCode(item.canonicalCode);
    if (canonicalCode) {
      pieceDefsByCode[canonicalCode] = item;
      if (item.isPromoted) {
        promotedPieceDefsByCode[canonicalCode] = item;
      }
    }
  }

  // 王/玉は同一駒として扱う。同期揺れで文字が入れ替わっても定義解決できるようにする。
  if (pieceDefsByChar['王'] && !pieceDefsByChar['玉']) {
    pieceDefsByChar['玉'] = pieceDefsByChar['王']!;
  }
  if (pieceDefsByChar['玉'] && !pieceDefsByChar['王']) {
    pieceDefsByChar['王'] = pieceDefsByChar['玉']!;
  }

  return {
    pieceDefsByCode,
    promotedPieceDefsByCode,
    pieceDefsByChar,
  };
}
