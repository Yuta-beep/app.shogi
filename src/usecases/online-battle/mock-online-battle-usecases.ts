import {
  LoadOnlineBattleSessionUseCase,
  OnlineBattleSession,
} from '@/usecases/online-battle/load-online-battle-session-usecase';

export class MockLoadOnlineBattleSessionUseCase implements LoadOnlineBattleSessionUseCase {
  async execute(input: { opponent?: string; rating?: string }): Promise<OnlineBattleSession> {
    const opponent = input.opponent ?? 'searching...';
    const rating = input.rating ?? '----';

    return {
      roomId: 'A12X9',
      connectionStatus: '接続状態: マッチング完了（UIモック）',
      playerLabel: 'あなた: プレイヤー名 (R1200)',
      opponentLabel: `相手: ${opponent} (R${rating})`,
    };
  }
}
