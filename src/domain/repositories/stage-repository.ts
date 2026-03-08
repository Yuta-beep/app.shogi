export type StageSummary = {
  stageNo: number;
  stageName: string;
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
    placements: Array<{
      side: string;
      row: number;
      col: number;
      piece: {
        id: number;
        code: string | null;
        char: string | null;
        name: string | null;
      };
    }>;
  };
};

export interface StageRepository {
  listStages(): Promise<StageSummary[]>;
  selectStage(stageNo: number): Promise<StageSelectResult>;
  getBattleSetup(stageNo: number): Promise<StageBattleSetup>;
}
