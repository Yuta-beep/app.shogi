import { useEffect, useMemo, useState } from 'react';

import { MockLoadOnlineBattleSessionUseCase } from '@/usecases/online-battle/mock-online-battle-usecases';
import { OnlineBattleSession } from '@/usecases/online-battle/load-online-battle-session-usecase';

const emptySession: OnlineBattleSession = {
  roomId: '----',
  connectionStatus: '接続中...',
  playerLabel: 'あなた: -',
  opponentLabel: '相手: -',
};

export function useOnlineBattleScreen(opponent?: string, rating?: string) {
  const [session, setSession] = useState<OnlineBattleSession>(emptySession);
  const [isLoading, setIsLoading] = useState(true);
  const loadUseCase = useMemo(() => new MockLoadOnlineBattleSessionUseCase(), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadUseCase
      .execute({ opponent, rating })
      .then((next) => {
        if (active) {
          setSession(next);
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
  }, [loadUseCase, opponent, rating]);

  return { session, isLoading };
}
