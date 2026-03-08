import { useEffect, useState } from 'react';

import { ensureSession } from '@/usecases/auth/ensure-session-usecase';

type AuthSessionState = {
  isReady: boolean;
  userId: string | null;
  error: Error | null;
};

export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>({
    isReady: false,
    userId: null,
    error: null,
  });

  useEffect(() => {
    ensureSession()
      .then(({ userId }) => {
        setState({ isReady: true, userId, error: null });
      })
      .catch((error: unknown) => {
        setState({ isReady: true, userId: null, error: error instanceof Error ? error : new Error(String(error)) });
      });
  }, []);

  return state;
}
