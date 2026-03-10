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
    expect(snapshot.owned).toEqual(['走']);
  });

  it('returns UI-only success for purchase', async () => {
    const purchase = new MockPurchaseShopItemUseCase();
    const result = await purchase.execute({
      item: { key: '種', desc: 'x', move: 'y', cost: 1, costType: 'gold' },
    });

    expect(result).toEqual({ success: true, reason: 'UI_ONLY' });
  });
});
