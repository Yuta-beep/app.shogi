import { getJson, postJson } from '@/infra/http/api-client';
import { supabase } from '@/lib/supabase/supabase-client';
import { GachaLobbySnapshot } from '@/usecases/gacha-room/load-gacha-lobby-usecase';
import { RollGachaResult } from '@/usecases/gacha-room/roll-gacha-usecase';

export class GachaApiDataSource {
  private async getToken(): Promise<string> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) throw new Error('No active session');
    return session.access_token;
  }

  async getLobby(): Promise<GachaLobbySnapshot> {
    const token = await this.getToken();
    return getJson<GachaLobbySnapshot>('/api/v1/gacha/lobby', { token });
  }

  async roll(gachaId: string): Promise<RollGachaResult> {
    const token = await this.getToken();
    return postJson<RollGachaResult>('/api/v1/gacha/roll', { gachaId }, { token });
  }
}
