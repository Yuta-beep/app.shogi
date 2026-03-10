import type { PieceCatalogItem } from '@/domain/models/piece';

export type { MoveVector, PieceCatalogItem } from '@/domain/models/piece';

export interface LoadPieceCatalogUseCase {
  execute(): Promise<PieceCatalogItem[]>;
}
