import { useEffect, useState } from 'react';

import type { OwnedPiece, SavedDeck } from '@/domain/models/deck-builder';
import { supabase } from '@/lib/supabase/supabase-client';
import { createDeleteDeckUseCase, createLoadDeckBuilderUseCase, createSaveDeckUseCase } from '@/infra/di/usecase-factory';

type BoardPlacement = {
  row: number;
  col: number;
  piece: OwnedPiece;
};

export function useDeckBuilderScreen() {
  const isApiMode = process.env.EXPO_PUBLIC_DATA_SOURCE === 'api';
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
  const [selectedPieceForPlacement, setSelectedPieceForPlacement] = useState<OwnedPiece | null>(null);
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
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [isApiMode, isSessionResolved, token]);

  function saveDeck() {
    if (!deckName.trim()) return;

    const apiPlacements = boardPlacements
      .filter((placement) => typeof placement.piece.pieceId === 'number')
      .map((placement) => ({
        rowNo: placement.row,
        colNo: placement.col,
        pieceId: placement.piece.pieceId as number,
      }));

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

  return {
    ownedPieces,
    selectedPieceForPlacement,
    savedDecks,
    boardPlacements,
    isLoading,
    selectedPiece,
    selectPieceForPlacement: (piece: OwnedPiece) => setSelectedPieceForPlacement(piece),
    placeSelectedPieceAt: (row: number, col: number) => {
      if (!selectedPieceForPlacement) {
        setBoardPlacements((prev) => prev.filter((placement) => !(placement.row === row && placement.col === col)));
        return;
      }
      setBoardPlacements((prev) => {
        const withoutCell = prev.filter((placement) => !(placement.row === row && placement.col === col));
        return [...withoutCell, { row, col, piece: selectedPieceForPlacement }];
      });
    },
    openPieceDetail: (piece: OwnedPiece) => setSelectedPiece(piece),
    closePieceDetail: () => setSelectedPiece(null),
    saveModalOpen,
    openSaveModal: () => setSaveModalOpen(true),
    closeSaveModal: () => { setSaveModalOpen(false); setDeckName(''); },
    deckName,
    setDeckName,
    saveDeck,
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
