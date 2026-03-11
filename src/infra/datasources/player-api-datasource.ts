import { getJson, putJson } from '@/infra/http/api-client';

type DisplayNameResponse = {
  displayName: string | null;
};

export class PlayerApiDataSource {
  async getDisplayName(token: string): Promise<string | null> {
    const response = await getJson<DisplayNameResponse>('/api/v1/me/display-name', { token });
    return response.displayName;
  }

  async updateDisplayName(token: string, displayName: string): Promise<void> {
    await putJson<DisplayNameResponse>('/api/v1/me/display-name', { displayName }, { token });
  }
}
