import type { ShopCatalogSnapshot } from '@/domain/models/shop';

export type { ShopItem, ShopCatalogSnapshot } from '@/domain/models/shop';

export interface LoadShopCatalogUseCase {
  execute(): Promise<ShopCatalogSnapshot>;
}
