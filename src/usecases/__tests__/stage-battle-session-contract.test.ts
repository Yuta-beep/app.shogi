import { describe, expect, it } from '@jest/globals';

import {
  parseStageBattleSessionFinish,
  parseStageBattleSessionStart,
} from '@/usecases/stage-battle/stage-battle-session-contract';

describe('stage battle session contract', () => {
  it('parses start payload', () => {
    const parsed = parseStageBattleSessionStart({
      battleSessionId: 'session-1',
      expiresAt: '2026-04-24T12:00:00.000Z',
      stage: {
        stageNo: 1,
        stageName: 'S1',
        clearConditionType: 'defeat_boss',
        clearConditionParams: { target: 'boss' },
        stageCategory: 'normal',
      },
      labels: {
        stageLabel: 'S1',
        turnLabel: 'TURN 1',
        handLabel: '持ち駒',
      },
      board: {
        size: 9,
        placements: [],
      },
      enemyRoster: [],
      rewards: [],
    });

    expect(parsed.battleSessionId).toBe('session-1');
    expect(parsed.stage.stageNo).toBe(1);
    expect(parsed.board.size).toBe(9);
  });

  it('parses finish payload', () => {
    const parsed = parseStageBattleSessionFinish({
      battleSessionId: 'session-1',
      status: 'finished',
      result: 'cleared',
      stageNo: 1,
      clearApplied: true,
      firstClear: true,
      clearCount: 1,
      granted: {
        pawn: 10,
        gold: 2,
        pieces: [{ pieceId: 100, char: '忍', name: '忍', quantity: 1 }],
      },
      wallet: {
        pawnCurrency: 10,
        goldCurrency: 2,
      },
    });

    expect(parsed.result).toBe('cleared');
    expect(parsed.granted.pieces[0]?.pieceId).toBe(100);
    expect(parsed.wallet.goldCurrency).toBe(2);
  });
});
