import { getJson, postJson } from '@/infra/http/api-client';

type StageListResponse = {
  stages: {
    stageNo: number;
    stageName: string;
    unlockStageNo?: number | null;
    canStart: boolean;
  }[];
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
    placements: {
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
    }[];
  };
};

type StageClearRewardResponse = {
  stageNo: number;
  firstClear: boolean;
  clearCount: number;
  granted: {
    pawn: number;
    gold: number;
    pieces: {
      pieceId: number;
      char: string;
      name: string;
      quantity: number;
    }[];
  };
  wallet: {
    pawnCurrency: number;
    goldCurrency: number;
  };
};

export class StageApiDataSource {
  private async getAccessToken(): Promise<string | undefined> {
    const { supabase } = await import('@/lib/supabase/supabase-client');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async getStageList(): Promise<StageListResponse> {
    return getJson<StageListResponse>('/api/v1/stages');
  }

  async postSelectStage(stageNo: number): Promise<StageSelectResponse> {
    return postJson<StageSelectResponse>(`/api/v1/stages/${stageNo}/select`);
  }

  async getBattleSetup(stageNo: number): Promise<StageBattleSetupResponse> {
    const token = await this.getAccessToken();
    return getJson<StageBattleSetupResponse>(`/api/v1/stages/${stageNo}/battle-setup`, { token });
  }

  async postClearStage(stageNo: number): Promise<StageClearRewardResponse> {
    const token = await this.getAccessToken();
    return postJson<StageClearRewardResponse>(`/api/v1/stages/${stageNo}/clear`, undefined, {
      token,
    });
  }
}
