import { HomeSnapshotSchema, type HomeSnapshot } from '@/domain/models/home';
import { getJson } from '@/infra/http/api-client';
import { supabase } from '@/lib/supabase/supabase-client';

export class HomeApiDataSource {
  async getSnapshot(): Promise<HomeSnapshot> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('No active session');

    const response = await getJson<unknown>('/api/v1/me/snapshot', {
      token: session.access_token,
    });
    return HomeSnapshotSchema.parse(response);
  }
}
