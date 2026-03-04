import { LoadShopCatalogUseCase, ShopCatalogSnapshot } from '@/usecases/piece-shop/load-shop-catalog-usecase';
import { PurchaseShopItemInput, PurchaseShopItemResult, PurchaseShopItemUseCase } from '@/usecases/piece-shop/purchase-shop-item-usecase';

const items: ShopCatalogSnapshot['items'] = [
  { key: '走', desc: 'なし', move: '縦横1マス', cost: 2, costType: 'pawn' },
  { key: '種', desc: '移動時30%の確率で周囲に「葉」を召喚する。', move: '歩と同じ', cost: 3, costType: 'gold' },
  { key: '麒', desc: '左右前後何マスでも移動 + 斜め1マス。', move: '全方向ロング', cost: 20, costType: 'gold' },
  { key: '舞', desc: '周囲8マスの敵駒の移動範囲を制限する。', move: '金と同じ', cost: 6, costType: 'gold' },
  { key: 'P', desc: '移動時同じ行・列の敵駒を移動不能にする。', move: '縦横1マス', cost: 40, costType: 'gold' },
  { key: '鳴', desc: '同駒3体がいればまとめて取る（ポン）。', move: '銀と同じ', cost: 50, costType: 'pawn' },
];

export class MockLoadShopCatalogUseCase implements LoadShopCatalogUseCase {
  async execute(): Promise<ShopCatalogSnapshot> {
    return {
      items,
      pawnCurrency: 100,
      goldCurrency: 100,
      owned: ['走'],
    };
  }
}

export class MockPurchaseShopItemUseCase implements PurchaseShopItemUseCase {
  async execute(_input: PurchaseShopItemInput): Promise<PurchaseShopItemResult> {
    // UI only フェーズのため、購入結果は固定レスポンスを返す。
    return { success: true, reason: 'UI_ONLY' };
  }
}
