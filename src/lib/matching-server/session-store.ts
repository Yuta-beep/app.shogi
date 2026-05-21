import type { MatchingGameState, PlayerSide } from '@/domain/matching-server/protocol';

export type ActiveMatchSession = {
  matchId: string;
  role: PlayerSide;
  userId: string;
  game: MatchingGameState;
};

let activeSession: ActiveMatchSession | null = null;

export function setActiveMatchSession(session: ActiveMatchSession): void {
  activeSession = session;
}

export function updateActiveMatchGame(game: MatchingGameState): void {
  if (!activeSession) return;
  activeSession = { ...activeSession, game };
}

export function getActiveMatchSession(): ActiveMatchSession | null {
  return activeSession;
}

export function clearActiveMatchSession(): void {
  activeSession = null;
}
