export type HomeSnapshot = {
  playerName: string;
  rating: number;
  pawnCurrency: number;
  goldCurrency: number;
};

export interface LoadHomeSnapshotUseCase {
  execute(): Promise<HomeSnapshot>;
}
