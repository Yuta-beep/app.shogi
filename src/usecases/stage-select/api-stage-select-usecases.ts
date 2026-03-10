import { StageRepository } from '@/domain/repositories/stage-repository';
import { stageNodes, stageRanges } from '@/constants/stage-select-data';
import { ApiStageRepository } from '@/infra/repositories/stage-repository';
import {
  LoadStageSelectUseCase,
  StageSelectSnapshot,
} from '@/usecases/stage-select/load-stage-select-usecase';
import {
  SelectStageInput,
  SelectStageResult,
  SelectStageUseCase,
} from '@/usecases/stage-select/select-stage-usecase';

function nodeById(id: number) {
  return stageNodes.find((node) => node.id === id) ?? null;
}

export class ApiLoadStageSelectUseCase implements LoadStageSelectUseCase {
  constructor(private readonly repository: StageRepository = new ApiStageRepository()) {}

  async execute(): Promise<StageSelectSnapshot> {
    const stages = await this.repository.listStages();

    const nodes = stages
      .map((stage) => {
        const fallback = nodeById(stage.stageNo);
        if (!fallback) return null;

        return {
          ...fallback,
          id: stage.stageNo,
          name: stage.stageName,
          unlockStageNo: stage.unlockStageNo ?? null,
          canStart: stage.canStart,
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null)
      .sort((a, b) => a.id - b.id);

    return {
      ranges: stageRanges,
      nodes,
    };
  }
}

export class ApiSelectStageUseCase implements SelectStageUseCase {
  constructor(private readonly repository: StageRepository = new ApiStageRepository()) {}

  async execute(input: SelectStageInput): Promise<SelectStageResult> {
    return this.repository.selectStage(input.stageId);
  }
}
