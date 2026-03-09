export type OwnedPiece = {
  char: string;
  name: string;
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

export interface LoadDeckBuilderUseCase {
  execute(): Promise<DeckBuilderSnapshot>;
}
