import { normalizeBattleGameStatus } from '@/ai/model/game';

describe('ai model game', () => {
  it('keeps a valid finished status', () => {
    const game = normalizeBattleGameStatus({
      status: 'finished',
      result: 'enemy_win',
      winnerSide: 'enemy',
    });

    expect(game.status).toBe('finished');
    expect(game.result).toBe('enemy_win');
    expect(game.winnerSide).toBe('enemy');
  });

  it('falls back to in_progress for an invalid status', () => {
    const game = normalizeBattleGameStatus({
      status: 'broken' as never,
      result: 'enemy_win',
      winnerSide: 'enemy',
    });

    expect(game).toEqual({
      status: 'in_progress',
      result: null,
      winnerSide: null,
    });
  });
});
