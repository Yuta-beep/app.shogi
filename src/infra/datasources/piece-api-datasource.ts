import type { PieceCatalogItem } from '@/domain/models/piece';
import { getJson } from '@/infra/http/api-client';

type PieceCatalogResponse = {
  items: PieceCatalogItem[];
};

export class PieceApiDataSource {
  async getCatalog(): Promise<PieceCatalogResponse> {
    return getJson<PieceCatalogResponse>('/api/v1/pieces/catalog');
  }
}
