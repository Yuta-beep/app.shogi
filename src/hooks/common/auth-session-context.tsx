import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { ensureSession } from '@/usecases/auth/ensure-session-usecase';

const AUTH_RETRY_MESSAGE = 'サーバーの応答に時間がかかっています';

type AuthSessionState = {
  isReady: boolean;
  userId: string | null;
  accessToken: string | null;
  needsUsernameSetup: boolean;
  error: Error | null;
  statusMessage: string | null;
};

const initialState: AuthSessionState = {
  isReady: false,
  userId: null,
  accessToken: null,
  needsUsernameSetup: false,
  error: null,
  statusMessage: null,
};

const AuthSessionContext = createContext<AuthSessionState>(initialState);

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

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthSessionState>(initialState);

  useEffect(() => {
    let active = true;

    ensureSession({
      onRetry: ({ nextAttempt }) => {
        if (!active || nextAttempt < 2) return;
        setState((current) => ({
          ...current,
          statusMessage: AUTH_RETRY_MESSAGE,
        }));
      },
    })
      .then(({ userId, accessToken, needsUsernameSetup }) => {
        if (!active) return;
        setState({
          isReady: true,
          userId,
          accessToken,
          needsUsernameSetup,
          error: null,
          statusMessage: null,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          isReady: true,
          userId: null,
          accessToken: null,
          needsUsernameSetup: false,
          error: normalizeUnknownError(error),
          statusMessage: null,
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionState {
  return useContext(AuthSessionContext);
}
