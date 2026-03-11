import { isApiDataSource } from '@/lib/config/data-source';
import { ApiPrepareStageBattleUseCase } from '@/usecases/stage-battle/api-stage-battle-usecases';
import { MockPrepareStageBattleUseCase } from '@/usecases/stage-battle/mock-stage-battle-usecases';
import { PrepareStageBattleUseCase } from '@/usecases/stage-battle/prepare-stage-battle-usecase';

export function createPrepareStageBattleUseCase(): PrepareStageBattleUseCase {
  return isApiDataSource()
    ? new ApiPrepareStageBattleUseCase()
    : new MockPrepareStageBattleUseCase();
}
