import { useEffect, useMemo, useState } from 'react';

import { createLoadPieceCatalogUseCase } from '@/infra/di/usecase-factory';
import { PieceCatalogItem } from '@/domain/models/piece';

export function usePieceCatalogScreen() {
  const [items, setItems] = useState<PieceCatalogItem[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const loadUseCase = useMemo(() => createLoadPieceCatalogUseCase(), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadUseCase
      .execute()
      .then((next) => {
        if (active) {
          setItems(next);
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
  }, [loadUseCase]);

  const piece = items[index] ?? {
    char: '駒',
    name: 'ロード中',
    unlock: '-',
    desc: '-',
    skill: '-',
    move: '-',
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
