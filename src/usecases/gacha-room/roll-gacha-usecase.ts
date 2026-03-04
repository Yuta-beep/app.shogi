export type RollGachaInput = {
  gachaId: string;
};

export type RollGachaResult = {
  success: boolean;
  label: string;
};

export interface RollGachaUseCase {
  execute(input: RollGachaInput): Promise<RollGachaResult>;
}
