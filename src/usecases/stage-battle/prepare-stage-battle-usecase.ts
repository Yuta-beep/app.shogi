export type StageBattleSnapshot = {
  stageLabel: string;
  turnLabel: string;
  handLabel: string;
  boardSize: number;
  placements: Array<{
    side: string;
    row: number;
    col: number;
    char: string;
  }>;
};

export interface PrepareStageBattleUseCase {
  execute(input: { stageId?: string }): Promise<StageBattleSnapshot>;
}
