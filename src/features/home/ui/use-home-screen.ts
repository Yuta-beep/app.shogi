import { useEffect, useMemo, useState } from 'react';

import { HomeSnapshot } from '@/usecases/home/load-home-snapshot-usecase';
import { MockLoadHomeSnapshotUseCase } from '@/usecases/home/mock-home-usecases';

export type HomeScreenVM = {
  snapshot: HomeSnapshot;
};

const emptySnapshot: HomeSnapshot = {
  playerName: '',
  rating: 0,
  pawnCurrency: 0,
  goldCurrency: 0,
};

export function useHomeScreen(): HomeScreenVM {
  const [snapshot, setSnapshot] = useState<HomeSnapshot>(emptySnapshot);
  const loadUseCase = useMemo(() => new MockLoadHomeSnapshotUseCase(), []);

  useEffect(() => {
    let active = true;
    loadUseCase.execute().then((next) => {
      if (active) {
        setSnapshot(next);
      }
    });
    return () => {
      active = false;
    };
  }, [loadUseCase]);

  return { snapshot };
}
