export type StageClearRewardPiece = {
  pieceId: number;
  char: string;
  name: string;
  quantity: number;
};

export type StageClearRewardResult = {
  stageNo: number;
  firstClear: boolean;
  clearCount: number;
  granted: {
    pawn: number;
    gold: number;
    pieces: StageClearRewardPiece[];
  };
  wallet: {
    pawnCurrency: number;
    goldCurrency: number;
  };
};

export interface ClaimStageClearRewardUseCase {
  execute(input: { stageId?: string }): Promise<StageClearRewardResult | null>;
}
