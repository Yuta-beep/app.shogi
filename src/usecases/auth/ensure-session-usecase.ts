import { supabase } from '@/lib/supabase/supabase-client';
import { PlayerApiDataSource } from '@/infra/datasources/player-api-datasource';
import { ApiClientError } from '@/infra/http/api-client';

export type EnsureSessionResult = {
  userId: string;
  isNewUser: boolean;
  needsUsernameSetup: boolean;
};

const playerDataSource = new PlayerApiDataSource();

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError && (error.code === 'UNAUTHORIZED' || error.status === 401);
}

async function signInAnonymousOrThrow() {
  const { data, error } = await supabase.auth.signInAnonymously();
  const user = data.user;
  const accessToken = data.session?.access_token;
  if (error || !user || !accessToken) {
    throw new Error(error?.message ?? 'Anonymous sign-in failed');
  }
  return { userId: user.id, accessToken };
}

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
    const data = await signInAnonymousOrThrow();
    userId = data.userId;
    token = data.accessToken;
    isNewUser = true;
  }

  let displayName: string | null;
  try {
    displayName = await playerDataSource.getDisplayName(token);
  } catch (error) {
    if (!isUnauthorized(error)) throw error;

    await supabase.auth.signOut({ scope: 'local' });
    const data = await signInAnonymousOrThrow();
    userId = data.userId;
    token = data.accessToken;
    isNewUser = true;
    displayName = await playerDataSource.getDisplayName(token);
  }

  return { userId, isNewUser, needsUsernameSetup: displayName === null };
}
