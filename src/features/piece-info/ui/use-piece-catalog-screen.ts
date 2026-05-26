import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PieceCatalogItem } from '@/domain/models/piece';
import { buildCatalogItemFromGachaChar } from '@/constants/gacha-piece-metadata';
import { hydrateGachaMockOwnedChars } from '@/features/gacha-room/lib/gacha-mock-store';
import { useAuthSession } from '@/hooks/common/auth-session-context';
import { createLoadPieceCatalogUseCase } from '@/usecases/piece-info/create-piece-info-usecases';
import { createLoadDeckBuilderUseCase } from '@/usecases/deck-builder/create-deck-builder-usecases';
import { isApiDataSource } from '@/lib/config/data-source';
import { normalizePieceCatalogItemForDisplay } from '@/features/piece-info/lib/piece-catalog-display';

function mergeOwnedPiecesIntoCatalog(
  catalog: PieceCatalogItem[],
  ownedPieces: Array<{
    char: string;
    pieceId?: number;
    imageSignedUrl?: string | null;
    quantity?: number;
  }>,
): PieceCatalogItem[] {
  const byChar = new Map(catalog.map((piece) => [piece.char, piece]));

  for (const owned of ownedPieces) {
    if (byChar.has(owned.char)) continue;
    const fallback = buildCatalogItemFromGachaChar(owned.char);
    if (!fallback) continue;
    const merged = {
      ...normalizePieceCatalogItemForDisplay(fallback),
      pieceId: owned.pieceId ?? fallback.pieceId,
      imageSignedUrl: owned.imageSignedUrl ?? null,
      quantity: owned.quantity,
    };
    byChar.set(owned.char, merged);
  }

  return Array.from(byChar.values());
}

export function usePieceCatalogScreen() {
  const isApiMode = isApiDataSource();
  const { accessToken } = useAuthSession();
  const [items, setItems] = useState<PieceCatalogItem[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const loadUseCase = useMemo(() => createLoadPieceCatalogUseCase(), []);

  const reloadCatalog = useCallback(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      const catalog = await loadUseCase.execute();

      if (!isApiMode) {
        await hydrateGachaMockOwnedChars();
        const deckSnapshot = await createLoadDeckBuilderUseCase().execute();
        const ownedCatalog = mergeOwnedPiecesIntoCatalog(catalog, deckSnapshot.ownedPieces);
        if (active) {
          setItems(ownedCatalog);
        }
        return;
      }

      if (!accessToken) {
        if (active) {
          setItems([]);
        }
        return;
      }

      const deckSnapshot = await createLoadDeckBuilderUseCase(accessToken).execute();
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

      const ownedFromMaster = catalog
        .filter((piece) => ownedByChar.has(piece.char))
        .map((piece) => {
          const owned = ownedByChar.get(piece.char);
          const display = normalizePieceCatalogItemForDisplay(piece);
          return {
            ...display,
            pieceId: owned?.pieceId ?? display.pieceId,
            imageSignedUrl: owned?.imageSignedUrl ?? null,
            quantity: owned?.quantity,
          };
        });

      const ownedCatalog = mergeOwnedPiecesIntoCatalog(
        ownedFromMaster,
        deckSnapshot.ownedPieces,
      );

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
  }, [accessToken, isApiMode, loadUseCase]);

  useFocusEffect(reloadCatalog);

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
