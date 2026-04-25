import {
  normalizeBattlePosition,
  normalizePieceCatalog,
  normalizeStageBattleSession,
} from '@/ai/model';

describe('ai model normalization', () => {
  it('normalizes battle position hands and move counters', () => {
    const position = normalizeBattlePosition({
      sideToMove: 'player',
      turnNumber: 1.9,
      moveCount: 0.2,
      sfen: '9/9/9/9/9/9/9/9/9 b - 1',
      stateHash: null,
      boardState: { pieces: [] },
      hands: {
        player: { fu: 2.8, bad: Number.NaN as unknown as number },
        enemy: {},
      },
    });

    expect(position.turnNumber).toBe(1);
    expect(position.moveCount).toBe(0);
    expect(position.hands.player.FU).toBe(2);
  });

  it('normalizes stage session placements', () => {
    const session = normalizeStageBattleSession({
      battleSessionId: 'session-1',
      expiresAt: '2026-04-24T00:00:00Z',
      stage: {
        stageNo: 1,
        stageName: 'Stage 1',
        clearConditionType: 'defeat_boss',
        clearConditionParams: {},
        stageCategory: 'normal',
      },
      labels: {
        stageLabel: 'Stage 1',
        turnLabel: 'TURN 1',
        handLabel: '持ち駒',
      },
      board: {
        size: 9,
        placements: [
          {
            side: 'player',
            row: 8,
            col: 4,
            piece: {
              id: 1,
              code: 'OU',
              char: '王',
              imageBucket: null,
              imageKey: null,
            },
          },
        ],
      },
      enemyRoster: [],
      rewards: [],
    });

    expect(session.board.placements[0]?.piece.code).toBe('OU');
  });

  it('normalizes piece catalog codes', () => {
    const catalog = normalizePieceCatalog([
      {
        pieceCode: 'fu',
        canonicalCode: 'fu',
        sfenCode: 'p',
        char: '歩',
        name: '歩',
        unlock: 'default',
        desc: '',
        skill: '',
        move: '',
        moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
        isRepeatable: true,
      },
    ]);

    expect(catalog[0]?.pieceCode).toBe('FU');
    expect(catalog[0]?.sfenCode).toBe('P');
  });
});
