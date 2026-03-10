export type MoveVector = {
  dx: number;
  dy: number;
  maxStep: number;
};

export type PieceCatalogItem = {
  pieceId?: number;
  char: string;
  name: string;
  imageSignedUrl?: string | null;
  quantity?: number;
  unlock: string;
  desc: string;
  skill: string;
  move: string;
  moveVectors: MoveVector[];
  isRepeatable: boolean;
};
