import type { PurchaseShopItemResult, ShopCatalogSnapshot, ShopItem } from '@/domain/models/shop';
import { getJson, postJson } from '@/infra/http/api-client';
import { supabase } from '@/lib/supabase/supabase-client';

type ShopCatalogResponse = ShopCatalogSnapshot;

type PurchaseResponse = PurchaseShopItemResult;

export class ShopApiDataSource {
  private async getToken(): Promise<string> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) throw new Error('No active session');
    return session.access_token;
  }

  async getCatalog(): Promise<ShopCatalogResponse> {
    const token = await this.getToken();
    return getJson<ShopCatalogResponse>('/api/v1/shops/piece/catalog', { token });
  }

  async postPurchase(item: ShopItem): Promise<PurchaseResponse> {
    const token = await this.getToken();
    return postJson<PurchaseResponse>(
      '/api/v1/shops/piece/purchase',
      { itemKey: item.key },
      { token },
    );
  }
}
