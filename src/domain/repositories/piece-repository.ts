import type { PieceCatalogItem } from '@/domain/models/piece';

export interface PieceRepository {
  listCatalog(): Promise<PieceCatalogItem[]>;
}
