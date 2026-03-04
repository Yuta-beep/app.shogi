import { useEffect, useMemo, useState } from 'react';

import { MockLoadDeckBuilderUseCase } from '@/usecases/deck-builder/mock-deck-builder-usecases';

export function useDeckBuilderScreen() {
  const [ownedPieces, setOwnedPieces] = useState<string[]>([]);
  const loadUseCase = useMemo(() => new MockLoadDeckBuilderUseCase(), []);

  useEffect(() => {
    let active = true;
    loadUseCase.execute().then((snapshot) => {
      if (active) {
        setOwnedPieces(snapshot.ownedPieces);
      }
    });

    return () => {
      active = false;
    };
  }, [loadUseCase]);

  return { ownedPieces };
}
