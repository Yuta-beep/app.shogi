import { resetLocalBattleRegistry, setLocalBattlePieceCatalog } from '@/ai/local-battle-registry';
import { CommitGameMoveUseCase } from '@/usecases/stage-battle/commit-game-move-usecase';
import { CreateGameUseCase } from '@/usecases/stage-battle/create-game-usecase';
import { LoadGameLegalMovesUseCase } from '@/usecases/stage-battle/load-game-legal-moves-usecase';
import { LoadGameStateUseCase } from '@/usecases/stage-battle/load-game-state-usecase';
import { RequestAiMoveUseCase } from '@/usecases/stage-battle/request-ai-move-usecase';
import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

const pieceCatalog: PieceCatalogItem[] = [
  {
    pieceCode: 'OU',
    canonicalCode: 'OU',
    sfenCode: 'K',
    char: '王',
    name: '王',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [
      { dx: -1, dy: -1, maxStep: 1 },
      { dx: 0, dy: -1, maxStep: 1 },
      { dx: 1, dy: -1, maxStep: 1 },
      { dx: -1, dy: 0, maxStep: 1 },
      { dx: 1, dy: 0, maxStep: 1 },
      { dx: -1, dy: 1, maxStep: 1 },
      { dx: 0, dy: 1, maxStep: 1 },
      { dx: 1, dy: 1, maxStep: 1 },
    ],
    isRepeatable: true,
  },
  {
    pieceCode: 'FU',
    canonicalCode: 'FU',
    sfenCode: 'P',
    char: '歩',
    name: '歩',
    unlock: 'default',
    desc: '',
    skill: '',
    move: '',
    moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
    isRepeatable: true,
  },
];

describe('local game usecases', () => {
  beforeEach(() => {
    resetLocalBattleRegistry();
    setLocalBattlePieceCatalog(pieceCatalog);
  });

  it('creates, loads, commits, and resolves an AI turn locally', async () => {
    const createGame = new CreateGameUseCase();
    const loadLegalMoves = new LoadGameLegalMovesUseCase();
    const commitMove = new CommitGameMoveUseCase();
    const loadState = new LoadGameStateUseCase();
    const requestAiMove = new RequestAiMoveUseCase();

    const created = await createGame.execute({
      playerId: 'player-1',
      stageNo: 1,
      initialPosition: {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        sfen: '4k4/9/9/9/9/9/9/4P4/4K4 b - 1',
        stateHash: 'seed',
        boardState: {
          pieces: [
            { side: 'enemy', row: 0, col: 4, pieceCode: 'OU', char: '王', promoted: false },
            { side: 'player', row: 7, col: 4, pieceCode: 'FU', char: '歩', promoted: false },
            { side: 'player', row: 8, col: 4, pieceCode: 'OU', char: '王', promoted: false },
          ],
        },
        hands: { player: {}, enemy: {} },
      },
    });

    const legal = await loadLegalMoves.execute({ gameId: created.gameId });
    const forwardMove = legal.legalMoves.find(
      (move) => move.fromRow === 7 && move.fromCol === 4 && move.toRow === 6 && move.toCol === 4,
    );
    expect(forwardMove).toBeDefined();

    await commitMove.execute({
      gameId: created.gameId,
      moveNo: 1,
      actorSide: 'player',
      move: forwardMove!,
      stateHash: legal.stateHash,
    });

    const aiTurn = await requestAiMove.execute({
      gameId: created.gameId,
      moveNo: 2,
      stateHash: null,
      engineConfig: {},
    });
    expect(aiTurn.position.moveCount).toBe(2);

    const latest = await loadState.execute({ gameId: created.gameId });
    expect(latest.position.moveCount).toBe(2);
  });
});
