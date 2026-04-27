import { postJson } from '@/infra/http/api-client';
import { supabase } from '@/lib/supabase/supabase-client';
import { FinishStageBattleSessionUseCase } from '@/usecases/stage-battle/finish-stage-battle-session-usecase';
import { StartStageBattleSessionUseCase } from '@/usecases/stage-battle/start-stage-battle-session-usecase';

jest.mock('@/infra/http/api-client', () => ({
  postJson: jest.fn(),
}));

jest.mock('@/lib/supabase/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

const mockedPostJson = postJson as jest.MockedFunction<typeof postJson>;
const mockedGetSession = jest.mocked(supabase.auth.getSession);

describe('stage battle session usecases', () => {
  beforeEach(() => {
    mockedPostJson.mockReset();
    mockedGetSession.mockReset();
    mockedGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
  });

  it('starts a stage battle session via http and parses the payload', async () => {
    mockedPostJson.mockResolvedValue({
      battleSessionId: 'session-1',
      expiresAt: '2026-04-24T12:00:00.000Z',
      stage: {
        stageNo: 1,
        stageName: 'S1',
        clearConditionType: 'defeat_boss',
        clearConditionParams: {},
        stageCategory: 'normal',
      },
      labels: { stageLabel: 'S1', turnLabel: 'TURN 1', handLabel: '持ち駒' },
      board: { size: 9, placements: [] },
      enemyRoster: [],
      rewards: [],
    });

    const result = await new StartStageBattleSessionUseCase().execute({ stageNo: 1 });

    expect(mockedPostJson).toHaveBeenCalledWith(
      '/api/v1/stage-battles/start',
      { stageNo: 1 },
      { token: 'token-123' },
    );
    expect(result.stage.stageNo).toBe(1);
  });

  it('finishes a stage battle session via http and parses the payload', async () => {
    mockedPostJson.mockResolvedValue({
      battleSessionId: 'session-1',
      status: 'finished',
      result: 'cleared',
      stageNo: 1,
      clearApplied: true,
      firstClear: true,
      clearCount: 1,
      granted: { pawn: 10, gold: 1, pieces: [] },
      wallet: { pawnCurrency: 10, goldCurrency: 1 },
    });

    const result = await new FinishStageBattleSessionUseCase().execute({
      battleSessionId: 'session-1',
      result: 'cleared',
    });

    expect(mockedPostJson).toHaveBeenCalledWith(
      '/api/v1/stage-battles/finish',
      {
        battleSessionId: 'session-1',
        result: 'cleared',
      },
      { token: 'token-123' },
    );
    expect(result.result).toBe('cleared');
  });
});
