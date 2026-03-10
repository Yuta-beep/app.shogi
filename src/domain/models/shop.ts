export type ShopItem = {
  key: '走' | '種' | '麒' | '舞' | 'P' | '鳴';
  desc: string;
  move: string;
  cost: number;
  costType: 'pawn' | 'gold';
};

export type ShopCatalogSnapshot = {
  items: ShopItem[];
  pawnCurrency: number;
  goldCurrency: number;
  owned: ShopItem['key'][];
};

export type PurchaseShopItemResult = {
  success: boolean;
  reason?: 'UI_ONLY';
};
