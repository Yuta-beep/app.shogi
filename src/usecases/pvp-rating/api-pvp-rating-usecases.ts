import { PvpRatingApiDataSource } from '@/infra/datasources/pvp-rating-api-datasource';
import { supabase } from '@/lib/supabase/supabase-client';
import { createLoadPvpRatingLeaderboardRunner } from '@/usecases/pvp-rating/load-pvp-rating-leaderboard-usecase';
import { PVP_RATING_LEADERBOARD_LIMIT } from '@/lib/online-match/pvp-rating-leaderboard-cache';

const api = new PvpRatingApiDataSource();

export const apiLoadPvpRatingLeaderboardUseCase = createLoadPvpRatingLeaderboardRunner(async () => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.access_token) {
    throw new Error('No active session');
  }

  return api.fetchLeaderboard(session.access_token, {
    limit: PVP_RATING_LEADERBOARD_LIMIT,
  });
});
