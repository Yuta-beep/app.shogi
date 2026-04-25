import { postJson } from '@/infra/http/api-client';
import { supabase } from '@/lib/supabase/supabase-client';
import {
  parseStageBattleSessionFinish,
  StageBattleSessionFinish,
} from '@/usecases/stage-battle/stage-battle-session-contract';

export class FinishStageBattleSessionUseCase {
  private async getAccessToken(): Promise<string | undefined> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async execute(input: {
    battleSessionId: string;
    result: 'cleared' | 'failed';
    finalSnapshotHash?: string | null;
    finishPayload?: Record<string, unknown>;
  }): Promise<StageBattleSessionFinish> {
    const token = await this.getAccessToken();
    const raw = await postJson<unknown>('/api/v1/stage-battles/finish', input, { token });
    return parseStageBattleSessionFinish(raw);
  }
}
