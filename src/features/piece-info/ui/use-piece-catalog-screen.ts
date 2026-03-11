import { useEffect, useMemo, useState } from 'react';

import { PieceCatalogItem } from '@/domain/models/piece';
import { createLoadPieceCatalogUseCase } from '@/usecases/piece-info/create-piece-info-usecases';
import { createLoadDeckBuilderUseCase } from '@/usecases/deck-builder/create-deck-builder-usecases';
import { supabase } from '@/lib/supabase/supabase-client';
import { isApiDataSource } from '@/lib/config/data-source';

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
          setItems(catalog);
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

  const piece = items[index] ?? {
    char: '駒',
    name: '所持駒なし',
    unlock: '未所持',
    desc: '-',
    skill: '-',
    move: '-',
    moveVectors: [],
    isRepeatable: false,
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
    index,
    total: items.length === 0 ? 1 : items.length,
    previous,
    next,
  };
}
