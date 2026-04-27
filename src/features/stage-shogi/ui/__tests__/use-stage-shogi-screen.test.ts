import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ApiClientError } from '@/infra/http/api-client';
import type { StageBattleSnapshot } from '@/usecases/stage-battle/prepare-stage-battle-usecase';
import type {
  BattleCanonicalPosition,
  BattleCommittedMove,
  BattleGameStatus,
  BattleLegalMoves,
  BattleMove,
} from '@/usecases/stage-battle/game-move-contract';
import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

import { useStageShogiScreen } from '@/features/stage-shogi/ui/use-stage-shogi-screen';

const mockUseStageBattleScreen = jest.fn();
const mockLoadPieceCatalogExecute = jest.fn();
const mockClaimStageClearRewardExecute = jest.fn();
const mockCreateGameExecute = jest.fn();
const mockCommitGameMoveExecute = jest.fn();
const mockLoadGameStateExecute = jest.fn();
const mockLoadGameLegalMovesExecute = jest.fn();
const mockRequestAiMoveExecute = jest.fn();
const mockSetLocalBattlePieceCatalog = jest.fn();

jest.mock('@/features/stage-shogi/ui/use-stage-battle-screen', () => ({
  useStageBattleScreen: (...args: unknown[]) => mockUseStageBattleScreen(...args),
}));

jest.mock('@/ai/local-battle-registry', () => ({
  setLocalBattlePieceCatalog: (...args: unknown[]) => mockSetLocalBattlePieceCatalog(...args),
}));

jest.mock('@/usecases/piece-info/create-piece-info-usecases', () => ({
  createLoadPieceCatalogUseCase: () => ({
    execute: (...args: unknown[]) => mockLoadPieceCatalogExecute(...args),
  }),
}));

jest.mock('@/usecases/stage-battle/create-stage-battle-usecases', () => ({
  createClaimStageClearRewardUseCase: () => ({
    execute: (...args: unknown[]) => mockClaimStageClearRewardExecute(...args),
  }),
}));

jest.mock('@/usecases/stage-battle/create-game-usecase', () => ({
  CreateGameUseCase: jest.fn().mockImplementation(() => ({
    execute: (...args: unknown[]) => mockCreateGameExecute(...args),
  })),
}));

jest.mock('@/usecases/stage-battle/commit-game-move-usecase', () => ({
  CommitGameMoveUseCase: jest.fn().mockImplementation(() => ({
    execute: (...args: unknown[]) => mockCommitGameMoveExecute(...args),
  })),
}));

jest.mock('@/usecases/stage-battle/load-game-state-usecase', () => ({
  LoadGameStateUseCase: jest.fn().mockImplementation(() => ({
    execute: (...args: unknown[]) => mockLoadGameStateExecute(...args),
  })),
}));

jest.mock('@/usecases/stage-battle/load-game-legal-moves-usecase', () => ({
  LoadGameLegalMovesUseCase: jest.fn().mockImplementation(() => ({
    execute: (...args: unknown[]) => mockLoadGameLegalMovesExecute(...args),
  })),
}));

jest.mock('@/usecases/stage-battle/request-ai-move-usecase', () => ({
  RequestAiMoveUseCase: jest.fn().mockImplementation(() => ({
    execute: (...args: unknown[]) => mockRequestAiMoveExecute(...args),
  })),
}));

function createCatalogItem(
  overrides: Partial<PieceCatalogItem> & Pick<PieceCatalogItem, 'pieceCode' | 'char' | 'name'>,
): PieceCatalogItem {
  return {
    pieceId: 1,
    pieceCode: overrides.pieceCode,
    sfenCode: overrides.sfenCode ?? overrides.pieceCode,
    canonicalCode: overrides.canonicalCode ?? overrides.pieceCode ?? undefined,
    isPromoted: overrides.isPromoted ?? false,
    moveCode: overrides.moveCode ?? null,
    char: overrides.char,
    name: overrides.name,
    imageSignedUrl: overrides.imageSignedUrl ?? null,
    quantity: overrides.quantity ?? 1,
    unlock: overrides.unlock ?? '',
    desc: overrides.desc ?? '',
    skill: overrides.skill ?? '',
    move: overrides.move ?? '',
    moveVectors: overrides.moveVectors ?? [],
    isRepeatable: overrides.isRepeatable ?? false,
    canJump: overrides.canJump ?? false,
    moveConstraints: overrides.moveConstraints ?? null,
    moveRules: overrides.moveRules ?? [],
  };
}

function createSnapshot(
  placements: StageBattleSnapshot['placements'],
  overrides?: Partial<StageBattleSnapshot>,
): StageBattleSnapshot {
  return {
    stageLabel: 'STAGE 1',
    turnLabel: 'TURN 1 / 1',
    handLabel: '',
    boardSize: 9,
    placements,
    ...overrides,
  };
}

function createPosition(
  sfen: string,
  overrides?: Partial<BattleCanonicalPosition>,
): BattleCanonicalPosition {
  return {
    sideToMove: overrides?.sideToMove ?? 'player',
    turnNumber: overrides?.turnNumber ?? 1,
    moveCount: overrides?.moveCount ?? 0,
    sfen,
    stateHash: overrides?.stateHash ?? 'state-1',
    boardState: overrides?.boardState ?? {},
    hands: overrides?.hands ?? { player: {}, enemy: {} },
  };
}

function createGame(overrides?: Partial<BattleGameStatus>): BattleGameStatus {
  return {
    status: overrides?.status ?? 'in_progress',
    result: overrides?.result ?? null,
    winnerSide: overrides?.winnerSide ?? null,
  };
}

function createLegalMoves(
  legalMoves: BattleMove[],
  overrides?: Partial<BattleLegalMoves>,
): BattleLegalMoves {
  return {
    sideToMove: overrides?.sideToMove ?? 'player',
    moveNo: overrides?.moveNo ?? 1,
    stateHash: overrides?.stateHash ?? 'state-1',
    legalMoves,
  };
}

async function renderReadyHook(options: {
  snapshot: StageBattleSnapshot;
  pieceCatalog: PieceCatalogItem[];
  legalMoves: BattleLegalMoves;
  stageParam?: string;
}) {
  mockUseStageBattleScreen.mockReturnValue({
    snapshot: options.snapshot,
    isLoading: false,
    loadError: null,
  });
  mockLoadPieceCatalogExecute.mockResolvedValue(options.pieceCatalog);
  mockClaimStageClearRewardExecute.mockResolvedValue(null);
  mockCreateGameExecute.mockResolvedValue({
    gameId: 'game-1',
    status: 'in_progress',
    startedAt: '2026-04-27T00:00:00.000Z',
  });
  mockLoadGameLegalMovesExecute.mockResolvedValue(options.legalMoves);
  mockRequestAiMoveExecute.mockResolvedValue({
    selectedMove: null,
    skillTriggered: false,
    meta: null,
    position: createPosition(
      options.legalMoves.moveNo === 1 ? '9/9/9/9/9/9/9/9/9' : '9/9/9/9/9/9/9/9/9',
    ),
    game: createGame(),
  });

  const rendered = renderHook(() => useStageShogiScreen(options.stageParam, 'user-1'));

  await waitFor(() => expect(mockCreateGameExecute).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(mockLoadGameLegalMovesExecute).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(rendered.result.current.isBootstrappingBattle).toBe(false));

  return rendered;
}

describe('useStageShogiScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('成り候補が2つある着手では成りダイアログを開き、成る選択で promote=true を送る', async () => {
    const pieceCatalog = [
      createCatalogItem({
        pieceCode: 'FU',
        char: '歩',
        name: '歩兵',
        sfenCode: 'P',
        moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
      }),
      createCatalogItem({
        pieceCode: 'TO',
        char: 'と',
        name: 'と金',
        sfenCode: '+P',
        isPromoted: true,
      }),
    ];
    const legalMoves = createLegalMoves([
      {
        fromRow: 1,
        fromCol: 0,
        toRow: 0,
        toCol: 0,
        pieceCode: 'FU',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
      {
        fromRow: 1,
        fromCol: 0,
        toRow: 0,
        toCol: 0,
        pieceCode: 'FU',
        promote: true,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    ]);
    const committed: BattleCommittedMove = {
      moveNo: 1,
      actorSide: 'player',
      move: legalMoves.legalMoves[1],
      skillTriggered: false,
      position: createPosition('+P8/9/9/9/9/9/9/9/9', {
        sideToMove: 'enemy',
        turnNumber: 2,
        moveCount: 1,
      }),
      game: createGame({
        status: 'finished',
        result: 'player_win',
        winnerSide: 'player',
      }),
    };
    mockCommitGameMoveExecute.mockResolvedValue(committed);

    const { result } = await renderReadyHook({
      snapshot: createSnapshot([
        {
          side: 'player',
          row: 2,
          col: 1,
          pieceId: 1,
          pieceCode: 'FU',
          char: '歩',
          imageBucket: null,
          imageKey: null,
          imageSignedUrl: null,
        },
      ]),
      pieceCatalog,
      legalMoves,
    });

    act(() => {
      result.current.handleBoardCellPress(1, 0);
    });
    act(() => {
      result.current.handleBoardCellPress(0, 0);
    });

    expect(result.current.pendingPromotion).not.toBeNull();

    act(() => {
      result.current.commitPendingPromotion('promote');
    });

    await waitFor(() =>
      expect(mockCommitGameMoveExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          actorSide: 'player',
          move: expect.objectContaining({
            fromRow: 1,
            fromCol: 0,
            toRow: 0,
            toCol: 0,
            promote: true,
          }),
        }),
      ),
    );
    await waitFor(() => expect(result.current.winner).toBe('player'));
    expect(result.current.pendingPromotion).toBeNull();
  });

  it('時駒のスキル選択では time_skill_only を送る', async () => {
    const pieceCatalog = [
      createCatalogItem({
        pieceCode: 'TIME',
        char: '時',
        name: '時',
        sfenCode: '#',
        moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
      }),
      createCatalogItem({
        pieceCode: 'FU',
        char: '歩',
        name: '歩兵',
        sfenCode: 'P',
      }),
    ];
    const legalMoves = createLegalMoves([
      {
        fromRow: 4,
        fromCol: 4,
        toRow: 3,
        toCol: 4,
        pieceCode: 'TIME',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    ]);
    mockCommitGameMoveExecute.mockResolvedValue({
      moveNo: 1,
      actorSide: 'player',
      move: legalMoves.legalMoves[0],
      skillTriggered: false,
      position: createPosition('9/9/9/9/9/9/9/9/9', {
        sideToMove: 'enemy',
        turnNumber: 2,
        moveCount: 1,
      }),
      game: createGame({
        status: 'finished',
        result: 'player_win',
        winnerSide: 'player',
      }),
    });

    const { result } = await renderReadyHook({
      snapshot: createSnapshot([
        {
          side: 'player',
          row: 5,
          col: 5,
          pieceId: 1,
          pieceCode: 'TIME',
          char: '時',
          imageBucket: null,
          imageKey: null,
          imageSignedUrl: null,
        },
        {
          side: 'enemy',
          row: 5,
          col: 6,
          pieceId: 2,
          pieceCode: 'FU',
          char: '歩',
          imageBucket: null,
          imageKey: null,
          imageSignedUrl: null,
        },
      ]),
      pieceCatalog,
      legalMoves,
    });

    act(() => {
      result.current.handleBoardCellPress(4, 4);
    });

    expect(result.current.pendingTimeActionCell).toEqual({ row: 4, col: 4 });

    act(() => {
      result.current.confirmTimeAction('skill');
    });

    await waitFor(() =>
      expect(mockCommitGameMoveExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          move: expect.objectContaining({
            fromRow: 4,
            fromCol: 4,
            toRow: 4,
            toCol: 4,
            notation: 'time_skill_only',
          }),
        }),
      ),
    );
  });

  it('時駒の通常移動選択では通常手を選択し notation を null にする', async () => {
    const pieceCatalog = [
      createCatalogItem({
        pieceCode: 'TIME',
        char: '時',
        name: '時',
        sfenCode: '#',
        moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
      }),
      createCatalogItem({
        pieceCode: 'FU',
        char: '歩',
        name: '歩兵',
        sfenCode: 'P',
      }),
    ];
    const legalMoves = createLegalMoves([
      {
        fromRow: 4,
        fromCol: 4,
        toRow: 3,
        toCol: 4,
        pieceCode: 'TIME',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: 'time_skill',
      },
    ]);
    mockCommitGameMoveExecute.mockResolvedValue({
      moveNo: 1,
      actorSide: 'player',
      move: legalMoves.legalMoves[0],
      skillTriggered: false,
      position: createPosition('9/9/9/9/9/9/9/9/9', {
        sideToMove: 'enemy',
        turnNumber: 2,
        moveCount: 1,
      }),
      game: createGame({
        status: 'finished',
        result: 'player_win',
        winnerSide: 'player',
      }),
    });

    const { result } = await renderReadyHook({
      snapshot: createSnapshot([
        {
          side: 'player',
          row: 5,
          col: 5,
          pieceId: 1,
          pieceCode: 'TIME',
          char: '時',
          imageBucket: null,
          imageKey: null,
          imageSignedUrl: null,
        },
        {
          side: 'enemy',
          row: 5,
          col: 6,
          pieceId: 2,
          pieceCode: 'FU',
          char: '歩',
          imageBucket: null,
          imageKey: null,
          imageSignedUrl: null,
        },
      ]),
      pieceCatalog,
      legalMoves,
    });

    act(() => {
      result.current.handleBoardCellPress(4, 4);
    });
    act(() => {
      result.current.confirmTimeAction('normal');
    });

    expect(result.current.pendingTimeActionCell).toBeNull();
    expect(result.current.selectedCell).toEqual({ row: 4, col: 4 });

    act(() => {
      result.current.handleBoardCellPress(3, 4);
    });

    await waitFor(() =>
      expect(mockCommitGameMoveExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          move: expect.objectContaining({
            fromRow: 4,
            fromCol: 4,
            toRow: 3,
            toCol: 4,
            notation: null,
          }),
        }),
      ),
    );
  });

  it('違法手エラー時は最新局面へ自動復旧して継続メッセージを出す', async () => {
    const pieceCatalog = [
      createCatalogItem({
        pieceCode: 'FU',
        char: '歩',
        name: '歩兵',
        sfenCode: 'P',
        moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
      }),
    ];
    const initialLegalMoves = createLegalMoves([
      {
        fromRow: 2,
        fromCol: 0,
        toRow: 1,
        toCol: 0,
        pieceCode: 'FU',
        promote: false,
        dropPieceCode: null,
        capturedPieceCode: null,
        notation: null,
      },
    ]);
    mockCommitGameMoveExecute.mockRejectedValue(
      new ApiClientError({
        code: 'ILLEGAL_MOVE',
        message: 'illegal move',
      }),
    );
    mockLoadGameStateExecute.mockResolvedValue({
      gameId: 'game-1',
      position: createPosition('9/9/P8/9/9/9/9/9/9', {
        sideToMove: 'player',
        turnNumber: 1,
        moveCount: 0,
        stateHash: 'recovered-hash',
      }),
      game: createGame(),
    });
    mockLoadGameLegalMovesExecute
      .mockResolvedValueOnce(initialLegalMoves)
      .mockResolvedValueOnce(
        createLegalMoves(initialLegalMoves.legalMoves, { stateHash: 'recovered-hash' }),
      );

    const { result } = await renderReadyHook({
      snapshot: createSnapshot([
        {
          side: 'player',
          row: 3,
          col: 1,
          pieceId: 1,
          pieceCode: 'FU',
          char: '歩',
          imageBucket: null,
          imageKey: null,
          imageSignedUrl: null,
        },
      ]),
      pieceCatalog,
      legalMoves: initialLegalMoves,
    });

    act(() => {
      result.current.handleBoardCellPress(2, 0);
    });
    act(() => {
      result.current.handleBoardCellPress(1, 0);
    });

    await waitFor(() => expect(mockLoadGameStateExecute).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockLoadGameLegalMovesExecute).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(result.current.aiError).toBe('局面を自動更新しました。対局を続行します。'),
    );
    expect(result.current.pieces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          side: 'player',
          row: 2,
          col: 0,
          pieceCode: 'FU',
        }),
      ]),
    );
    expect(
      result.current.pieces.some(
        (piece) => piece.side === 'player' && piece.row === 1 && piece.col === 0,
      ),
    ).toBe(false);
  });
});
