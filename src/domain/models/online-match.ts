export type BattleSetupPlacement = {
  row: number;
  col: number;
  pieceId: number;
  pieceCode: string;
};

export type BattleSetupHandPiece = {
  pieceId: number;
  pieceCode: string;
  count: number;
};

export type SaveOnlineMatchSetupPayload = {
  name?: string;
  boardLayout: BattleSetupPlacement[];
  handsLayout: BattleSetupHandPiece[];
  selectedPieceIds: number[];
};

export type SaveOnlineMatchSetupResult = {
  battleSetupId: string;
  status: 'draft' | 'validated' | 'locked' | 'consumed';
};

export type MatchingSnapshot = {
  title: string;
  status: string;
  progress: number;
};
