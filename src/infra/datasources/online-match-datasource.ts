import type {
  SaveOnlineMatchSetupPayload,
  SaveOnlineMatchSetupResult,
} from '@/domain/models/online-match';
import { postJson } from '@/infra/http/api-client';

export class OnlineMatchApiDataSource {
  constructor(private readonly token: string) {}

  async issueMatchmakingTicket(): Promise<{
    ticket: string;
    expiresAt: string;
    user: { userId: string; displayName: string; rating: number };
  }> {
    return postJson('/api/v1/online-match/ticket', {}, { token: this.token });
  }

  async saveBattleSetup(payload: SaveOnlineMatchSetupPayload): Promise<SaveOnlineMatchSetupResult> {
    const created = await postJson<SaveOnlineMatchSetupResult>(
      '/api/v1/online-match/battle-setup',
      payload,
      { token: this.token },
    );
    await postJson<{
      battleSetupId: string;
      status: 'validated';
      summary: Record<string, unknown>;
    }>(
      `/api/v1/online-match/battle-setup/${encodeURIComponent(created.battleSetupId)}/validate`,
      {},
      { token: this.token },
    );
    const locked = await postJson<{
      battleSetupId: string;
      status: 'locked';
    }>(
      `/api/v1/online-match/battle-setup/${encodeURIComponent(created.battleSetupId)}/lock`,
      {},
      { token: this.token },
    );
    return {
      battleSetupId: locked.battleSetupId,
      status: locked.status,
    };
  }
}
