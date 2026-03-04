export type SelectStageInput = { stageId: number };

export type SelectStageResult = {
  canStart: boolean;
  reason?: 'LOCKED' | 'NOT_FOUND';
};

export interface SelectStageUseCase {
  execute(input: SelectStageInput): Promise<SelectStageResult>;
}
