import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';
import { normalizePieceCode } from '@/ai/model/move';

export type AiPieceDefinition = PieceCatalogItem;

export type AiPieceLookups = {
  pieceDefsByCode: Record<string, AiPieceDefinition>;
  promotedPieceDefsByCode: Record<string, AiPieceDefinition>;
  pieceDefsByChar: Record<string, AiPieceDefinition>;
};

export function normalizePieceDefinition(item: PieceCatalogItem): AiPieceDefinition {
  return {
    ...item,
    pieceCode: normalizePieceCode(item.pieceCode),
    canonicalCode: normalizePieceCode(item.canonicalCode),
    sfenCode: item.sfenCode?.toUpperCase() ?? null,
    moveVectors: item.moveVectors.map((vector) => ({ ...vector })),
    moveRules: item.moveRules?.map((rule) => ({ ...rule, params: { ...rule.params } })) ?? [],
    moveConstraints: item.moveConstraints ? { ...item.moveConstraints } : null,
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
