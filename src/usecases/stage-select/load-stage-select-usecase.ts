import type { StageNodeData, StageRange } from '@/domain/models/stage-select';

export type StageSelectSnapshot = {
  ranges: StageRange[];
  nodes: StageNodeData[];
};

export interface LoadStageSelectUseCase {
  execute(): Promise<StageSelectSnapshot>;
}
