import { PrepareStageBattleUseCase, StageBattleSnapshot } from '@/usecases/stage-battle/prepare-stage-battle-usecase';

export class MockPrepareStageBattleUseCase implements PrepareStageBattleUseCase {
  async execute(input: { stageId?: string }): Promise<StageBattleSnapshot> {
    const stageLabel = input.stageId ? `STAGE ${input.stageId}` : 'STAGE';

    return {
      stageLabel,
      turnLabel: 'TURN 12 / 99',
      handLabel: '歩 x2 / 桂 x1 / 角 x1',
      boardSize: 9,
      placements: [],
    };
  }
}
