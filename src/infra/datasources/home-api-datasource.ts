import type { HomeSnapshot } from '@/domain/models/home';
import { getJson } from '@/infra/http/api-client';

type HomeSnapshotResponse = HomeSnapshot;

export class HomeApiDataSource {
  async getSnapshot(): Promise<HomeSnapshotResponse> {
    return getJson<HomeSnapshotResponse>('/api/v1/me/snapshot');
  }
}
