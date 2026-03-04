export type StageBattleSnapshot = {
  stageLabel: string;
  turnLabel: string;
  handLabel: string;
};

export interface PrepareStageBattleUseCase {
  execute(input: { stageId?: string }): Promise<StageBattleSnapshot>;
}
