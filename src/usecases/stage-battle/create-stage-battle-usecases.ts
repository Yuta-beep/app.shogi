import { isApiDataSource } from '@/lib/config/data-source';
import {
  applyHomeSnapshotStamina,
  getHomeSnapshotState,
  loadHomeSnapshot,
} from '@/hooks/common/home-snapshot-store';
import { ensureNormalStageStaminaCharged } from '@/lib/stamina/spend-stage-stamina';
import { ClaimStageClearRewardUseCase } from '@/usecases/stage-battle/claim-stage-clear-reward-usecase';
import {
  LocalClaimStageClearRewardUseCase,
  LocalPrepareStageBattleUseCase,
  type StageBattleHomeSnapshotPort,
} from '@/usecases/stage-battle/local-stage-battle-usecases';
import {
  MockClaimStageClearRewardUseCase,
  MockPrepareStageBattleUseCase,
} from '@/usecases/stage-battle/mock-stage-battle-usecases';
import { PrepareStageBattleUseCase } from '@/usecases/stage-battle/prepare-stage-battle-usecase';

function createStageBattleHomeSnapshotPort(): StageBattleHomeSnapshotPort {
  return {
    getSnapshot: () => getHomeSnapshotState().snapshot,
    reload: async (force = false) => {
      await loadHomeSnapshot(force);
    },
    applyStamina: applyHomeSnapshotStamina,
    chargeNormalStageStamina: (staminaBeforeBattleStart) => {
      ensureNormalStageStaminaCharged(
        staminaBeforeBattleStart,
        getHomeSnapshotState().snapshot,
        applyHomeSnapshotStamina,
      );
    },
  };
}

export function createPrepareStageBattleUseCase(): PrepareStageBattleUseCase {
  return isApiDataSource()
    ? new LocalPrepareStageBattleUseCase(undefined, createStageBattleHomeSnapshotPort())
    : new MockPrepareStageBattleUseCase();
}

export function createClaimStageClearRewardUseCase(): ClaimStageClearRewardUseCase {
  return isApiDataSource()
    ? new LocalClaimStageClearRewardUseCase()
    : new MockClaimStageClearRewardUseCase();
}
