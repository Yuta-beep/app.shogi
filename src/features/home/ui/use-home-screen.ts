import { useCallback, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { HomeSnapshot } from '@/domain/models/home';
import {
  getHomeSnapshotState,
  loadHomeSnapshot,
  subscribeHomeSnapshot,
} from '@/hooks/common/home-snapshot-store';

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
  stamina: 50,
  maxStamina: 50,
  nextRecoveryAt: null,
};

export function useHomeScreen(): HomeScreenVM {
  const state = useSyncExternalStore(subscribeHomeSnapshot, getHomeSnapshotState);

  useFocusEffect(
    useCallback(() => {
      void loadHomeSnapshot();
    }, []),
  );

  return {
    snapshot: state.snapshot,
    isLoading: state.isLoading && state.snapshot.playerName.length === 0,
  };
}
