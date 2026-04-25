import { useCallback, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  getHomeSnapshotState,
  loadHomeSnapshot,
  subscribeHomeSnapshot,
} from '@/hooks/common/home-snapshot-store';

export function useHomeHudSnapshot() {
  const state = useSyncExternalStore(subscribeHomeSnapshot, getHomeSnapshotState);

  useFocusEffect(
    useCallback(() => {
      void loadHomeSnapshot();
    }, []),
  );

  return state.snapshot;
}
