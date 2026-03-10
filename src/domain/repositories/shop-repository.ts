import type { PurchaseShopItemResult, ShopCatalogSnapshot, ShopItem } from '@/domain/models/shop';

export interface ShopRepository {
  loadPieceShopCatalog(): Promise<ShopCatalogSnapshot>;
  purchasePieceShopItem(item: ShopItem): Promise<PurchaseShopItemResult>;
}
