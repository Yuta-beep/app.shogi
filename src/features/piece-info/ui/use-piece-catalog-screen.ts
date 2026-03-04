import { useEffect, useMemo, useState } from 'react';

import { MockLoadPieceCatalogUseCase } from '@/usecases/piece-info/mock-piece-info-usecases';
import { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

export function usePieceCatalogScreen() {
  const [items, setItems] = useState<PieceCatalogItem[]>([]);
  const [index, setIndex] = useState(0);
  const loadUseCase = useMemo(() => new MockLoadPieceCatalogUseCase(), []);

  useEffect(() => {
    let active = true;
    loadUseCase.execute().then((next) => {
      if (active) {
        setItems(next);
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
    piece,
    index,
    total: items.length === 0 ? 1 : items.length,
    previous,
    next,
  };
}
