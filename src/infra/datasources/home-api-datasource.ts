import type { HomeSnapshot } from '@/domain/models/home';
import { getJson } from '@/infra/http/api-client';
import { supabase } from '@/lib/supabase/supabase-client';

type HomeSnapshotResponse = HomeSnapshot;

export class HomeApiDataSource {
  async getSnapshot(): Promise<HomeSnapshotResponse> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('No active session');

    return getJson<HomeSnapshotResponse>('/api/v1/me/snapshot', {
      token: session.access_token,
    });
  }
}
