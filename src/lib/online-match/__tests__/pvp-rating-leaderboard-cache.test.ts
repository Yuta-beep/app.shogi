import {
  clearPvpRatingLeaderboardCache,
  getCachedPvpRatingLeaderboard,
  isPvpRatingLeaderboardCacheStale,
  nextPvpRatingLeaderboardRefreshAt,
  PVP_RATING_LEADERBOARD_CACHE_TTL_MS,
  setCachedPvpRatingLeaderboard,
} from '@/lib/online-match/pvp-rating-leaderboard-cache';

describe('pvp-rating-leaderboard-cache', () => {
  beforeEach(() => {
    clearPvpRatingLeaderboardCache();
  });

  it('returns fresh cache within TTL', () => {
    const now = 1_000_000;
    setCachedPvpRatingLeaderboard({ entries: [], snapshotAt: new Date(now).toISOString() });
    const cached = getCachedPvpRatingLeaderboard();
    expect(cached).not.toBeNull();
    expect(
      isPvpRatingLeaderboardCacheStale(
        cached!.fetchedAt,
        now + PVP_RATING_LEADERBOARD_CACHE_TTL_MS - 1,
      ),
    ).toBe(false);
  });

  it('marks cache stale after 3 hours', () => {
    const fetchedAt = 5_000_000;
    expect(
      isPvpRatingLeaderboardCacheStale(fetchedAt, fetchedAt + PVP_RATING_LEADERBOARD_CACHE_TTL_MS),
    ).toBe(true);
  });

  it('computes next refresh time', () => {
    const fetchedAt = 100;
    expect(nextPvpRatingLeaderboardRefreshAt(fetchedAt)).toBe(
      fetchedAt + PVP_RATING_LEADERBOARD_CACHE_TTL_MS,
    );
  });
});
