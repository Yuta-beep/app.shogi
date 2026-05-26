import { resetLocalBattleRegistry } from '@/ai/local-battle-registry';

const mockSnapshot = {
  playerName: 'Test',
  rating: 0,
  pawnCurrency: 0,
  goldCurrency: 0,
  playerRank: 1,
  playerExp: 0,
  stamina: 50,
  maxStamina: 50,
  nextRecoveryAt: null as string | null,
};

jest.mock('@/lib/config/data-source', () => ({
  isApiDataSource: jest.fn(() => true),
}));

jest.mock('@/hooks/common/home-snapshot-store', () => ({
  getHomeSnapshotState: () => ({ snapshot: mockSnapshot, isLoading: false, error: null }),
  loadHomeSnapshot: jest.fn(async () => mockSnapshot),
  patchHomeSnapshotStamina: (next: { stamina: number; nextRecoveryAt: string | null }) => {
    mockSnapshot.stamina = next.stamina;
    mockSnapshot.nextRecoveryAt = next.nextRecoveryAt;
  },
}));

jest.mock('@/lib/stamina/spend-stage-stamina', () => {
  const actual = jest.requireActual<typeof import('@/lib/stamina/spend-stage-stamina')>(
    '@/lib/stamina/spend-stage-stamina',
  );
  return {
    ...actual,
    ensureNormalStageStaminaCharged: jest.fn(actual.ensureNormalStageStaminaCharged),
  };
});

import {
  LocalClaimStageClearRewardUseCase,
  LocalPrepareStageBattleUseCase,
} from '@/usecases/stage-battle/local-stage-battle-usecases';
import {
  ensureNormalStageStaminaCharged,
  resetMockStaminaState,
} from '@/lib/stamina/spend-stage-stamina';

jest.mock('@/lib/supabase/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

describe('local stage battle usecases', () => {
  beforeEach(() => {
    resetLocalBattleRegistry();
    resetMockStaminaState(50);
    mockSnapshot.stamina = 50;
    jest.mocked(ensureNormalStageStaminaCharged).mockClear();
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
    expect(ensureNormalStageStaminaCharged).toHaveBeenCalledWith(50);
  });

  it('reuses an active session for the same stage without starting again', async () => {
    const start = jest.fn().mockResolvedValue({
      battleSessionId: 'session-reuse',
      expiresAt: '2026-04-24T00:00:00Z',
      stage: {
        stageNo: 5,
        stageName: 'Stage 5',
        clearConditionType: 'defeat_boss',
        clearConditionParams: {},
        stageCategory: 'normal',
      },
      labels: { stageLabel: 'S5', turnLabel: 'TURN 1', handLabel: '持ち駒' },
      board: { size: 9, placements: [] },
      enemyRoster: [],
      rewards: [],
    });
    const usecase = new LocalPrepareStageBattleUseCase({ execute: start } as never);

    await usecase.execute({ stageId: '5' });
    await usecase.execute({ stageId: '5' });

    expect(start).toHaveBeenCalledTimes(1);
    expect(ensureNormalStageStaminaCharged).toHaveBeenCalledTimes(1);
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
