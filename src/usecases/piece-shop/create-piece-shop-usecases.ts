import { isApiDataSource } from '@/lib/config/data-source';
import {
  ApiLoadShopCatalogUseCase,
  ApiPurchaseShopItemUseCase,
} from '@/usecases/piece-shop/api-piece-shop-usecases';
import { LoadShopCatalogUseCase } from '@/usecases/piece-shop/load-shop-catalog-usecase';
import {
  MockLoadShopCatalogUseCase,
  MockPurchaseShopItemUseCase,
} from '@/usecases/piece-shop/mock-piece-shop-usecases';
import { PurchaseShopItemUseCase } from '@/usecases/piece-shop/purchase-shop-item-usecase';

export function createLoadShopCatalogUseCase(): LoadShopCatalogUseCase {
  return isApiDataSource() ? new ApiLoadShopCatalogUseCase() : new MockLoadShopCatalogUseCase();
}

export function createPurchaseShopItemUseCase(): PurchaseShopItemUseCase {
  return isApiDataSource() ? new ApiPurchaseShopItemUseCase() : new MockPurchaseShopItemUseCase();
}
