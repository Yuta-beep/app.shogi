import { getJson } from '@/infra/http/api-client';
import { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

type PieceCatalogResponse = {
  items: PieceCatalogItem[];
};

export class PieceApiDataSource {
  async getCatalog(): Promise<PieceCatalogResponse> {
    return getJson<PieceCatalogResponse>('/api/v1/pieces/catalog');
  }
}
