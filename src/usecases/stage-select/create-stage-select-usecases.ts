import { isApiDataSource } from '@/lib/config/data-source';
import {
  ApiLoadStageSelectUseCase,
  ApiSelectStageUseCase,
} from '@/usecases/stage-select/api-stage-select-usecases';
import {
  MockLoadStageSelectUseCase,
  MockSelectStageUseCase,
} from '@/usecases/stage-select/mock-stage-select-usecases';
import { LoadStageSelectUseCase } from '@/usecases/stage-select/load-stage-select-usecase';
import { SelectStageUseCase } from '@/usecases/stage-select/select-stage-usecase';

export function createLoadStageSelectUseCase(): LoadStageSelectUseCase {
  return isApiDataSource() ? new ApiLoadStageSelectUseCase() : new MockLoadStageSelectUseCase();
}

export function createSelectStageUseCase(): SelectStageUseCase {
  return isApiDataSource() ? new ApiSelectStageUseCase() : new MockSelectStageUseCase();
}
