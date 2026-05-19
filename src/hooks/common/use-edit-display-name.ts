import { useCallback, useEffect, useState } from 'react';

import { useAuthSession } from '@/hooks/common/auth-session-context';
import { loadHomeSnapshot } from '@/hooks/common/home-snapshot-store';
import { setupUsername } from '@/usecases/player/setup-username-usecase';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '名前の変更に失敗しました';
}

export function useEditDisplayName(currentName: string) {
  const { accessToken } = useAuthSession();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(currentName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setDraft(currentName);
      setError(null);
    }
  }, [visible, currentName]);

  const open = useCallback(() => {
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    if (isSubmitting) return;
    setVisible(false);
    setError(null);
  }, [isSubmitting]);

  const submit = useCallback(async () => {
    if (!accessToken) {
      setError('ログイン情報がありません');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await setupUsername(accessToken, draft);
      await loadHomeSnapshot(true);
      setVisible(false);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, draft]);

  return {
    visible,
    draft,
    setDraft,
    isSubmitting,
    error,
    open,
    close,
    submit,
  };
}
