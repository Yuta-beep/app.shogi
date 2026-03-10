import type { PurchaseShopItemResult, ShopItem } from '@/domain/models/shop';

export type PurchaseShopItemInput = {
  item: ShopItem;
};
export type { PurchaseShopItemResult } from '@/domain/models/shop';

export interface PurchaseShopItemUseCase {
  execute(input: PurchaseShopItemInput): Promise<PurchaseShopItemResult>;
}
