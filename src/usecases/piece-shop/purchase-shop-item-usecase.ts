import { ShopItem } from '@/usecases/piece-shop/load-shop-catalog-usecase';

export type PurchaseShopItemInput = {
  item: ShopItem;
};

export type PurchaseShopItemResult = {
  success: boolean;
  reason?: 'UI_ONLY';
};

export interface PurchaseShopItemUseCase {
  execute(input: PurchaseShopItemInput): Promise<PurchaseShopItemResult>;
}
