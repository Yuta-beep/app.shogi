import { PieceRepository } from '@/domain/repositories/piece-repository';
import { PieceApiDataSource } from '@/infra/datasources/piece-api-datasource';
import { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

export class ApiPieceRepository implements PieceRepository {
  constructor(private readonly dataSource = new PieceApiDataSource()) {}

  async listCatalog(): Promise<PieceCatalogItem[]> {
    const response = await this.dataSource.getCatalog();
    return response.items;
  }
}
