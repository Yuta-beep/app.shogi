import { ShopRepository } from '@/domain/repositories/shop-repository';
import { ApiShopRepository } from '@/infra/repositories/shop-repository';
import { LoadShopCatalogUseCase, ShopCatalogSnapshot } from '@/usecases/piece-shop/load-shop-catalog-usecase';
import { PurchaseShopItemInput, PurchaseShopItemResult, PurchaseShopItemUseCase } from '@/usecases/piece-shop/purchase-shop-item-usecase';

export class ApiLoadShopCatalogUseCase implements LoadShopCatalogUseCase {
  constructor(private readonly repository: ShopRepository = new ApiShopRepository()) {}

  async execute(): Promise<ShopCatalogSnapshot> {
    return this.repository.loadPieceShopCatalog();
  }
}

export class ApiPurchaseShopItemUseCase implements PurchaseShopItemUseCase {
  constructor(private readonly repository: ShopRepository = new ApiShopRepository()) {}

  async execute(input: PurchaseShopItemInput): Promise<PurchaseShopItemResult> {
    return this.repository.purchasePieceShopItem(input.item);
  }
}
