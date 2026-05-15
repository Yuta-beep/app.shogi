export type OnlineBattleSession = {
  roomId: string;
  connectionStatus: string;
  playerLabel: string;
  opponentLabel: string;
  /** 対局終了後、ローカルプレイヤー視点の勝敗（未終了は null / 省略） */
  winnerSide?: 'player' | 'enemy' | null;
};

export interface LoadOnlineBattleSessionUseCase {
  execute(input: { opponent?: string; rating?: string }): Promise<OnlineBattleSession>;
}
