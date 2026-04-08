import type { OnlineBattleSession } from '@/usecases/online-battle/load-online-battle-session-usecase';

export type OnlineBattleDisplayNames = {
  opponentName: string;
  opponentRating: string;
  playerName: string;
  playerRating: string;
};

/** `MockLoadOnlineBattleSessionUseCase` のラベル文字列から HTML 用の名前・レートを取り出す */
export function parseOnlineBattleDisplay(session: OnlineBattleSession): OnlineBattleDisplayNames {
  const opp = session.opponentLabel.match(/相手:\s*(.+?)\s*\(R([^)]+)\)/);
  const ply = session.playerLabel.match(/あなた:\s*(.+?)\s*\(R([^)]+)\)/);
  return {
    opponentName: opp?.[1]?.trim() ?? session.opponentLabel,
    opponentRating: opp?.[2]?.trim() ?? '—',
    playerName: ply?.[1]?.trim() ?? 'あなた',
    playerRating: ply?.[2]?.trim() ?? '—',
  };
}
