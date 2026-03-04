import { stageNodes, stageRanges } from '@/constants/stage-select-data';
import { MockLoadStageSelectUseCase, MockSelectStageUseCase } from '@/usecases/stage-select/mock-stage-select-usecases';

describe('stage select usecases', () => {
  it('loads all ranges and nodes from constants', async () => {
    const usecase = new MockLoadStageSelectUseCase();
    const snapshot = await usecase.execute();

    expect(snapshot.ranges).toEqual(stageRanges);
    expect(snapshot.nodes).toEqual(stageNodes);
  });

  it('allows selecting an existing stage', async () => {
    const usecase = new MockSelectStageUseCase();
    const result = await usecase.execute({ stageId: 1 });

    expect(result).toEqual({ canStart: true });
  });

  it('rejects selecting a non-existing stage', async () => {
    const usecase = new MockSelectStageUseCase();
    const result = await usecase.execute({ stageId: 9999 });

    expect(result).toEqual({ canStart: false, reason: 'NOT_FOUND' });
  });
});
