import { ShopRepository } from '@/domain/repositories/shop-repository';
import { ShopApiDataSource } from '@/infra/datasources/shop-api-datasource';
import { ShopCatalogSnapshot, ShopItem } from '@/usecases/piece-shop/load-shop-catalog-usecase';
import { PurchaseShopItemResult } from '@/usecases/piece-shop/purchase-shop-item-usecase';

export class ApiShopRepository implements ShopRepository {
  constructor(private readonly dataSource = new ShopApiDataSource()) {}

  async loadPieceShopCatalog(): Promise<ShopCatalogSnapshot> {
    return this.dataSource.getCatalog();
  }

  async purchasePieceShopItem(item: ShopItem): Promise<PurchaseShopItemResult> {
    return this.dataSource.postPurchase(item);
  }
}
