import {
  LoadOnlineBattleSessionUseCase,
  OnlineBattleSession,
} from '@/usecases/online-battle/load-online-battle-session-usecase';

const mockSessionBase: OnlineBattleSession = {
  roomId: 'A12X9',
  matchId: 'mock-match',
  connectionStatus: '接続状態: マッチング完了（UIモック）',
  playerLabel: 'あなた: 先手',
  opponentLabel: '相手: 後手',
  role: 'black',
  isMyTurn: true,
  turnLabel: 'あなたの手番',
  version: 1,
  boardPieces: [],
  playerHandSummary: 'なし',
  opponentHandSummary: 'なし',
  logLines: ['モックセッション'],
  winnerSide: null,
};

export class MockLoadOnlineBattleSessionUseCase implements LoadOnlineBattleSessionUseCase {
  async execute(input: {
    matchId?: string;
    opponent?: string;
    rating?: string;
  }): Promise<OnlineBattleSession> {
    const opponent = input.opponent ?? 'searching...';
    const rating = input.rating ?? '----';

    return {
      ...mockSessionBase,
      matchId: input.matchId ?? mockSessionBase.matchId,
      opponentLabel: `相手: ${opponent} (R${rating})`,
    };
  }
}
