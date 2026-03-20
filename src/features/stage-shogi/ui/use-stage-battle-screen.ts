import { useEffect, useMemo, useState } from 'react';

import { createPrepareStageBattleUseCase } from '@/usecases/stage-battle/create-stage-battle-usecases';
import { StageBattleSnapshot } from '@/usecases/stage-battle/prepare-stage-battle-usecase';

const emptySnapshot: StageBattleSnapshot = {
  stageLabel: 'STAGE',
  turnLabel: 'TURN 0 / 0',
  handLabel: '',
  boardSize: 9,
  placements: [],
};

export function useStageBattleScreen(stageId?: string, reloadKey?: string) {
  const useCase = useMemo(() => createPrepareStageBattleUseCase(), []);
  const enabled = reloadKey !== undefined;
  const [snapshot, setSnapshot] = useState<StageBattleSnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(true);
      return;
    }

    let active = true;
    setIsLoading(true);
    useCase
      .execute({ stageId })
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
  }, [enabled, stageId, reloadKey, useCase]);

  return { snapshot, isLoading };
}
