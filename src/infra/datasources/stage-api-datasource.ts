import { getJson, postJson } from '@/infra/http/api-client';

type StageListResponse = {
  stages: Array<{
    stageNo: number;
    stageName: string;
    canStart: boolean;
  }>;
};

type StageSelectResponse = {
  canStart: boolean;
  reason?: 'LOCKED' | 'NOT_FOUND';
};

type StageBattleSetupResponse = {
  labels: {
    stageLabel: string;
    turnLabel: string;
    handLabel: string;
  };
};

export class StageApiDataSource {
  async getStageList(): Promise<StageListResponse> {
    return getJson<StageListResponse>('/api/v1/stages');
  }

  async postSelectStage(stageNo: number): Promise<StageSelectResponse> {
    return postJson<StageSelectResponse>(`/api/v1/stages/${stageNo}/select`);
  }

  async getBattleSetup(stageNo: number): Promise<StageBattleSetupResponse> {
    return getJson<StageBattleSetupResponse>(`/api/v1/stages/${stageNo}/battle-setup`);
  }
}
