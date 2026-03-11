import { isApiDataSource } from '@/lib/config/data-source';
import {
  ApiClaimStageClearRewardUseCase,
  ApiPrepareStageBattleUseCase,
} from '@/usecases/stage-battle/api-stage-battle-usecases';
import { ClaimStageClearRewardUseCase } from '@/usecases/stage-battle/claim-stage-clear-reward-usecase';
import {
  MockClaimStageClearRewardUseCase,
  MockPrepareStageBattleUseCase,
} from '@/usecases/stage-battle/mock-stage-battle-usecases';
import { PrepareStageBattleUseCase } from '@/usecases/stage-battle/prepare-stage-battle-usecase';

export function createPrepareStageBattleUseCase(): PrepareStageBattleUseCase {
  return isApiDataSource()
    ? new ApiPrepareStageBattleUseCase()
    : new MockPrepareStageBattleUseCase();
}

export function createClaimStageClearRewardUseCase(): ClaimStageClearRewardUseCase {
  return isApiDataSource()
    ? new ApiClaimStageClearRewardUseCase()
    : new MockClaimStageClearRewardUseCase();
}
