import type { PurchaseShopItemResult, ShopCatalogSnapshot, ShopItem } from '@/domain/models/shop';
import { getJson, postJson } from '@/infra/http/api-client';

type ShopCatalogResponse = ShopCatalogSnapshot;

type PurchaseResponse = PurchaseShopItemResult;

export class ShopApiDataSource {
  async getCatalog(): Promise<ShopCatalogResponse> {
    return getJson<ShopCatalogResponse>('/api/v1/shops/piece/catalog');
  }

  async postPurchase(item: ShopItem): Promise<PurchaseResponse> {
    return postJson<PurchaseResponse>('/api/v1/shops/piece/purchase', { itemKey: item.key });
  }
}
