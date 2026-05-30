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
    const sessionPromise = supabase.auth.getSession();
    const progressPromise = sessionPromise.then((sessionResult) => {
      const token = sessionResult.data.session?.access_token ?? null;
      return token ? this.stageProgressDataSource.getStageProgress(token) : null;
    });

    let clearedStageNos = new Set<number>();

    const [snapshot, progress] = await Promise.all([
      this.loadStageSelectUseCase.execute(),
      progressPromise.catch((error) => {
        console.warn('[stage-select] failed to load stage progress from API', error);
        return null;
      }),
    ]);

    if (progress) {
      clearedStageNos = new Set(progress.clearedStageNos);
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
