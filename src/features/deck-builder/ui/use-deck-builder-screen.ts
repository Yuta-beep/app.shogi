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

const BOARD_ROWS = 9;
const DECK_ROWS = 3;
const DECK_ROW_OFFSET = BOARD_ROWS - DECK_ROWS;
const DECK_COST_LIMIT = 70;

const STANDARD_PIECE_CODES = new Set(['FU', 'KY', 'KE', 'GI', 'KI', 'KA', 'HI', 'OU']);

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
  return piece.quantity ?? 1;
}

function isDeckAreaRow(row: number): boolean {
  return row >= DECK_ROW_OFFSET && row < BOARD_ROWS;
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
          setBoardPlacements(
            initialBoardPlacementsFromDecks(snapshot.savedDecks, snapshot.ownedPieces),
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
    if (typeof piece.pieceId !== 'number') return 0;
    return boardPlacements.filter((placement) => placement.piece.pieceId === piece.pieceId).length;
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
        const alreadyPlaced = prev.filter(
          (placement) => placement.piece.pieceId === selectedPieceForPlacement.pieceId,
        ).length;
        const isReplacingSamePiece =
          existing?.piece.pieceId === selectedPieceForPlacement.pieceId && existing !== null;
        const allowedCount = pieceStock(selectedPieceForPlacement);
        if (!isReplacingSamePiece && alreadyPlaced >= allowedCount) {
          return prev;
        }
        const withoutCell = prev.filter(
          (placement) => !(placement.row === row && placement.col === col),
        );
        const nextPlacements = [...withoutCell, { row, col, piece: selectedPieceForPlacement }];
        const nextDeckCost = nextPlacements
          .filter((placement) => isDeckAreaRow(placement.row))
          .reduce((sum, placement) => sum + getDeckBuilderPieceCost(placement.piece.char), 0);
        if (nextDeckCost > DECK_COST_LIMIT) {
          return prev;
        }
        return nextPlacements;
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
    deleteDeck,
    defaultModalOpen,
    openDefaultModal: () => setDefaultModalOpen(true),
    closeDefaultModal: () => setDefaultModalOpen(false),
    loadDefault: () => setDefaultModalOpen(false),
  };
}
