import {
  ClaimStageClearRewardUseCase,
  StageClearRewardResult,
} from '@/usecases/stage-battle/claim-stage-clear-reward-usecase';
import {
  PrepareStageBattleUseCase,
  StageBattleSnapshot,
} from '@/usecases/stage-battle/prepare-stage-battle-usecase';

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

export class MockClaimStageClearRewardUseCase implements ClaimStageClearRewardUseCase {
  async execute(input: { stageId?: string }): Promise<StageClearRewardResult | null> {
    if (!input.stageId) return null;
    const stageNo = Number(input.stageId);
    if (!Number.isInteger(stageNo) || stageNo <= 0) return null;

    return {
      stageNo,
      firstClear: true,
      clearCount: 1,
      granted: {
        pawn: 12,
        gold: 2,
        pieces: [],
      },
      wallet: {
        pawnCurrency: 12,
        goldCurrency: 2,
      },
    };
  }
}
