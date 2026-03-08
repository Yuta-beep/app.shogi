import { PieceRepository } from '@/domain/repositories/piece-repository';
import { ApiPieceRepository } from '@/infra/repositories/piece-repository';
import { LoadPieceCatalogUseCase, PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

export class ApiLoadPieceCatalogUseCase implements LoadPieceCatalogUseCase {
  constructor(private readonly repository: PieceRepository = new ApiPieceRepository()) {}

  async execute(): Promise<PieceCatalogItem[]> {
    return this.repository.listCatalog();
  }
}
