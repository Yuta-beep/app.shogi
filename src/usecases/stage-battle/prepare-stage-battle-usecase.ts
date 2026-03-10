export type StageBattleSnapshot = {
  stageLabel: string;
  turnLabel: string;
  handLabel: string;
  boardSize: number;
  placements: {
    side: string;
    row: number;
    col: number;
    pieceId: number | null;
    pieceCode: string | null;
    char: string;
    imageBucket: string | null;
    imageKey: string | null;
    imageSignedUrl: string | null;
  }[];
};

export interface PrepareStageBattleUseCase {
  execute(input: { stageId?: string }): Promise<StageBattleSnapshot>;
}
