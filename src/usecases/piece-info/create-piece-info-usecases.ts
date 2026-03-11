import { isApiDataSource } from '@/lib/config/data-source';
import { ApiLoadPieceCatalogUseCase } from '@/usecases/piece-info/api-piece-info-usecases';
import { LoadPieceCatalogUseCase } from '@/usecases/piece-info/load-piece-catalog-usecase';
import { MockLoadPieceCatalogUseCase } from '@/usecases/piece-info/mock-piece-info-usecases';

export function createLoadPieceCatalogUseCase(): LoadPieceCatalogUseCase {
  return isApiDataSource() ? new ApiLoadPieceCatalogUseCase() : new MockLoadPieceCatalogUseCase();
}
