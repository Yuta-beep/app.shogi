import { useEffect, useMemo, useState } from 'react';

import { MockCancelMatchingUseCase, MockStartMatchingUseCase } from '@/usecases/matching/mock-matching-usecases';
import { MatchingSnapshot } from '@/usecases/matching/start-matching-usecase';

const emptySnapshot: MatchingSnapshot = {
  title: 'オンライン対戦',
  status: '読み込み中',
  progress: 0,
};

export function useMatchingScreen() {
  const [snapshot, setSnapshot] = useState<MatchingSnapshot>(emptySnapshot);
  const startUseCase = useMemo(() => new MockStartMatchingUseCase(), []);
  const cancelUseCase = useMemo(() => new MockCancelMatchingUseCase(), []);

  useEffect(() => {
    let active = true;
    startUseCase.execute().then((next) => {
      if (active) {
        setSnapshot(next);
      }
    });
    return () => {
      active = false;
    };
  }, [startUseCase]);

  async function cancel() {
    await cancelUseCase.execute();
  }

  return { snapshot, cancel };
}
