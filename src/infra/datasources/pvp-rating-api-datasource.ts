import { postJson } from '@/infra/http/api-client';

export type ApplyPvpRatingResult = {
  rating: number;
  delta: number;
  alreadyApplied: boolean;
};

export class PvpRatingApiDataSource {
  async applyAfterMatch(
    token: string,
    input: { matchId: string; won: boolean },
  ): Promise<ApplyPvpRatingResult> {
    return postJson<ApplyPvpRatingResult>('/api/v1/me/pvp-rating/apply', input, { token });
  }
}
