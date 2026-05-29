import type { PvpRatingLeaderboardSnapshot } from '@/domain/models/pvp-rating-leaderboard';
import {
  isPvpRatingLeaderboardCacheStale,
  nextPvpRatingLeaderboardRefreshAt,
  getCachedPvpRatingLeaderboard,
  setCachedPvpRatingLeaderboard,
} from '@/lib/online-match/pvp-rating-leaderboard-cache';

export type PvpRatingLeaderboardResult = PvpRatingLeaderboardSnapshot & {
  fetchedAt: number;
  fromCache: boolean;
  nextRefreshAt: number;
};

export interface LoadPvpRatingLeaderboardUseCase {
  execute(input?: { forceRefresh?: boolean }): Promise<PvpRatingLeaderboardResult>;
}

export function createLoadPvpRatingLeaderboardRunner(
  fetchSnapshot: () => Promise<PvpRatingLeaderboardSnapshot>,
): LoadPvpRatingLeaderboardUseCase {
  return {
    async execute(input) {
      const forceRefresh = input?.forceRefresh === true;
      const cached = getCachedPvpRatingLeaderboard();
      if (!forceRefresh && cached && !isPvpRatingLeaderboardCacheStale(cached.fetchedAt)) {
        return {
          ...cached.snapshot,
          fetchedAt: cached.fetchedAt,
          fromCache: true,
          nextRefreshAt: nextPvpRatingLeaderboardRefreshAt(cached.fetchedAt),
        };
      }

      const snapshot = await fetchSnapshot();
      const stored = setCachedPvpRatingLeaderboard(snapshot);
      return {
        ...snapshot,
        fetchedAt: stored.fetchedAt,
        fromCache: false,
        nextRefreshAt: nextPvpRatingLeaderboardRefreshAt(stored.fetchedAt),
      };
    },
  };
}
