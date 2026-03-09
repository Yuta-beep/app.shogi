import { useEffect, useState } from 'react';

import { ensureSession } from '@/usecases/auth/ensure-session-usecase';

type AuthSessionState = {
  isReady: boolean;
  userId: string | null;
  needsUsernameSetup: boolean;
  error: Error | null;
};

function normalizeUnknownError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);

  if (error && typeof error === 'object') {
    const maybe = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const message = typeof maybe.message === 'string' ? maybe.message : 'Unknown auth error';
    const extras = [maybe.code, maybe.details, maybe.hint].filter((v) => typeof v === 'string');
    return new Error(extras.length > 0 ? `${message} (${extras.join(' | ')})` : message);
  }

  return new Error(String(error));
}

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
          error: normalizeUnknownError(error),
        });
      });
  }, []);

  return state;
}
