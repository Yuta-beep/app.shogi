import { getJson } from '@/infra/http/api-client';

type StageProgressResponse = {
  clearedStageNos: number[];
};

export class StageProgressApiDataSource {
  async getStageProgress(token: string): Promise<StageProgressResponse> {
    return getJson<StageProgressResponse>('/api/v1/stages/progress', { token });
  }
}
