import { resetLocalBattleRegistry } from '@/ai/local-battle-registry';
import {
  LocalClaimStageClearRewardUseCase,
  LocalPrepareStageBattleUseCase,
} from '@/usecases/stage-battle/local-stage-battle-usecases';

describe('local stage battle usecases', () => {
  beforeEach(() => {
    resetLocalBattleRegistry();
  });

  it('returns fallback snapshot when stage id is missing', async () => {
    const usecase = new LocalPrepareStageBattleUseCase({
      execute: jest.fn(),
    } as never);

    const snapshot = await usecase.execute({});

    expect(snapshot.stageLabel).toBe('STAGE');
    expect(snapshot.placements).toHaveLength(0);
  });

  it('starts a stage session and maps placements', async () => {
    const usecase = new LocalPrepareStageBattleUseCase({
      execute: jest.fn().mockResolvedValue({
        battleSessionId: 'session-1',
        expiresAt: '2026-04-24T00:00:00Z',
        stage: {
          stageNo: 1,
          stageName: 'Stage 1',
          clearConditionType: 'defeat_boss',
          clearConditionParams: {},
          stageCategory: 'normal',
        },
        labels: { stageLabel: 'S1', turnLabel: 'TURN 1', handLabel: '持ち駒' },
        board: {
          size: 9,
          placements: [
            {
              side: 'player',
              row: 8,
              col: 4,
              piece: { id: 1, code: 'OU', char: '王', imageBucket: null, imageKey: null },
            },
          ],
        },
        enemyRoster: [],
        rewards: [],
      }),
    } as never);

    const snapshot = await usecase.execute({ stageId: '1' });

    expect(snapshot.stageLabel).toBe('Stage 1');
    expect(snapshot.placements[0]?.pieceCode).toBe('OU');
  });

  it('finishes a cleared session and returns rewards', async () => {
    const prepare = new LocalPrepareStageBattleUseCase({
      execute: jest.fn().mockResolvedValue({
        battleSessionId: 'session-2',
        expiresAt: '2026-04-24T00:00:00Z',
        stage: {
          stageNo: 2,
          stageName: 'Stage 2',
          clearConditionType: 'defeat_boss',
          clearConditionParams: {},
          stageCategory: 'normal',
        },
        labels: { stageLabel: 'S2', turnLabel: 'TURN 1', handLabel: '持ち駒' },
        board: { size: 9, placements: [] },
        enemyRoster: [],
        rewards: [],
      }),
    } as never);
    await prepare.execute({ stageId: '2' });

    const claim = new LocalClaimStageClearRewardUseCase({
      execute: jest.fn().mockResolvedValue({
        battleSessionId: 'session-2',
        status: 'finished',
        result: 'cleared',
        stageNo: 2,
        clearApplied: true,
        firstClear: true,
        clearCount: 1,
        granted: { pawn: 10, gold: 1, pieces: [] },
        wallet: { pawnCurrency: 10, goldCurrency: 1 },
      }),
    } as never);

    const result = await claim.execute({ stageId: '2', result: 'cleared' });

    expect(result?.stageNo).toBe(2);
    expect(result?.wallet.goldCurrency).toBe(1);
  });

  it('returns null for failed result and clears the session', async () => {
    const prepare = new LocalPrepareStageBattleUseCase({
      execute: jest.fn().mockResolvedValue({
        battleSessionId: 'session-3',
        expiresAt: '2026-04-24T00:00:00Z',
        stage: {
          stageNo: 3,
          stageName: 'Stage 3',
          clearConditionType: 'defeat_boss',
          clearConditionParams: {},
          stageCategory: 'normal',
        },
        labels: { stageLabel: 'S3', turnLabel: 'TURN 1', handLabel: '持ち駒' },
        board: { size: 9, placements: [] },
        enemyRoster: [],
        rewards: [],
      }),
    } as never);
    await prepare.execute({ stageId: '3' });

    const claim = new LocalClaimStageClearRewardUseCase({
      execute: jest.fn().mockResolvedValue({
        battleSessionId: 'session-3',
        status: 'finished',
        result: 'failed',
        stageNo: 3,
        clearApplied: false,
        firstClear: false,
        clearCount: null,
        granted: { pawn: 0, gold: 0, pieces: [] },
        wallet: { pawnCurrency: 0, goldCurrency: 0 },
      }),
    } as never);

    await expect(claim.execute({ stageId: '3', result: 'failed' })).resolves.toBeNull();
  });
});
