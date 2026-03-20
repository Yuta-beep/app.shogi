import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import type { HomeSnapshot } from '@/domain/models/home';
import { createLoadHomeSnapshotUseCase } from '@/usecases/home/create-home-usecases';

const emptySnapshot: HomeSnapshot = {
  playerName: '',
  rating: 0,
  pawnCurrency: 0,
  goldCurrency: 0,
  playerRank: 1,
  playerExp: 0,
  stamina: 50,
  maxStamina: 50,
  nextRecoveryAt: null,
};

export function useHomeHudSnapshot() {
  const [snapshot, setSnapshot] = useState<HomeSnapshot>(emptySnapshot);
  const loadUseCase = useMemo(() => createLoadHomeSnapshotUseCase(), []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadUseCase.execute().then((next) => {
        if (active) {
          setSnapshot(next);
        }
      });
      return () => {
        active = false;
      };
    }, [loadUseCase]),
  );

  return snapshot;
}
