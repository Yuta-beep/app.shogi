import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { StageShogiScreen } from '@/features/stage-shogi/ui/stage-shogi-screen';

const mockPostJson = jest.fn();
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
      row: 6,
      col: 4,
      pieceId: 1,
      pieceCode: 'FU',
      char: '歩',
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
  postJson: (...args: unknown[]) => mockPostJson(...args),
}));

jest.mock('@/infra/di/usecase-factory', () => ({
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
    mockExecutePieceCatalog.mockResolvedValue([
      {
        char: '歩',
        name: '歩兵',
        unlock: '初期',
        desc: 'test',
        skill: 'なし',
        move: '前へ1',
        moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
        isRepeatable: false,
      },
      {
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

    mockPostJson.mockImplementation((path: string) => {
      if (path === '/api/v1/games') {
        return Promise.resolve({
          gameId: 'game-1',
          status: 'active',
          startedAt: '2026-03-10T00:00:00Z',
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
        });
      }
      return Promise.reject(new Error(`unexpected path: ${path}`));
    });
  });

  it('calls /api/v1/ai/move after player makes a legal move', async () => {
    const { getByTestId, getByText } = render(<StageShogiScreen />);

    await waitFor(() => {
      expect(mockPostJson).toHaveBeenCalledWith('/api/v1/games', expect.any(Object));
    });

    await waitFor(() => {
      expect(getByText('歩')).toBeTruthy();
    });
    await waitFor(() => {
      expect(mockPostJson).toHaveBeenCalledWith('/api/v1/games', expect.any(Object));
    });

    fireEvent.press(getByTestId('board-cell-6-4'));
    fireEvent.press(getByTestId('board-cell-5-4'));

    await waitFor(() => {
      expect(mockPostJson).toHaveBeenCalledWith(
        '/api/v1/ai/move',
        expect.objectContaining({
          gameId: 'game-1',
          moveNo: 2,
          position: expect.objectContaining({ sideToMove: 'enemy' }),
        }),
      );
    });
  });
});
