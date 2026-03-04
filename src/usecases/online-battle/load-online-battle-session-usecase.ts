export type OnlineBattleSession = {
  roomId: string;
  connectionStatus: string;
  playerLabel: string;
  opponentLabel: string;
};

export interface LoadOnlineBattleSessionUseCase {
  execute(input: { opponent?: string; rating?: string }): Promise<OnlineBattleSession>;
}
