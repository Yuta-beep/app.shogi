export type PieceCatalogItem = {
  char: string;
  name: string;
  unlock: string;
  desc: string;
  skill: string;
  move: string;
};

export interface LoadPieceCatalogUseCase {
  execute(): Promise<PieceCatalogItem[]>;
}
