import { StageNodeData, StageRange } from '@/constants/stage-select-data';

export type StageSelectSnapshot = {
  ranges: StageRange[];
  nodes: StageNodeData[];
};

export interface LoadStageSelectUseCase {
  execute(): Promise<StageSelectSnapshot>;
}
