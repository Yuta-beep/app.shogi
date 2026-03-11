export type StageSummary = {
  stageNo: number;
  stageName: string;
  unlockStageNo?: number | null;
  canStart: boolean;
};

export type StageSelectResult = {
  canStart: boolean;
  reason?: 'LOCKED' | 'NOT_FOUND';
};

export type StageBattleSetup = {
  labels: {
    stageLabel: string;
    turnLabel: string;
    handLabel: string;
  };
  board?: {
    size: number;
    placements: {
      side: string;
      row: number;
      col: number;
      piece: {
        id: number;
        code: string | null;
        char: string | null;
        name: string | null;
        imageBucket: string | null;
        imageKey: string | null;
        imageSignedUrl: string | null;
      };
    }[];
  };
};

export type StageClearReward = {
  stageNo: number;
  firstClear: boolean;
  clearCount: number;
  granted: {
    pawn: number;
    gold: number;
    pieces: {
      pieceId: number;
      char: string;
      name: string;
      quantity: number;
    }[];
  };
  wallet: {
    pawnCurrency: number;
    goldCurrency: number;
  };
};

export interface StageRepository {
  listStages(): Promise<StageSummary[]>;
  selectStage(stageNo: number): Promise<StageSelectResult>;
  getBattleSetup(stageNo: number): Promise<StageBattleSetup>;
  clearStage(stageNo: number): Promise<StageClearReward>;
}
