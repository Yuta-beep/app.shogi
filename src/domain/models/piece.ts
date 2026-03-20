export type MoveVector = {
  dx: number;
  dy: number;
  maxStep: number;
  captureMode?: string | null;
};

export type MoveRule = {
  ruleType: string;
  priority: number;
  params: Record<string, unknown>;
};

export type PieceCatalogItem = {
  pieceId?: number;
  pieceCode?: string | null;
  sfenCode?: string | null;
  canonicalCode?: string | null;
  isPromoted?: boolean;
  moveCode?: string | null;
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
  canJump?: boolean;
  moveConstraints?: Record<string, unknown> | null;
  moveRules?: MoveRule[];
};
