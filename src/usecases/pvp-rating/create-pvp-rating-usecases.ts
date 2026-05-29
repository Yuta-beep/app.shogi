import { isApiDataSource } from '@/lib/config/data-source';
import type { LoadPvpRatingLeaderboardUseCase } from '@/usecases/pvp-rating/load-pvp-rating-leaderboard-usecase';
import { apiLoadPvpRatingLeaderboardUseCase } from '@/usecases/pvp-rating/api-pvp-rating-usecases';
import { mockLoadPvpRatingLeaderboardUseCase } from '@/usecases/pvp-rating/mock-pvp-rating-usecases';

export function createLoadPvpRatingLeaderboardUseCase(): LoadPvpRatingLeaderboardUseCase {
  return isApiDataSource()
    ? apiLoadPvpRatingLeaderboardUseCase
    : mockLoadPvpRatingLeaderboardUseCase;
}
