import { PieceRepository } from '@/domain/repositories/piece-repository';
import type { PieceCatalogItem } from '@/domain/models/piece';
import { preparePieceCatalogForBattleAndDisplay } from '@/features/piece-info/lib/piece-catalog-display';
import { PieceApiDataSource } from '@/infra/datasources/piece-api-datasource';

export class ApiPieceRepository implements PieceRepository {
  constructor(private readonly dataSource = new PieceApiDataSource()) {}

  async listCatalog(): Promise<PieceCatalogItem[]> {
    const response = await this.dataSource.getCatalog();
    return preparePieceCatalogForBattleAndDisplay(response.items);
  }
}
