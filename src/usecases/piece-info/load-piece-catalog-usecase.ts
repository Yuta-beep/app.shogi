export type MoveVector = { dx: number; dy: number; maxStep: number };

export type PieceCatalogItem = {
  char: string;
  name: string;
  unlock: string;
  desc: string;
  skill: string;
  move: string;
  moveVectors: MoveVector[];
  isRepeatable: boolean;
};

export interface LoadPieceCatalogUseCase {
  execute(): Promise<PieceCatalogItem[]>;
}
