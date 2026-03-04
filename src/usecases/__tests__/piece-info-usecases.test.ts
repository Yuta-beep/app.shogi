import { MockLoadPieceCatalogUseCase } from '@/usecases/piece-info/mock-piece-info-usecases';

describe('MockLoadPieceCatalogUseCase', () => {
  it('returns piece catalog items used by piece info screen', async () => {
    const usecase = new MockLoadPieceCatalogUseCase();
    const items = await usecase.execute();

    expect(items).toHaveLength(5);
    expect(items[0]).toMatchObject({
      char: '香',
      name: '香車',
      unlock: '初期',
    });
  });
});
