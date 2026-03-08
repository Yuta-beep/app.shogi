import { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

export interface PieceRepository {
  listCatalog(): Promise<PieceCatalogItem[]>;
}
