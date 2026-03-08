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
};

export interface StageRepository {
  listStages(): Promise<StageSummary[]>;
  selectStage(stageNo: number): Promise<StageSelectResult>;
  getBattleSetup(stageNo: number): Promise<StageBattleSetup>;
}
