import { stageNodes, stageRanges } from '@/constants/stage-select-data';
import {
  LoadStageSelectUseCase,
  StageSelectSnapshot,
} from '@/usecases/stage-select/load-stage-select-usecase';
import {
  SelectStageInput,
  SelectStageResult,
  SelectStageUseCase,
} from '@/usecases/stage-select/select-stage-usecase';

export class MockLoadStageSelectUseCase implements LoadStageSelectUseCase {
  async execute(): Promise<StageSelectSnapshot> {
    return {
      ranges: stageRanges,
      nodes: stageNodes,
    };
  }
}

export class MockSelectStageUseCase implements SelectStageUseCase {
  async execute(input: SelectStageInput): Promise<SelectStageResult> {
    const exists = stageNodes.some((node) => node.id === input.stageId);
    if (!exists) {
      return { canStart: false, reason: 'NOT_FOUND' };
    }

    // UI only フェーズでは全ステージを選択可能にして見た目確認を優先する。
    return { canStart: true };
  }
}
