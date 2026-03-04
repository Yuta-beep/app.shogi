import { DeckBuilderSnapshot, LoadDeckBuilderUseCase } from '@/usecases/deck-builder/load-deck-builder-usecase';

export class MockLoadDeckBuilderUseCase implements LoadDeckBuilderUseCase {
  async execute(): Promise<DeckBuilderSnapshot> {
    return {
      ownedPieces: ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉'],
    };
  }
}
