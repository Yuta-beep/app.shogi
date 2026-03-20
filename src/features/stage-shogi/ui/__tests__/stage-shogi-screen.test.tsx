import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { StageShogiScreen } from '@/features/stage-shogi/ui/stage-shogi-screen';

const mockPostJson = jest.fn();
const mockGetJson = jest.fn();
const mockExecutePieceCatalog = jest.fn();
const MockView = View;
const MockText = Text;
const stageBattleSnapshot = {
  stageLabel: 'STAGE 1',
  turnLabel: 'TURN 1',
  handLabel: '持ち駒',
  boardSize: 9,
  placements: [
    {
      side: 'player',
      row: 4,
      col: 4,
      pieceId: 1,
      pieceCode: 'KA',
      char: '角',
      imageBucket: null,
      imageKey: null,
      imageSignedUrl: null,
    },
    {
      side: 'player',
      row: 8,
      col: 4,
      pieceId: 2,
      pieceCode: 'OU',
      char: '王',
      imageBucket: null,
      imageKey: null,
      imageSignedUrl: null,
    },
    {
      side: 'enemy',
      row: 0,
      col: 4,
      pieceId: 3,
      pieceCode: 'OU',
      char: '玉',
      imageBucket: null,
      imageKey: null,
      imageSignedUrl: null,
    },
  ],
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ stage: '1' }),
}));

jest.mock('expo-image', () => {
  const Image = (props: Record<string, unknown>) => <MockView {...props} />;
  Image.prefetch = jest.fn(() => Promise.resolve(true));
  return { Image };
});

jest.mock('@/infra/http/api-client', () => ({
  getJson: (...args: unknown[]) => mockGetJson(...args),
  postJson: (...args: unknown[]) => mockPostJson(...args),
}));

jest.mock('@/usecases/piece-info/create-piece-info-usecases', () => ({
  createLoadPieceCatalogUseCase: () => ({
    execute: (...args: unknown[]) => mockExecutePieceCatalog(...args),
  }),
}));

jest.mock('@/features/stage-shogi/ui/use-stage-battle-screen', () => ({
  useStageBattleScreen: () => ({
    isLoading: false,
    snapshot: stageBattleSnapshot,
  }),
}));

jest.mock('@/hooks/common/use-auth-session', () => ({
  useAuthSession: () => ({ userId: 'user-1' }),
}));

jest.mock('@/hooks/common/use-asset-preload', () => ({
  useAssetPreload: () => ({ isReady: true }),
}));

jest.mock('@/hooks/common/use-screen-bgm', () => ({
  useScreenBgm: () => undefined,
}));

jest.mock('@/components/organism/ui-screen-shell', () => {
  return {
    UiScreenShell: ({ children }: { children: ReactNode }) => <MockView>{children}</MockView>,
  };
});

jest.mock('@/components/organism/app-loading-screen', () => {
  return {
    AppLoadingScreen: () => <MockText>loading</MockText>,
  };
});

describe('StageShogiScreen ai call', () => {
  beforeEach(() => {
    mockPostJson.mockReset();
    mockGetJson.mockReset();
    mockExecutePieceCatalog.mockReset();

    mockExecutePieceCatalog.mockResolvedValue([
      {
        pieceCode: 'KA',
        sfenCode: 'B',
        isPromoted: false,
        char: '角',
        name: '角行',
        unlock: '初期',
        desc: 'test',
        skill: 'なし',
        move: '斜め',
        moveVectors: [{ dx: 1, dy: 1, maxStep: 8 }],
        isRepeatable: false,
      },
      {
        pieceCode: 'OU',
        sfenCode: 'K',
        isPromoted: false,
        char: '王',
        name: '王将',
        unlock: '初期',
        desc: 'test',
        skill: 'なし',
        move: '周囲1',
        moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
        isRepeatable: false,
      },
      {
        pieceCode: 'OU',
        sfenCode: 'K',
        isPromoted: false,
        char: '玉',
        name: '玉将',
        unlock: '初期',
        desc: 'test',
        skill: 'なし',
        move: '周囲1',
        moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
        isRepeatable: false,
      },
    ]);

    let legalMovesCallCount = 0;
    let movePostCount = 0;

    mockGetJson.mockImplementation((path: string) => {
      if (path === '/api/v1/games/game-1/legal-moves') {
        legalMovesCallCount += 1;
        if (legalMovesCallCount === 1) {
          return Promise.resolve({
            sideToMove: 'player',
            moveNo: 1,
            stateHash: null,
            legalMoves: [
              {
                fromRow: 4,
                fromCol: 4,
                toRow: 4,
                toCol: 5,
                pieceCode: 'KA',
                promote: false,
                dropPieceCode: null,
                capturedPieceCode: null,
                notation: null,
              },
            ],
          });
        }

        return Promise.resolve({
          sideToMove: 'player',
          moveNo: 3,
          stateHash: null,
          legalMoves: [
            {
              fromRow: null,
              fromCol: null,
              toRow: 5,
              toCol: 4,
              pieceCode: 'FU',
              promote: false,
              dropPieceCode: 'FU',
              capturedPieceCode: null,
              notation: null,
            },
          ],
        });
      }

      return Promise.reject(new Error(`unexpected GET path: ${path}`));
    });

    mockPostJson.mockImplementation((path: string) => {
      if (path === '/api/v1/games') {
        return Promise.resolve({
          gameId: 'game-1',
          status: 'active',
          startedAt: '2026-03-10T00:00:00Z',
        });
      }
      if (path === '/api/v1/games/game-1/moves') {
        movePostCount += 1;
        if (movePostCount === 1) {
          return Promise.resolve({
            moveNo: 1,
            actorSide: 'player',
            move: {
              fromRow: 4,
              fromCol: 4,
              toRow: 4,
              toCol: 5,
              pieceCode: 'KA',
              promote: false,
              dropPieceCode: null,
              capturedPieceCode: null,
              notation: null,
            },
            position: {
              sideToMove: 'enemy',
              turnNumber: 2,
              moveCount: 1,
              sfen: '4k4/9/9/9/5B3/9/9/9/4K4 w - 2',
              stateHash: null,
              boardState: {},
              hands: { player: { FU: 1 }, enemy: {} },
            },
            game: {
              status: 'in_progress',
              result: null,
              winnerSide: null,
            },
          });
        }

        return Promise.resolve({
          moveNo: 3,
          actorSide: 'player',
          move: {
            fromRow: null,
            fromCol: null,
            toRow: 5,
            toCol: 4,
            pieceCode: 'FU',
            promote: false,
            dropPieceCode: 'FU',
            capturedPieceCode: null,
            notation: null,
          },
          position: {
            sideToMove: 'player',
            turnNumber: 4,
            moveCount: 3,
            sfen: '9/4k4/9/9/5B3/4P4/9/9/4K4 b - 4',
            stateHash: null,
            boardState: {},
            hands: { player: {}, enemy: {} },
          },
          game: {
            status: 'finished',
            result: 'player_win',
            winnerSide: 'player',
          },
        });
      }
      if (path === '/api/v1/ai/move') {
        return Promise.resolve({
          selectedMove: {
            fromRow: 0,
            fromCol: 4,
            toRow: 1,
            toCol: 4,
            pieceCode: 'OU',
            promote: false,
            dropPieceCode: null,
            capturedPieceCode: null,
            notation: null,
          },
          meta: {
            engineVersion: 'test',
            thinkMs: 10,
            searchedNodes: 100,
            searchDepth: 1,
            evalCp: 0,
            candidateCount: 1,
            configApplied: {},
          },
          position: {
            sideToMove: 'player',
            turnNumber: 3,
            moveCount: 2,
            sfen: '9/4k4/9/9/5B3/9/9/9/4K4 b P 3',
            stateHash: null,
            boardState: {},
            hands: { player: { FU: 1 }, enemy: {} },
          },
          game: {
            status: 'in_progress',
            result: null,
            winnerSide: null,
          },
        });
      }
      return Promise.reject(new Error(`unexpected path: ${path}`));
    });
  });

  it('uses backend legal moves for player movement and keeps canonical position rendering', async () => {
    const { getByTestId, getByText } = render(<StageShogiScreen />);

    await waitFor(() => {
      expect(mockPostJson).toHaveBeenCalledWith('/api/v1/games', expect.any(Object));
    });
    await waitFor(() => {
      expect(mockGetJson).toHaveBeenCalledWith('/api/v1/games/game-1/legal-moves');
    });

    await waitFor(() => {
      expect(getByText('角')).toBeTruthy();
    });

    fireEvent.press(getByTestId('board-cell-4-4'));
    fireEvent.press(getByTestId('board-cell-4-5'));

    await waitFor(() => {
      expect(mockPostJson).toHaveBeenCalledWith(
        '/api/v1/games/game-1/moves',
        expect.objectContaining({
          moveNo: 1,
          actorSide: 'player',
          move: expect.objectContaining({
            pieceCode: 'KA',
            toRow: 4,
            toCol: 5,
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(mockPostJson).toHaveBeenCalledWith(
        '/api/v1/ai/move',
        expect.objectContaining({
          gameId: 'game-1',
          moveNo: 2,
          engineConfig: {},
        }),
      );
    });

    await waitFor(() => {
      expect(getByText('TURN 3')).toBeTruthy();
    });
  });

  it('uses backend legal drop targets instead of local drop calculation', async () => {
    const { getByTestId } = render(<StageShogiScreen />);

    await waitFor(() => {
      expect(mockGetJson).toHaveBeenCalledWith('/api/v1/games/game-1/legal-moves');
    });

    fireEvent.press(getByTestId('board-cell-4-4'));
    fireEvent.press(getByTestId('board-cell-4-5'));

    await waitFor(() => {
      expect(mockPostJson).toHaveBeenCalledWith(
        '/api/v1/games/game-1/moves',
        expect.objectContaining({ moveNo: 1 }),
      );
    });

    await waitFor(() => {
      expect(mockGetJson).toHaveBeenCalledTimes(2);
    });

    fireEvent.press(getByTestId('hand-player-FU'));
    fireEvent.press(getByTestId('board-cell-0-0'));

    await waitFor(() => {
      const moveCalls = mockPostJson.mock.calls.filter(
        ([path]) => path === '/api/v1/games/game-1/moves',
      );
      expect(moveCalls).toHaveLength(1);
    });

    fireEvent.press(getByTestId('board-cell-5-4'));

    await waitFor(() => {
      expect(mockPostJson).toHaveBeenCalledWith(
        '/api/v1/games/game-1/moves',
        expect.objectContaining({
          moveNo: 3,
          actorSide: 'player',
          move: expect.objectContaining({
            dropPieceCode: 'FU',
            toRow: 5,
            toCol: 4,
          }),
        }),
      );
    });
  });
});
