import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase/supabase-client';
import { DeckBuilderApiDataSource } from '@/infra/datasources/deck-builder-datasource';
import { createLoadDeckBuilderUseCase } from '@/infra/di/usecase-factory';
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
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token);
    });
  }, []);

  const loadUseCase = useMemo(
    () => createLoadDeckBuilderUseCase(token),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token]
  );

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

    if (token) {
      const ds = new DeckBuilderApiDataSource(token);
      ds.saveDeck({ name: newDeck.name, placements: [] })
        .then((res) => {
          setSavedDecks((prev) => [{ ...newDeck, id: String(res.deckId) }, ...prev]);
        })
        .catch(() => {
          setSavedDecks((prev) => [newDeck, ...prev]);
        });
    } else {
      setSavedDecks((prev) => [newDeck, ...prev]);
    }

    setDeckName('');
    setSaveModalOpen(false);
  }

  function deleteDeck(id: string) {
    setSavedDecks((prev) => prev.filter((d) => d.id !== id));

    const numericId = parseInt(id, 10);
    if (token && !isNaN(numericId)) {
      const ds = new DeckBuilderApiDataSource(token);
      ds.deleteDeck(numericId).catch(() => {
        // ignore: UI already updated optimistically
      });
    }
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
