import {
  clearActiveStageSession,
  createLocalBattleGame,
  getActiveStageSession,
  getLocalBattleGame,
  registerActiveStageSession,
  resetLocalBattleRegistry,
  setLocalBattlePieceCatalog,
  updateLocalBattleGame,
} from '@/ai/local-battle-registry';

describe('local battle registry', () => {
  beforeEach(() => {
    resetLocalBattleRegistry();
  });

  it('stores normalized piece catalog and stage session', () => {
    setLocalBattlePieceCatalog([
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

    registerActiveStageSession({
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
    });

    expect(getActiveStageSession()?.board.placements[0]?.piece.code).toBe('OU');
    clearActiveStageSession();
    expect(getActiveStageSession()).toBeNull();
  });

  it('creates and updates a local game with normalized snapshots', () => {
    const created = createLocalBattleGame({
      playerId: 'player-1',
      stageNo: 1,
      position: {
        sideToMove: 'player',
        turnNumber: 1.9,
        moveCount: 0.2,
        sfen: '9/9/9/9/9/9/9/9/9 b - 1',
        stateHash: null,
        boardState: { pieces: [] },
        hands: { player: { fu: 2 }, enemy: {} },
      },
    });

    const loaded = getLocalBattleGame(created.gameId);
    expect(loaded?.position.turnNumber).toBe(1);
    expect(loaded?.position.hands.player.FU).toBe(2);

    updateLocalBattleGame(created.gameId, (current) => ({
      ...current,
      game: { status: 'finished', result: 'player_win', winnerSide: 'player' },
    }));

    expect(getLocalBattleGame(created.gameId)?.game.status).toBe('finished');
  });
});
