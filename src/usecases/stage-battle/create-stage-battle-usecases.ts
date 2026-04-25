import { isApiDataSource } from '@/lib/config/data-source';
import { ClaimStageClearRewardUseCase } from '@/usecases/stage-battle/claim-stage-clear-reward-usecase';
import {
  LocalClaimStageClearRewardUseCase,
  LocalPrepareStageBattleUseCase,
} from '@/usecases/stage-battle/local-stage-battle-usecases';
import {
  MockClaimStageClearRewardUseCase,
  MockPrepareStageBattleUseCase,
} from '@/usecases/stage-battle/mock-stage-battle-usecases';
import { PrepareStageBattleUseCase } from '@/usecases/stage-battle/prepare-stage-battle-usecase';

export function createPrepareStageBattleUseCase(): PrepareStageBattleUseCase {
  return isApiDataSource()
    ? new LocalPrepareStageBattleUseCase()
    : new MockPrepareStageBattleUseCase();
}

export function createClaimStageClearRewardUseCase(): ClaimStageClearRewardUseCase {
  return isApiDataSource()
    ? new LocalClaimStageClearRewardUseCase()
    : new MockClaimStageClearRewardUseCase();
}
