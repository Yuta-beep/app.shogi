import { useEffect, useMemo, useState } from 'react';

import { PieceCatalogItem } from '@/domain/models/piece';
import { createLoadPieceCatalogUseCase } from '@/usecases/piece-info/create-piece-info-usecases';
import { createLoadDeckBuilderUseCase } from '@/usecases/deck-builder/create-deck-builder-usecases';
import { supabase } from '@/lib/supabase/supabase-client';
import { isApiDataSource } from '@/lib/config/data-source';

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

function normalizeCatalogSkillText(piece: PieceCatalogItem): string {
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
  if (piece.char === '鶏' || pc.includes('CHICKEN') || pc.includes('F1A6EF3B99DF')) {
    return 'なし';
  }
  return piece.skill;
}

function normalizeCatalogMoveText(piece: PieceCatalogItem): string {
  if (isConcaveCatalogPiece(piece)) {
    return CONCAVE_CATALOG_MOVE_TEXT;
  }
  return piece.move;
}

function normalizeCatalogMoveVectors(piece: PieceCatalogItem): PieceCatalogItem['moveVectors'] {
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

export function usePieceCatalogScreen() {
  const isApiMode = isApiDataSource();
  const [items, setItems] = useState<PieceCatalogItem[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const loadUseCase = useMemo(() => createLoadPieceCatalogUseCase(), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      const catalog = await loadUseCase.execute();

      if (!isApiMode) {
        if (active) {
          setItems(
            catalog.map((piece) => ({
              ...piece,
              skill: normalizeCatalogSkillText(piece),
              move: normalizeCatalogMoveText(piece),
              moveVectors: normalizeCatalogMoveVectors(piece),
            })),
          );
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (active) {
          setItems([]);
        }
        return;
      }

      const deckSnapshot = await createLoadDeckBuilderUseCase(token).execute();

      const ownedByChar = new Map<
        string,
        { pieceId?: number; imageSignedUrl?: string | null; quantity?: number }
      >();

      for (const ownedPiece of deckSnapshot.ownedPieces) {
        if (!ownedByChar.has(ownedPiece.char)) {
          ownedByChar.set(ownedPiece.char, {
            pieceId: ownedPiece.pieceId,
            imageSignedUrl: ownedPiece.imageSignedUrl,
            quantity: ownedPiece.quantity,
          });
        }
      }

      const ownedCatalog = catalog
        .filter((piece) => ownedByChar.has(piece.char))
        .map((piece) => {
          const owned = ownedByChar.get(piece.char);
          return {
            ...piece,
            skill: normalizeCatalogSkillText(piece),
            move: normalizeCatalogMoveText(piece),
            moveVectors: normalizeCatalogMoveVectors(piece),
            pieceId: owned?.pieceId,
            imageSignedUrl: owned?.imageSignedUrl ?? null,
            quantity: owned?.quantity,
          };
        });

      if (active) {
        setItems(ownedCatalog);
      }
    }

    load()
      .catch(() => {
        if (active) {
          setItems([]);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isApiMode, loadUseCase]);

  useEffect(() => {
    if (items.length === 0) {
      if (index !== 0) setIndex(0);
      return;
    }
    if (index >= items.length) {
      setIndex(items.length - 1);
    }
  }, [index, items.length]);

  const piece = items[index] ?? {
    char: '駒',
    name: '所持駒なし',
    unlock: '未所持',
    desc: '-',
    skill: '-',
    move: '-',
    moveVectors: [],
    isRepeatable: false,
    canJump: false,
    moveConstraints: null,
    moveRules: [],
    imageSignedUrl: null,
  };

  function previous() {
    if (items.length === 0) return;
    setIndex((prev) => (prev - 1 + items.length) % items.length);
  }

  function next() {
    if (items.length === 0) return;
    setIndex((prev) => (prev + 1) % items.length);
  }

  return {
    isLoading,
    piece,
    items,
    index,
    total: items.length === 0 ? 1 : items.length,
    previous,
    next,
    selectIndex: (nextIndex: number) => {
      if (items.length === 0) return;
      if (nextIndex < 0 || nextIndex >= items.length) return;
      setIndex(nextIndex);
    },
  };
}
