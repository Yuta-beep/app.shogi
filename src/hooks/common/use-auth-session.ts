import { useEffect, useState } from 'react';

import { ensureSession } from '@/usecases/auth/ensure-session-usecase';

type AuthSessionState = {
  isReady: boolean;
  userId: string | null;
  needsUsernameSetup: boolean;
  error: Error | null;
};

export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>({
    isReady: false,
    userId: null,
    needsUsernameSetup: false,
    error: null,
  });

  useEffect(() => {
    ensureSession()
      .then(({ userId, needsUsernameSetup }) => {
        setState({ isReady: true, userId, needsUsernameSetup, error: null });
      })
      .catch((error: unknown) => {
        setState({
          isReady: true,
          userId: null,
          needsUsernameSetup: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
  }, []);

  return state;
}
