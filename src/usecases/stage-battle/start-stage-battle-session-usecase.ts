import { postJson } from '@/infra/http/api-client';
import { supabase } from '@/lib/supabase/supabase-client';
import {
  parseStageBattleSessionStart,
  StageBattleSessionStart,
} from '@/usecases/stage-battle/stage-battle-session-contract';

export class StartStageBattleSessionUseCase {
  private async getAccessToken(): Promise<string | undefined> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async execute(input: {
    stageNo: number;
    clientVersion?: string | null;
  }): Promise<StageBattleSessionStart> {
    const token = await this.getAccessToken();
    const raw = await postJson<unknown>('/api/v1/stage-battles/start', input, { token });
    return parseStageBattleSessionStart(raw);
  }
}
