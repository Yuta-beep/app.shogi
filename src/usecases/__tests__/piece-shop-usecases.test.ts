import {
  MockLoadShopCatalogUseCase,
  MockPurchaseShopItemUseCase,
} from '@/usecases/piece-shop/mock-piece-shop-usecases';

describe('piece shop usecases', () => {
  it('loads shop catalog with currencies and initial owned items', async () => {
    const usecase = new MockLoadShopCatalogUseCase();
    const snapshot = await usecase.execute();

    expect(snapshot.items).toHaveLength(6);
    expect(snapshot.pawnCurrency).toBe(100);
    expect(snapshot.goldCurrency).toBe(100);
    expect(snapshot.owned).toEqual([]);
  });

  it('deducts currency and marks item owned on purchase', async () => {
    const purchase = new MockPurchaseShopItemUseCase();
    const result = await purchase.execute({
      item: { key: '種', desc: 'x', move: 'y', cost: 3, costType: 'gold' },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.goldCurrency).toBe(97);
    expect(result.owned).toContain('種');

    const catalog = await new MockLoadShopCatalogUseCase().execute();
    expect(catalog.goldCurrency).toBe(97);
    expect(catalog.owned).toContain('種');
  });
});
