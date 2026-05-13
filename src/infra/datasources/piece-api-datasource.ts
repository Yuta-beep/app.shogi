import { PieceCatalogResponseSchema, type PieceCatalogResponse } from '@/domain/models/piece';
import { getJson } from '@/infra/http/api-client';

export class PieceApiDataSource {
  async getCatalog(): Promise<PieceCatalogResponse> {
    const response = await getJson<unknown>('/api/v1/pieces/catalog');
    return PieceCatalogResponseSchema.parse(response);
  }
}
