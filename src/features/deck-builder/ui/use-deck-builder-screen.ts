import { useEffect, useState } from 'react';

import type { OwnedPiece, SavedDeck } from '@/domain/models/deck-builder';
import {
  createDeleteDeckUseCase,
  createLoadDeckBuilderUseCase,
  createSaveDeckUseCase,
} from '@/usecases/deck-builder/create-deck-builder-usecases';
import { isApiDataSource } from '@/lib/config/data-source';
import { supabase } from '@/lib/supabase/supabase-client';
import { getDeckBuilderPieceCost } from '@/features/deck-builder/lib/deck-builder-piece-cost';
import { CHAR_TO_CODE } from '@/features/stage-shogi/domain/piece-conversion';

type BoardPlacement = {
  row: number;
  col: number;
  piece: OwnedPiece;
};

function pieceIdentityKey(piece: OwnedPiece): string {
  if (typeof piece.pieceId === 'number') return `id:${piece.pieceId}`;
  return `char:${piece.char}`;
}

const BOARD_ROWS = 9;
const DECK_ROWS = 3;
const DECK_ROW_OFFSET = BOARD_ROWS - DECK_ROWS;
const DECK_COST_LIMIT = 70;
const MY_DECK_NAME = 'マイデッキ';

const STANDARD_PIECE_CODES = new Set(['FU', 'KY', 'KE', 'GI', 'KI', 'KA', 'HI', 'OU']);
const ALL_COLS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

function posKey(row: number, col: number): string {
  return `${row}:${col}`;
}

function rowCols(row: number, cols: readonly number[]): string[] {
  return cols.map((col) => posKey(row, col));
}

/** HTML版 deck_builder.html の isValidPlacement（特殊駒分）と同じ配置制約 */
const SPECIAL_PIECE_ALLOWED_POSITIONS = new Map<string, ReadonlySet<string>>([
  ['走', new Set(rowCols(6, ALL_COLS))],
  ['種', new Set(rowCols(8, [2, 6]))],
  ['舞', new Set(rowCols(8, [3, 5]))],
  ['P', new Set(rowCols(7, [4]))],
  ['鳴', new Set(rowCols(8, [2, 6]))],
  ['砲', new Set(rowCols(7, [1, 7]))],
  ['影', new Set(rowCols(8, [2, 6]))],
  ['忍', new Set(rowCols(8, [1, 7]))],
  ['竜', new Set(rowCols(7, [1]))],
  ['鳳', new Set(rowCols(7, [7]))],
  ['炎', new Set(rowCols(8, [1, 7]))],
  ['火', new Set(rowCols(8, [0, 8]))],
  ['水', new Set(rowCols(8, [0, 8]))],
  ['波', new Set(rowCols(8, [1, 7]))],
  ['木', new Set(rowCols(8, [0, 8]))],
  ['葉', new Set(rowCols(8, [1, 7]))],
  ['光', new Set(rowCols(8, [1, 7]))],
  ['星', new Set(rowCols(8, [1, 7]))],
  ['闇', new Set(rowCols(8, [1, 7]))],
  ['魔', new Set(rowCols(8, [1, 7]))],
  ['銅', new Set(rowCols(8, [2, 6]))],
  ['鉄', new Set(rowCols(8, [2, 6]))],
  ['錫', new Set(rowCols(8, [2, 6]))],
  ['鉛', new Set(rowCols(8, [2, 6]))],
  ['宝', new Set(rowCols(8, [0, 8]))],
  ['電', new Set(rowCols(7, [1]))],
  ['雷', new Set(rowCols(7, [7]))],
  ['時', new Set(rowCols(8, [0, 1, 7, 8]))],
  ['氷', new Set(rowCols(8, [2, 6]))],
  ['雪', new Set(rowCols(7, [7]))],
  ['砂', new Set(rowCols(6, ALL_COLS))],
  ['風', new Set(rowCols(7, [7]))],
  ['苔', new Set(rowCols(8, [2, 6]))],
  ['魚', new Set(rowCols(7, [4]))],
  ['雲', new Set(rowCols(7, [4]))],
  ['虹', new Set(rowCols(8, [0, 8]))],
  ['毒', new Set(rowCols(8, [1, 7]))],
  ['沼', new Set([...rowCols(8, [2, 6]), ...rowCols(7, [4])])],
  ['鏡', new Set(rowCols(8, [1, 7]))],
  ['映', new Set(rowCols(8, [2, 6]))],
  ['幻', new Set(rowCols(7, [4]))],
  ['霧', new Set(rowCols(8, [3, 5]))],
  ['月', new Set(rowCols(7, [4]))],
  ['舟', new Set(rowCols(7, [1, 7]))],
  ['機', new Set(rowCols(8, [1]))],
  ['歯', new Set(rowCols(8, [1, 2, 6, 7]))],
  ['家', new Set(rowCols(7, [7]))],
  ['民', new Set(rowCols(6, [2, 6]))],
  ['畑', new Set(rowCols(7, [1]))],
  ['泉', new Set(rowCols(7, [7]))],
  ['安', new Set(rowCols(7, [1, 7]))],
  ['宋', new Set(rowCols(7, [7]))],
  ['爆', new Set(rowCols(8, [3, 5]))],
  ['煽', new Set(rowCols(7, [1, 7]))],
  ['灯', new Set(rowCols(8, [2, 6]))],
  ['辺', new Set(rowCols(8, [2, 6]))],
  ['逸', new Set(rowCols(8, [2, 6]))],
  ['進', new Set(rowCols(8, [1, 7]))],
  ['逃', new Set(rowCols(7, [1]))],
  ['艸', new Set(rowCols(8, [1, 7]))],
  ['閹', new Set(rowCols(8, [0, 8]))],
  ['膠', new Set(rowCols(8, [1]))],
  ['刀', new Set(rowCols(6, [3, 5]))],
  ['鎧', new Set(rowCols(8, [1, 7]))],
  ['銃', new Set(rowCols(7, [4]))],
  ['書', new Set([...rowCols(7, [4]), ...rowCols(8, [2, 6])])],
  ['封', new Set(rowCols(8, [3, 5]))],
  ['犇', new Set(rowCols(7, [1]))],
  ['轟', new Set(rowCols(7, [7]))],
  ['礼', new Set(rowCols(7, [4]))],
  ['聖', new Set(rowCols(8, [0, 8]))],
  ['剣', new Set(rowCols(7, [4]))],
  ['盾', new Set(rowCols(8, [3, 5]))],
  ['病', new Set(rowCols(8, [2, 6]))],
  ['薬', new Set(rowCols(8, [1, 7]))],
  ['滝', new Set(rowCols(7, [7]))],
  ['穴', new Set(rowCols(6, [4]))],
  ['淵', new Set(rowCols(7, [7]))],
  ['獣', new Set(rowCols(7, [1]))],
  ['禽', new Set(rowCols(8, [3, 5]))],
  ['悟', new Set(rowCols(8, [2]))],
  ['心', new Set(rowCols(8, [7]))],
  ['鬱', new Set(rowCols(8, [3]))],
  ['乙', new Set(rowCols(8, [5]))],
  ['薔', new Set(rowCols(7, [1]))],
  ['菊', new Set([...rowCols(6, [4]), ...rowCols(7, [4])])],
  ['桜', new Set(rowCols(8, [7]))],
  ['凹', new Set(rowCols(7, [7]))],
  ['凸', new Set(rowCols(7, [1]))],
  ['焼', new Set(rowCols(7, [4]))],
  ['炒', new Set(rowCols(7, [4]))],
  ['煮', new Set(rowCols(7, [4]))],
  ['陽', new Set(rowCols(8, [0]))],
  ['陰', new Set(rowCols(8, [8]))],
  ['牛', new Set(rowCols(6, [1, 7]))],
  ['豚', new Set(rowCols(8, [3, 5]))],
  ['室', new Set(rowCols(8, [3, 5]))],
  ['鶏', new Set(rowCols(7, [4]))],
  ['銭', new Set(rowCols(8, [2, 6]))],
  ['定', new Set(rowCols(8, [0, 8]))],
]);

function isDeckBuilderSpecialChar(char: string | null | undefined): boolean {
  if (!char) return false;
  // 標準駒は特殊に含めない（deck_builder.html の customCount 相当）
  if (
    char === '王' ||
    char === '玉' ||
    char === '歩' ||
    char === '香' ||
    char === '桂' ||
    char === '銀' ||
    char === '金' ||
    char === '飛' ||
    char === '角'
  ) {
    return false;
  }

  // 標準コードに該当するなら特殊ではない。それ以外は特殊扱い。
  const code = CHAR_TO_CODE[char];
  if (!code) return true;
  return !STANDARD_PIECE_CODES.has(code);
}

function toUiRow(rowNo: number): number {
  if (rowNo >= 0 && rowNo < DECK_ROWS) {
    return rowNo + DECK_ROW_OFFSET;
  }
  return rowNo;
}

function toApiRow(row: number): number {
  if (row >= DECK_ROW_OFFSET && row < BOARD_ROWS) {
    return row - DECK_ROW_OFFSET;
  }
  return row;
}

function toOwnedPieceFromPlacement(
  placement: NonNullable<SavedDeck['placements']>[number],
): OwnedPiece {
  return {
    pieceId: placement.pieceId,
    char: placement.char,
    name: placement.name,
    imageSignedUrl: placement.imageSignedUrl ?? null,
    desc: `${placement.name}の詳細は準備中です。`,
    skill: '準備中',
    move: '準備中',
  };
}

function initialBoardPlacementsFromDecks(
  decks: SavedDeck[],
  ownedPieces: OwnedPiece[],
): BoardPlacement[] {
  const targetDeck =
    decks.find((deck) => deck.name === 'マイデッキ' && (deck.placements?.length ?? 0) > 0) ??
    decks.find((deck) => (deck.placements?.length ?? 0) > 0);

  if (!targetDeck?.placements || targetDeck.placements.length === 0) {
    return [];
  }

  const ownedByPieceId = new Map<number, OwnedPiece>();
  for (const piece of ownedPieces) {
    if (typeof piece.pieceId === 'number') {
      ownedByPieceId.set(piece.pieceId, piece);
    }
  }

  return targetDeck.placements
    .map((placement) => ({
      row: toUiRow(placement.rowNo),
      col: placement.colNo,
      piece: ownedByPieceId.get(placement.pieceId) ?? toOwnedPieceFromPlacement(placement),
    }))
    .filter((placement) => isDeckAreaRow(placement.row));
}

function pieceStock(piece: OwnedPiece): number {
  void piece;
  // HTML版準拠: デッキビルダーでは所持数で配置を制限しない（同一駒を何枚でも配置可）
  return Number.POSITIVE_INFINITY;
}

function isDeckAreaRow(row: number): boolean {
  return row >= DECK_ROW_OFFSET && row < BOARD_ROWS;
}

function isAllowedDeckPlacementByHtmlRules(pieceChar: string, row: number, col: number): boolean {
  const allowed = SPECIAL_PIECE_ALLOWED_POSITIONS.get(pieceChar);
  if (!allowed) return true;
  return allowed.has(posKey(row, col));
}

function canPlacePieceAtByRules(
  piece: OwnedPiece,
  row: number,
  col: number,
  placements: BoardPlacement[],
): boolean {
  if (!isDeckAreaRow(row)) return false;

  // HTML版準拠: 標準駒の固定配置
  if (piece.char === '角') return row === 7 && col === 1;
  if (piece.char === '飛') return row === 7 && col === 7;
  if (piece.char === '王' || piece.char === '玉') return row === 8 && col === 4;
  if (piece.char === '金') return row === 8 && (col === 3 || col === 5);
  if (piece.char === '銀') return row === 8 && (col === 2 || col === 6);
  if (piece.char === '桂') return row === 8 && (col === 1 || col === 7);
  if (piece.char === '香') return row === 8 && (col === 0 || col === 8);
  if (piece.char === '歩') {
    if (row !== 6) return false;
    // HTML版の二歩ルール
    const nifu = placements.some(
      (p) =>
        p.col === col &&
        p.row >= DECK_ROW_OFFSET &&
        p.row < BOARD_ROWS &&
        p.piece.char === '歩' &&
        !(p.row === row && p.col === col),
    );
    if (nifu) return false;
    return true;
  }

  return isAllowedDeckPlacementByHtmlRules(piece.char, row, col);
}

function simulatePlacement(
  placements: BoardPlacement[],
  piece: OwnedPiece,
  row: number,
  col: number,
): BoardPlacement[] {
  const withoutCell = placements.filter(
    (placement) => !(placement.row === row && placement.col === col),
  );
  return [...withoutCell, { row, col, piece }];
}

function canPlacePieceAt(
  placements: BoardPlacement[],
  piece: OwnedPiece,
  row: number,
  col: number,
): boolean {
  if (!canPlacePieceAtByRules(piece, row, col, placements)) return false;
  const nextPlacements = simulatePlacement(placements, piece, row, col);
  const nextDeckCost = nextPlacements
    .filter((placement) => isDeckAreaRow(placement.row))
    .reduce((sum, placement) => sum + getDeckBuilderPieceCost(placement.piece.char), 0);
  return nextDeckCost <= DECK_COST_LIMIT;
}

function pieceMatchesAlias(piece: OwnedPiece, aliases: readonly string[]): boolean {
  return aliases.some((alias) => piece.char === alias || piece.name === alias);
}

function findOwnedByAliases(
  ownedPieces: OwnedPiece[],
  aliases: readonly string[],
): OwnedPiece | null {
  return ownedPieces.find((piece) => pieceMatchesAlias(piece, aliases)) ?? null;
}

function createDefaultBoardPlacements(ownedPieces: OwnedPiece[]): BoardPlacement[] {
  const cells: Array<{ row: number; col: number; aliases: readonly string[] }> = [
    // 歩段
    ...ALL_COLS.map((col) => ({ row: 6, col, aliases: ['歩'] as const })),
    // 8段目
    { row: 7, col: 1, aliases: ['角', '角行'] },
    { row: 7, col: 7, aliases: ['飛', '飛車'] },
    // 9段目
    { row: 8, col: 0, aliases: ['香', '香車'] },
    { row: 8, col: 1, aliases: ['桂', '桂馬'] },
    { row: 8, col: 2, aliases: ['銀', '銀将'] },
    { row: 8, col: 3, aliases: ['金', '金将'] },
    { row: 8, col: 4, aliases: ['玉', '王', '玉将', '王将'] },
    { row: 8, col: 5, aliases: ['金', '金将'] },
    { row: 8, col: 6, aliases: ['銀', '銀将'] },
    { row: 8, col: 7, aliases: ['桂', '桂馬'] },
    { row: 8, col: 8, aliases: ['香', '香車'] },
  ];
  return cells
    .map((cell) => {
      const piece = findOwnedByAliases(ownedPieces, cell.aliases);
      if (!piece) return null;
      return { row: cell.row, col: cell.col, piece };
    })
    .filter((v): v is BoardPlacement => v !== null);
}

function boardPlacementsFromSavedDeck(
  deck: SavedDeck,
  ownedPieces: OwnedPiece[],
): BoardPlacement[] {
  if (!deck.placements || deck.placements.length === 0) return [];
  const ownedByPieceId = new Map<number, OwnedPiece>();
  for (const p of ownedPieces) {
    if (typeof p.pieceId === 'number') ownedByPieceId.set(p.pieceId, p);
  }
  return deck.placements
    .map((placement) => ({
      row: toUiRow(placement.rowNo),
      col: placement.colNo,
      piece: ownedByPieceId.get(placement.pieceId) ?? toOwnedPieceFromPlacement(placement),
    }))
    .filter((placement) => isDeckAreaRow(placement.row));
}

export function useDeckBuilderScreen() {
  const isApiMode = isApiDataSource();
  const [ownedPieces, setOwnedPieces] = useState<OwnedPiece[]>([]);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPiece, setSelectedPiece] = useState<OwnedPiece | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [defaultModalOpen, setDefaultModalOpen] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [token, setToken] = useState<string | undefined>(undefined);
  const [isSessionResolved, setIsSessionResolved] = useState(false);
  const [selectedPieceForPlacement, setSelectedPieceForPlacement] = useState<OwnedPiece | null>(
    null,
  );
  const [boardPlacements, setBoardPlacements] = useState<BoardPlacement[]>([]);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setToken(data.session?.access_token);
      setIsSessionResolved(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setToken(session?.access_token);
      setIsSessionResolved(true);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isApiMode && !isSessionResolved) {
      return;
    }

    if (isApiMode && !token) {
      setIsLoading(true);
      return;
    }

    let active = true;
    const loadUseCase = createLoadDeckBuilderUseCase(token);
    setIsLoading(true);
    loadUseCase
      .execute()
      .then((snapshot) => {
        if (active) {
          setOwnedPieces(snapshot.ownedPieces);
          setSavedDecks(snapshot.savedDecks);
          const initial = initialBoardPlacementsFromDecks(
            snapshot.savedDecks,
            snapshot.ownedPieces,
          );
          setBoardPlacements(
            initial.length > 0 ? initial : createDefaultBoardPlacements(snapshot.ownedPieces),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isApiMode, isSessionResolved, token]);

  function saveDeck() {
    if (!deckName.trim()) return;
    if (deckTotalCost > DECK_COST_LIMIT) return;

    const apiPlacements = boardPlacements
      .filter((placement) => isDeckAreaRow(placement.row))
      .filter((placement) => typeof placement.piece.pieceId === 'number')
      .map((placement) => ({
        rowNo: toApiRow(placement.row),
        colNo: placement.col,
        pieceId: placement.piece.pieceId as number,
      }))
      .filter((placement) => placement.rowNo >= 0 && placement.rowNo < DECK_ROWS);

    const newDeck: SavedDeck = {
      id: `deck-${Date.now()}`,
      name: deckName.trim(),
      pieces: boardPlacements.map((placement) => placement.piece.char),
      savedAt: new Date().toLocaleString('ja-JP', { hour12: false }),
    };

    const saveDeckUseCase = createSaveDeckUseCase(token);
    saveDeckUseCase
      .execute({ name: newDeck.name, placements: apiPlacements })
      .then((result) => {
        setSavedDecks((prev) => [{ ...newDeck, id: result.savedDeckId ?? newDeck.id }, ...prev]);
      })
      .catch(() => {
        setSavedDecks((prev) => [newDeck, ...prev]);
      });

    setDeckName('');
    setSaveModalOpen(false);
  }

  async function applyAsBattleDeck(): Promise<boolean> {
    if (deckTotalCost > DECK_COST_LIMIT) return false;

    const apiPlacements = boardPlacements
      .filter((placement) => isDeckAreaRow(placement.row))
      .filter((placement) => typeof placement.piece.pieceId === 'number')
      .map((placement) => ({
        rowNo: toApiRow(placement.row),
        colNo: placement.col,
        pieceId: placement.piece.pieceId as number,
      }))
      .filter((placement) => placement.rowNo >= 0 && placement.rowNo < DECK_ROWS);

    const saveDeckUseCase = createSaveDeckUseCase(token);

    try {
      const result = await saveDeckUseCase.execute({
        name: MY_DECK_NAME,
        placements: apiPlacements,
      });
      const savedId = result.savedDeckId ?? `deck-${Date.now()}`;
      const nextMyDeck: SavedDeck = {
        id: savedId,
        name: MY_DECK_NAME,
        pieces: boardPlacements.map((placement) => placement.piece.char),
        placements: boardPlacements
          .filter((placement) => isDeckAreaRow(placement.row))
          .filter((placement) => typeof placement.piece.pieceId === 'number')
          .map((placement) => ({
            rowNo: toApiRow(placement.row),
            colNo: placement.col,
            pieceId: placement.piece.pieceId as number,
            char: placement.piece.char,
            name: placement.piece.name,
            imageSignedUrl: placement.piece.imageSignedUrl ?? null,
          })),
        savedAt: new Date().toLocaleString('ja-JP', { hour12: false }),
      };
      setSavedDecks((prev) => [nextMyDeck, ...prev.filter((deck) => deck.name !== MY_DECK_NAME)]);
      return true;
    } catch {
      return false;
    }
  }

  function deleteDeck(id: string) {
    setSavedDecks((prev) => prev.filter((d) => d.id !== id));

    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      const deleteDeckUseCase = createDeleteDeckUseCase(token);
      deleteDeckUseCase.execute({ deckId: numericId }).catch(() => {
        // ignore: UI already updated optimistically
      });
    }
  }

  function getPlacedCount(piece: OwnedPiece): number {
    const key = pieceIdentityKey(piece);
    return boardPlacements.filter((placement) => pieceIdentityKey(placement.piece) === key).length;
  }

  function getRemainingCount(piece: OwnedPiece): number {
    return Math.max(pieceStock(piece) - getPlacedCount(piece), 0);
  }

  const deckAreaPlacements = boardPlacements.filter((placement) => isDeckAreaRow(placement.row));
  const deckTotalCost = deckAreaPlacements.reduce(
    (sum, placement) => sum + getDeckBuilderPieceCost(placement.piece.char),
    0,
  );
  const deckSpecialPieceCount = deckAreaPlacements.filter((placement) =>
    isDeckBuilderSpecialChar(placement.piece.char),
  ).length;
  const isDeckCostOverLimit = deckTotalCost > DECK_COST_LIMIT;

  return {
    ownedPieces,
    selectedPieceForPlacement,
    savedDecks,
    boardPlacements,
    isLoading,
    selectedPiece,
    selectPieceForPlacement: (piece: OwnedPiece) => setSelectedPieceForPlacement(piece),
    getRemainingCount,
    isValidPlacementAt: (row: number, col: number) => {
      if (!selectedPieceForPlacement) return false;
      return canPlacePieceAt(boardPlacements, selectedPieceForPlacement, row, col);
    },
    placeSelectedPieceAt: (row: number, col: number) => {
      if (!selectedPieceForPlacement) {
        setBoardPlacements((prev) =>
          prev.filter((placement) => !(placement.row === row && placement.col === col)),
        );
        return;
      }
      setBoardPlacements((prev) => {
        const existing =
          prev.find((placement) => placement.row === row && placement.col === col) ?? null;
        const isReplacingSamePiece =
          existing !== null &&
          pieceIdentityKey(existing.piece) === pieceIdentityKey(selectedPieceForPlacement);
        if (!canPlacePieceAt(prev, selectedPieceForPlacement, row, col) && !isReplacingSamePiece) {
          return prev;
        }
        return simulatePlacement(prev, selectedPieceForPlacement, row, col);
      });
    },
    openPieceDetail: (piece: OwnedPiece) => setSelectedPiece(piece),
    closePieceDetail: () => setSelectedPiece(null),
    saveModalOpen,
    openSaveModal: () => setSaveModalOpen(true),
    closeSaveModal: () => {
      setSaveModalOpen(false);
      setDeckName('');
    },
    deckName,
    setDeckName,
    saveDeck,
    deckTotalCost,
    deckCostLimit: DECK_COST_LIMIT,
    isDeckCostOverLimit,
    deckSpecialPieceCount,
    loadModalOpen,
    openLoadModal: () => setLoadModalOpen(true),
    closeLoadModal: () => setLoadModalOpen(false),
    loadDeck: (deckId: string) => {
      const deck = savedDecks.find((d) => d.id === deckId);
      if (!deck) return;
      setBoardPlacements(boardPlacementsFromSavedDeck(deck, ownedPieces));
      setLoadModalOpen(false);
      setSelectedPieceForPlacement(null);
    },
    deleteDeck,
    defaultModalOpen,
    openDefaultModal: () => setDefaultModalOpen(true),
    closeDefaultModal: () => setDefaultModalOpen(false),
    loadDefault: () => {
      setBoardPlacements(createDefaultBoardPlacements(ownedPieces));
      setDefaultModalOpen(false);
      setSelectedPieceForPlacement(null);
    },
    applyAsBattleDeck,
  };
}
