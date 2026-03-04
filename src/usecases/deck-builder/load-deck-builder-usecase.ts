export type DeckBuilderSnapshot = {
  ownedPieces: string[];
};

export interface LoadDeckBuilderUseCase {
  execute(): Promise<DeckBuilderSnapshot>;
}
