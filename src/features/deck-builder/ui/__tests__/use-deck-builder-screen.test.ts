import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDeckBuilderScreen } from '@/features/deck-builder/ui/use-deck-builder-screen';

const mockLoadExecute = jest.fn();
const mockSaveExecute = jest.fn();
const mockDeleteExecute = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('@/infra/di/usecase-factory', () => ({
  createLoadDeckBuilderUseCase: () => ({
    execute: (...args: unknown[]) => mockLoadExecute(...args),
  }),
  createSaveDeckUseCase: () => ({
    execute: (...args: unknown[]) => mockSaveExecute(...args),
  }),
  createDeleteDeckUseCase: () => ({
    execute: (...args: unknown[]) => mockDeleteExecute(...args),
  }),
}));

jest.mock('@/lib/supabase/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

describe('useDeckBuilderScreen', () => {
  const originalDataSource = process.env.EXPO_PUBLIC_DATA_SOURCE;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_DATA_SOURCE = 'mock';

    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockSaveExecute.mockResolvedValue({ savedDeckId: '1' });
    mockDeleteExecute.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalDataSource === undefined) {
      delete process.env.EXPO_PUBLIC_DATA_SOURCE;
      return;
    }
    process.env.EXPO_PUBLIC_DATA_SOURCE = originalDataSource;
  });

  it('ロードしたマイデッキ配置を盤面下段(6..8行)に反映する', async () => {
    mockLoadExecute.mockResolvedValue({
      ownedPieces: [{ pieceId: 101, char: '角', name: '角行', imageSignedUrl: null }],
      savedDecks: [
        {
          id: 'other',
          name: '別デッキ',
          pieces: ['歩'],
          placements: [{ rowNo: 0, colNo: 0, pieceId: 999, char: '歩', name: '歩兵' }],
          savedAt: '2026-03-10 22:00',
        },
        {
          id: 'my',
          name: 'マイデッキ',
          pieces: ['角'],
          placements: [{ rowNo: 0, colNo: 1, pieceId: 101, char: '角', name: '角行' }],
          savedAt: '2026-03-10 22:01',
        },
      ],
    });

    const { result } = renderHook(() => useDeckBuilderScreen());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.boardPlacements).toEqual([
      {
        row: 6,
        col: 1,
        piece: expect.objectContaining({
          pieceId: 101,
          char: '角',
          name: '角行',
        }),
      },
    ]);
  });

  it('保存時に盤面下段の座標をAPI座標(0..2)へ逆変換する', async () => {
    mockLoadExecute.mockResolvedValue({
      ownedPieces: [
        { pieceId: 201, char: '飛', name: '飛車', imageSignedUrl: null },
        { pieceId: 202, char: '王', name: '王将', imageSignedUrl: null },
      ],
      savedDecks: [],
    });

    const { result } = renderHook(() => useDeckBuilderScreen());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.selectPieceForPlacement({
        pieceId: 201,
        char: '飛',
        name: '飛車',
        imageSignedUrl: null,
        desc: '',
        skill: '',
        move: '',
      });
    });
    act(() => {
      result.current.placeSelectedPieceAt(6, 7); // UI行6 -> API行0
    });

    act(() => {
      result.current.selectPieceForPlacement({
        pieceId: 202,
        char: '王',
        name: '王将',
        imageSignedUrl: null,
        desc: '',
        skill: '',
        move: '',
      });
    });
    act(() => {
      result.current.placeSelectedPieceAt(8, 4); // UI行8 -> API行2
      result.current.setDeckName('マイデッキ');
    });

    await act(async () => {
      result.current.saveDeck();
    });

    expect(mockSaveExecute).toHaveBeenCalledWith({
      name: 'マイデッキ',
      placements: [
        { rowNo: 0, colNo: 7, pieceId: 201 },
        { rowNo: 2, colNo: 4, pieceId: 202 },
      ],
    });
  });

  it('所持数を超える配置はできず、残数が減る', async () => {
    const pawn = {
      pieceId: 301,
      char: '歩',
      name: '歩兵',
      imageSignedUrl: null,
      quantity: 2,
      desc: '',
      skill: '',
      move: '',
    };

    mockLoadExecute.mockResolvedValue({
      ownedPieces: [pawn],
      savedDecks: [],
    });

    const { result } = renderHook(() => useDeckBuilderScreen());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getRemainingCount(pawn)).toBe(2);

    act(() => {
      result.current.selectPieceForPlacement(pawn);
    });
    act(() => {
      result.current.placeSelectedPieceAt(6, 0);
      result.current.placeSelectedPieceAt(6, 1);
      result.current.placeSelectedPieceAt(6, 2); // 3個目は在庫超過で拒否される
    });

    expect(result.current.boardPlacements).toHaveLength(2);
    expect(result.current.getRemainingCount(pawn)).toBe(0);
  });

  it('デッキ配置は20枚を超えて配置できない', async () => {
    const piece = {
      pieceId: 401,
      char: '竜',
      name: '竜王',
      imageSignedUrl: null,
      quantity: 30,
      desc: '',
      skill: '',
      move: '',
    };

    mockLoadExecute.mockResolvedValue({
      ownedPieces: [piece],
      savedDecks: [],
    });

    const { result } = renderHook(() => useDeckBuilderScreen());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.selectPieceForPlacement(piece);
    });
    act(() => {
      for (let i = 0; i < 21; i++) {
        const row = 6 + Math.floor(i / 9);
        const col = i % 9;
        result.current.placeSelectedPieceAt(row, col);
      }
    });

    expect(result.current.deckPieceCount).toBe(20);
    expect(result.current.boardPlacements).toHaveLength(20);
    expect(result.current.isDeckFull).toBe(true);
    expect(
      result.current.boardPlacements.some(
        (placement) => placement.row === 8 && placement.col === 2,
      ),
    ).toBe(false);
  });

  it('読み込み時に20枚を超えるデッキ配置は20枚に制限される', async () => {
    const placements = Array.from({ length: 21 }, (_, i) => ({
      rowNo: Math.floor(i / 9),
      colNo: i % 9,
      pieceId: 501,
      char: '歩',
      name: '歩兵',
    }));

    mockLoadExecute.mockResolvedValue({
      ownedPieces: [{ pieceId: 501, char: '歩', name: '歩兵', imageSignedUrl: null }],
      savedDecks: [
        {
          id: 'my',
          name: 'マイデッキ',
          pieces: Array.from({ length: 21 }, () => '歩'),
          placements,
          savedAt: '2026-03-10 22:01',
        },
      ],
    });

    const { result } = renderHook(() => useDeckBuilderScreen());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.deckPieceCount).toBe(20);
    expect(result.current.boardPlacements).toHaveLength(20);
    expect(
      result.current.boardPlacements.some(
        (placement) => placement.row === 8 && placement.col === 2,
      ),
    ).toBe(false);
  });
});
