import { ApiClientError, getJson, putJson } from '@/infra/http/api-client';

type DisplayNameResponse = {
  displayName: string | null;
};

type MeSnapshotDisplayFallback = {
  playerName: string;
};

/** Next の HTML 404 など、`/me/display-name` が未実装の BFF 向け */
function isRouteMissingHtml404(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  if (error.status !== 404) return false;
  return error.code === 'INVALID_JSON_RESPONSE' || error.code === 'HTTP_ERROR';
}

export class PlayerApiDataSource {
  async getDisplayName(token: string): Promise<string | null> {
    try {
      const response = await getJson<DisplayNameResponse>('/api/v1/me/display-name', { token });
      return response.displayName;
    } catch (error) {
      if (!isRouteMissingHtml404(error)) throw error;

      try {
        const snap = await getJson<MeSnapshotDisplayFallback>('/api/v1/me/snapshot', { token });
        const name = typeof snap.playerName === 'string' ? snap.playerName.trim() : '';
        return name.length > 0 ? name : null;
      } catch (snapError) {
        if (snapError instanceof ApiClientError && snapError.code === 'PLAYER_NOT_FOUND') {
          return null;
        }
        throw snapError;
      }
    }
  }

  async updateDisplayName(token: string, displayName: string): Promise<void> {
    await putJson<DisplayNameResponse>('/api/v1/me/display-name', { displayName }, { token });
  }
}
