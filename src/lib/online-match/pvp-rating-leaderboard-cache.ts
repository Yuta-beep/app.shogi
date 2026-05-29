import type { PvpRatingLeaderboardSnapshot } from '@/domain/models/pvp-rating-leaderboard';

/** ランキング一覧の再取得間隔（3時間） */
export const PVP_RATING_LEADERBOARD_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

export const PVP_RATING_LEADERBOARD_LIMIT = 20;

type CachedLeaderboard = {
  snapshot: PvpRatingLeaderboardSnapshot;
  fetchedAt: number;
};

let cache: CachedLeaderboard | null = null;

export function getCachedPvpRatingLeaderboard(): CachedLeaderboard | null {
  return cache;
}

export function setCachedPvpRatingLeaderboard(
  snapshot: PvpRatingLeaderboardSnapshot,
): CachedLeaderboard {
  const entry: CachedLeaderboard = {
    snapshot,
    fetchedAt: Date.now(),
  };
  cache = entry;
  return entry;
}

export function isPvpRatingLeaderboardCacheStale(fetchedAt: number, now = Date.now()): boolean {
  return now - fetchedAt >= PVP_RATING_LEADERBOARD_CACHE_TTL_MS;
}

export function clearPvpRatingLeaderboardCache(): void {
  cache = null;
}

export function nextPvpRatingLeaderboardRefreshAt(fetchedAt: number): number {
  return fetchedAt + PVP_RATING_LEADERBOARD_CACHE_TTL_MS;
}
