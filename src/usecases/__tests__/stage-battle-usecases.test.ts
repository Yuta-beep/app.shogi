import { MockPrepareStageBattleUseCase } from '@/usecases/stage-battle/mock-stage-battle-usecases';

describe('MockPrepareStageBattleUseCase', () => {
  it('returns generic stage label when stage id is not provided', async () => {
    const usecase = new MockPrepareStageBattleUseCase();
    const snapshot = await usecase.execute({});

    expect(snapshot.stageLabel).toBe('STAGE');
    expect(snapshot.turnLabel).toBe('TURN 12 / 99');
    expect(snapshot.handLabel).toBe('歩 x2 / 桂 x1 / 角 x1');
  });

  it('returns stage-specific label when stage id is provided', async () => {
    const usecase = new MockPrepareStageBattleUseCase();
    const snapshot = await usecase.execute({ stageId: '3' });

    expect(snapshot.stageLabel).toBe('STAGE 3');
  });
});
