export type OwnedPiece = {
  pieceId?: number;
  char: string;
  name: string;
  imageSignedUrl?: string | null;
  desc: string;
  skill: string;
  move: string;
};

export type SavedDeck = {
  id: string;
  name: string;
  pieces: string[];
  savedAt: string;
};

export type DeckBuilderSnapshot = {
  ownedPieces: OwnedPiece[];
  savedDecks: SavedDeck[];
};

export type SaveDeckPlacement = {
  rowNo: number;
  colNo: number;
  pieceId: number;
};

export type SaveDeckPayload = {
  name: string;
  placements: SaveDeckPlacement[];
};

export type SaveDeckResponse = {
  deckId: number;
};
