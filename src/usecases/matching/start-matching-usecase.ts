export type MatchingSnapshot = {
  title: string;
  status: string;
  progress: number;
};

export interface StartMatchingUseCase {
  execute(): Promise<MatchingSnapshot>;
}
