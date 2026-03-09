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
  board?: {
    size: number;
    placements: Array<{
      side: string;
      row: number;
      col: number;
      piece: {
        id: number;
        code: string | null;
        char: string | null;
        name: string | null;
        imageBucket: string | null;
        imageKey: string | null;
        imageSignedUrl: string | null;
      };
    }>;
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
