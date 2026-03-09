import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/supabase-client';
import { setupUsername } from '@/usecases/player/setup-username-usecase';

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
    } catch (e) {
      setError(e instanceof Error ? e.message : '登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return { username, setUsername, isInitializing, isSubmitting, error, handleSubmit };
}
