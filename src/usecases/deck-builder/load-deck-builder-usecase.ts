import type { DeckBuilderSnapshot } from '@/domain/models/deck-builder';

export type { DeckBuilderSnapshot, OwnedPiece, SavedDeck } from '@/domain/models/deck-builder';

export interface LoadDeckBuilderUseCase {
  execute(): Promise<DeckBuilderSnapshot>;
}
