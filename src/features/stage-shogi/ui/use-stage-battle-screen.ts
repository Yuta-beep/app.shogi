import { useEffect, useMemo, useState } from 'react';

import { createPrepareStageBattleUseCase } from '@/infra/di/usecase-factory';
import { StageBattleSnapshot } from '@/usecases/stage-battle/prepare-stage-battle-usecase';

const emptySnapshot: StageBattleSnapshot = {
  stageLabel: 'STAGE',
  turnLabel: 'TURN 0 / 0',
  handLabel: '',
};

export function useStageBattleScreen(stageId?: string) {
  const useCase = useMemo(() => createPrepareStageBattleUseCase(), []);
  const [snapshot, setSnapshot] = useState<StageBattleSnapshot>(emptySnapshot);

  useEffect(() => {
    let active = true;
    useCase.execute({ stageId }).then((next) => {
      if (active) {
        setSnapshot(next);
      }
    });
    return () => {
      active = false;
    };
  }, [stageId, useCase]);

  return { snapshot };
}
