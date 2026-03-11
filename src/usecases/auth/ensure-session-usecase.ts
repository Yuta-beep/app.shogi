import { supabase } from '@/lib/supabase/supabase-client';
import { PlayerApiDataSource } from '@/infra/datasources/player-api-datasource';

export type EnsureSessionResult = {
  userId: string;
  isNewUser: boolean;
  needsUsernameSetup: boolean;
};

const playerDataSource = new PlayerApiDataSource();

export async function ensureSession(): Promise<EnsureSessionResult> {
  const { data: sessionData } = await supabase.auth.getSession();

  let userId: string;
  let token: string;
  let isNewUser: boolean;

  const currentSession = sessionData.session;

  if (currentSession) {
    userId = currentSession.user.id;
    token = currentSession.access_token;
    isNewUser = false;
  } else {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user || !data.session?.access_token) {
      throw new Error(error?.message ?? 'Anonymous sign-in failed');
    }
    userId = data.user.id;
    token = data.session.access_token;
    isNewUser = true;
  }

  const displayName = await playerDataSource.getDisplayName(token);
  return { userId, isNewUser, needsUsernameSetup: displayName === null };
}
