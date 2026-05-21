import { useEffect, useMemo, useState } from 'react';

import { PieceCatalogItem } from '@/domain/models/piece';
import { useAuthSession } from '@/hooks/common/auth-session-context';
import { createLoadPieceCatalogUseCase } from '@/usecases/piece-info/create-piece-info-usecases';
import { createLoadDeckBuilderUseCase } from '@/usecases/deck-builder/create-deck-builder-usecases';
import { isApiDataSource } from '@/lib/config/data-source';
import { normalizePieceCatalogItemForDisplay } from '@/features/piece-info/lib/piece-catalog-display';

export function usePieceCatalogScreen() {
  const isApiMode = isApiDataSource();
  const { accessToken } = useAuthSession();
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
        const deckSnapshot = await createLoadDeckBuilderUseCase().execute();
        const ownedByChar = new Set(deckSnapshot.ownedPieces.map((piece) => piece.char));
        const ownedCatalog = catalog
          .filter((piece) => ownedByChar.has(piece.char))
          .map((piece) => normalizePieceCatalogItemForDisplay(piece));
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

      const ownedCatalog = catalog
        .filter((piece) => ownedByChar.has(piece.char))
        .map((piece) => {
          const owned = ownedByChar.get(piece.char);
          const display = normalizePieceCatalogItemForDisplay(piece);
          return {
            ...display,
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
  }, [accessToken, isApiMode, loadUseCase]);

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
