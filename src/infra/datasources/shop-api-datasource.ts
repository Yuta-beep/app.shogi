import { getJson, postJson } from '@/infra/http/api-client';
import { ShopCatalogSnapshot, ShopItem } from '@/usecases/piece-shop/load-shop-catalog-usecase';
import { PurchaseShopItemResult } from '@/usecases/piece-shop/purchase-shop-item-usecase';

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
