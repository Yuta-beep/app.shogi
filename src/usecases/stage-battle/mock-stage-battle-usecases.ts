import {
  ClaimStageClearRewardUseCase,
  StageClearRewardResult,
} from '@/usecases/stage-battle/claim-stage-clear-reward-usecase';
import {
  throwIfInsufficientStageStamina,
  trySpendNormalStageStamina,
} from '@/lib/stamina/spend-stage-stamina';
import {
  PrepareStageBattleUseCase,
  StageBattleSnapshot,
} from '@/usecases/stage-battle/prepare-stage-battle-usecase';

let mockPreparedStageId: string | null = null;

const mockSnapshot = (stageLabel: string): StageBattleSnapshot => ({
  stageLabel,
  turnLabel: 'TURN 12 / 99',
  handLabel: '歩 x2 / 桂 x1 / 角 x1',
  boardSize: 9,
  placements: [],
});

export class MockPrepareStageBattleUseCase implements PrepareStageBattleUseCase {
  async execute(input: { stageId?: string }): Promise<StageBattleSnapshot> {
    if (!input.stageId) {
      return mockSnapshot('STAGE');
    }

    if (mockPreparedStageId === input.stageId) {
      return mockSnapshot(`STAGE ${input.stageId}`);
    }

    const spend = trySpendNormalStageStamina();
    throwIfInsufficientStageStamina(spend);
    mockPreparedStageId = input.stageId;

    return mockSnapshot(`STAGE ${input.stageId}`);
  }
}

export function resetMockPreparedStageId(): void {
  mockPreparedStageId = null;
}

export class MockClaimStageClearRewardUseCase implements ClaimStageClearRewardUseCase {
  async execute(input: {
    stageId?: string;
    result?: 'cleared' | 'failed';
  }): Promise<StageClearRewardResult | null> {
    if (input.result === 'failed') return null;
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
