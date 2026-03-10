import { MockLoadDeckBuilderUseCase } from '@/usecases/deck-builder/mock-deck-builder-usecases';

describe('MockLoadDeckBuilderUseCase', () => {
  it('returns owned pieces for deck builder UI', async () => {
    const usecase = new MockLoadDeckBuilderUseCase();
    const snapshot = await usecase.execute();

    expect(snapshot.ownedPieces.map((piece) => piece.char)).toEqual([
      '忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉',
    ]);
  });
});
