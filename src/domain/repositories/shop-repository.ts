import { ShopCatalogSnapshot, ShopItem } from '@/usecases/piece-shop/load-shop-catalog-usecase';
import { PurchaseShopItemResult } from '@/usecases/piece-shop/purchase-shop-item-usecase';

export interface ShopRepository {
  loadPieceShopCatalog(): Promise<ShopCatalogSnapshot>;
  purchasePieceShopItem(item: ShopItem): Promise<PurchaseShopItemResult>;
}
