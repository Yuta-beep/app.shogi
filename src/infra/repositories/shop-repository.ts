import type { PurchaseShopItemResult, ShopCatalogSnapshot, ShopItem } from '@/domain/models/shop';
import { ShopRepository } from '@/domain/repositories/shop-repository';
import { ShopApiDataSource } from '@/infra/datasources/shop-api-datasource';

export class ApiShopRepository implements ShopRepository {
  constructor(private readonly dataSource = new ShopApiDataSource()) {}

  async loadPieceShopCatalog(): Promise<ShopCatalogSnapshot> {
    return this.dataSource.getCatalog();
  }

  async purchasePieceShopItem(item: ShopItem): Promise<PurchaseShopItemResult> {
    return this.dataSource.postPurchase(item);
  }
}
