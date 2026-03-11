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

export function useStageBattleScreen(stageId?: string) {
  const useCase = useMemo(() => createPrepareStageBattleUseCase(), []);
  const [snapshot, setSnapshot] = useState<StageBattleSnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, [stageId, useCase]);

  return { snapshot, isLoading };
}
