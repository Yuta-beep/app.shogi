import { useEffect, useMemo, useState } from 'react';

import { MockPrepareStageBattleUseCase } from '@/usecases/stage-battle/mock-stage-battle-usecases';
import { StageBattleSnapshot } from '@/usecases/stage-battle/prepare-stage-battle-usecase';

const emptySnapshot: StageBattleSnapshot = {
  stageLabel: 'STAGE',
  turnLabel: 'TURN 0 / 0',
  handLabel: '',
};

export function useStageBattleScreen(stageId?: string) {
  const useCase = useMemo(() => new MockPrepareStageBattleUseCase(), []);
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
