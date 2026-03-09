import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/supabase-client';
import { setupUsername } from '@/usecases/player/setup-username-usecase';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return '登録に失敗しました';
}

function isPlayersUserFkError(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  return (
    message.includes('players_id_fkey') ||
    message.includes('not present in table "users"') ||
    message.includes('violates foreign key constraint')
  );
}

async function refreshAnonymousSession(): Promise<string> {
  await supabase.auth.signOut({ scope: 'local' });

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(error?.message ?? '匿名ログインの再作成に失敗しました');
  }

  return data.user.id;
}

export function useUsernameSetupScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setUserId(data.session?.user.id ?? null);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  const handleSubmit = async () => {
    if (!userId) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await setupUsername(userId, username);
      router.replace('/');
      return;
    } catch (e) {
      if (isPlayersUserFkError(e)) {
        try {
          const refreshedUserId = await refreshAnonymousSession();
          setUserId(refreshedUserId);
          await setupUsername(refreshedUserId, username);
          router.replace('/');
          return;
        } catch (retryError) {
          setError(errorMessage(retryError));
          setIsSubmitting(false);
          return;
        }
      }

      setError(errorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return { username, setUsername, isInitializing, isSubmitting, error, handleSubmit };
}
