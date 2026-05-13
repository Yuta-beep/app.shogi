import { z } from 'zod';

export const ShopItemSchema = z.object({
  key: z.enum(['走', '種', '麒', '舞', 'P', '鳴']),
  desc: z.string(),
  move: z.string(),
  cost: z.number(),
  costType: z.enum(['pawn', 'gold']),
});

export const ShopCatalogSnapshotSchema = z.object({
  items: z.array(ShopItemSchema),
  pawnCurrency: z.number(),
  goldCurrency: z.number(),
  owned: z.array(ShopItemSchema.shape.key),
});

export const PurchaseShopItemResultSchema = z.object({
  success: z.boolean(),
  reason: z.enum(['UI_ONLY']).optional(),
});

export type ShopItem = z.infer<typeof ShopItemSchema>;
export type ShopCatalogSnapshot = z.infer<typeof ShopCatalogSnapshotSchema>;
export type PurchaseShopItemResult = z.infer<typeof PurchaseShopItemResultSchema>;
