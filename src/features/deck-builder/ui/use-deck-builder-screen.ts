import { useEffect, useMemo, useState } from 'react';

import { MockLoadDeckBuilderUseCase } from '@/usecases/deck-builder/mock-deck-builder-usecases';
import { OwnedPiece, SavedDeck } from '@/usecases/deck-builder/load-deck-builder-usecase';

export function useDeckBuilderScreen() {
  const [ownedPieces, setOwnedPieces] = useState<OwnedPiece[]>([]);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPiece, setSelectedPiece] = useState<OwnedPiece | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [defaultModalOpen, setDefaultModalOpen] = useState(false);
  const [deckName, setDeckName] = useState('');

  const loadUseCase = useMemo(() => new MockLoadDeckBuilderUseCase(), []);

  useEffect(() => {
    let active = true;
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
  }, [loadUseCase]);

  function saveDeck() {
    if (!deckName.trim()) return;
    const newDeck: SavedDeck = {
      id: `deck-${Date.now()}`,
      name: deckName.trim(),
      pieces: ownedPieces.slice(0, 5).map((p) => p.char),
      savedAt: new Date().toLocaleString('ja-JP', { hour12: false }),
    };
    setSavedDecks((prev) => [newDeck, ...prev]);
    setDeckName('');
    setSaveModalOpen(false);
  }

  function deleteDeck(id: string) {
    setSavedDecks((prev) => prev.filter((d) => d.id !== id));
  }

  return {
    ownedPieces,
    savedDecks,
    isLoading,
    selectedPiece,
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
