import type { StageNodeData } from '@/domain/models/stage-select';
import { StageProgressApiDataSource } from '@/infra/datasources/stage-progress-api-datasource';
import { supabase } from '@/lib/supabase/supabase-client';
import { LoadStageSelectUseCase } from '@/usecases/stage-select/load-stage-select-usecase';

type StageProgressDataSource = {
  getStageProgress(token: string): Promise<{ clearedStageNos: number[] }>;
};

export class LoadStageSelectWithProgressUseCase {
  constructor(
    private readonly loadStageSelectUseCase: LoadStageSelectUseCase,
    private readonly stageProgressDataSource: StageProgressDataSource = new StageProgressApiDataSource(),
  ) {}

  async execute(): Promise<StageNodeData[]> {
    const [snapshot, sessionResult] = await Promise.all([
      this.loadStageSelectUseCase.execute(),
      supabase.auth.getSession(),
    ]);

    const token = sessionResult.data.session?.access_token ?? null;
    let clearedStageNos = new Set<number>();

    if (token) {
      try {
        const progress = await this.stageProgressDataSource.getStageProgress(token);
        clearedStageNos = new Set(progress.clearedStageNos);
      } catch (error) {
        console.warn('[stage-select] failed to load stage progress from API', error);
      }
    }

    return snapshot.nodes.map((node) => {
      const unlockedByStageProgress =
        node.unlockStageNo == null || clearedStageNos.has(node.unlockStageNo);
      const unlockedByServer = node.canStart ?? true;
      return {
        ...node,
        isCleared: clearedStageNos.has(node.id),
        isUnlocked: unlockedByStageProgress && unlockedByServer,
      };
    });
  }
}
