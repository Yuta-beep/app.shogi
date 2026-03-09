import { supabase } from '@/lib/supabase/supabase-client';
import { PlayerSupabaseDataSource } from '@/infra/datasources/player-supabase-datasource';

export type EnsureSessionResult = {
  userId: string;
  isNewUser: boolean;
  needsUsernameSetup: boolean;
};

const playerDataSource = new PlayerSupabaseDataSource();

export async function ensureSession(): Promise<EnsureSessionResult> {
  const { data: sessionData } = await supabase.auth.getSession();

  let userId: string;
  let isNewUser: boolean;

  if (sessionData.session) {
    userId = sessionData.session.user.id;
    isNewUser = false;
  } else {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      throw new Error(error?.message ?? 'Anonymous sign-in failed');
    }
    userId = data.user.id;
    isNewUser = true;
  }

  const displayName = await playerDataSource.getDisplayName(userId);
  return { userId, isNewUser, needsUsernameSetup: displayName === null };
}
