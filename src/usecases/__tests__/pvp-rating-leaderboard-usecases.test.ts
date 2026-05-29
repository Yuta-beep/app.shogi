import { clearPvpRatingLeaderboardCache } from '@/lib/online-match/pvp-rating-leaderboard-cache';
import { createLoadPvpRatingLeaderboardRunner } from '@/usecases/pvp-rating/load-pvp-rating-leaderboard-usecase';
import { mockLoadPvpRatingLeaderboardUseCase } from '@/usecases/pvp-rating/mock-pvp-rating-usecases';

describe('LoadPvpRatingLeaderboardUseCase', () => {
  beforeEach(() => {
    clearPvpRatingLeaderboardCache();
  });

  it('mock returns 20 entries', async () => {
    const result = await mockLoadPvpRatingLeaderboardUseCase.execute();
    expect(result.entries).toHaveLength(20);
    expect(result.entries[0]?.rank).toBe(1);
    expect(result.fromCache).toBe(false);
  });

  it('uses cache on second call within TTL', async () => {
    let calls = 0;
    const useCase = createLoadPvpRatingLeaderboardRunner(async () => {
      calls += 1;
      return {
        entries: [{ rank: 1, playerId: 'p1', displayName: 'テスト', rating: 100 }],
        snapshotAt: new Date().toISOString(),
      };
    });

    await useCase.execute();
    const second = await useCase.execute();
    expect(calls).toBe(1);
    expect(second.fromCache).toBe(true);
  });

  it('refetches when forceRefresh is true', async () => {
    let calls = 0;
    const useCase = createLoadPvpRatingLeaderboardRunner(async () => {
      calls += 1;
      return {
        entries: [],
        snapshotAt: new Date().toISOString(),
      };
    });

    await useCase.execute();
    await useCase.execute({ forceRefresh: true });
    expect(calls).toBe(2);
  });
});
