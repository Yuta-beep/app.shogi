import { useEffect, useMemo, useState } from 'react';

import { createLoadHomeSnapshotUseCase } from '@/infra/di/usecase-factory';
import { HomeSnapshot } from '@/domain/models/home';

export type HomeScreenVM = {
  snapshot: HomeSnapshot;
  isLoading: boolean;
};

const emptySnapshot: HomeSnapshot = {
  playerName: '',
  rating: 0,
  pawnCurrency: 0,
  goldCurrency: 0,
  playerRank: 1,
  playerExp: 0,
};

export function useHomeScreen(): HomeScreenVM {
  const [snapshot, setSnapshot] = useState<HomeSnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const loadUseCase = useMemo(() => createLoadHomeSnapshotUseCase(), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadUseCase
      .execute()
      .then((next) => {
        if (active) {
          setSnapshot(next);
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

  return { snapshot, isLoading };
}
