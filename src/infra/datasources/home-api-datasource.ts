import { getJson } from '@/infra/http/api-client';
import { HomeSnapshot } from '@/usecases/home/load-home-snapshot-usecase';

type HomeSnapshotResponse = HomeSnapshot;

export class HomeApiDataSource {
  async getSnapshot(): Promise<HomeSnapshotResponse> {
    return getJson<HomeSnapshotResponse>('/api/v1/me/snapshot');
  }
}
