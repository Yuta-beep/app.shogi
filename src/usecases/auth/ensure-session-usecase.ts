import { supabase } from '@/lib/supabase/supabase-client';

export type EnsureSessionResult = {
  userId: string;
  isNewUser: boolean;
};

export async function ensureSession(): Promise<EnsureSessionResult> {
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session) {
    return { userId: sessionData.session.user.id, isNewUser: false };
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(error?.message ?? 'Anonymous sign-in failed');
  }

  return { userId: data.user.id, isNewUser: true };
}
