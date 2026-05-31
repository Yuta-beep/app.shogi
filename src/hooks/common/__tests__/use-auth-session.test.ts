import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';

import { AuthSessionProvider } from '../auth-session-context';
import { useAuthSession } from '../use-auth-session';

const mockEnsureSession = jest.fn();

jest.mock('@/usecases/auth/ensure-session-usecase', () => ({
  ensureSession: (...args: unknown[]) => mockEnsureSession(...args),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthSessionProvider, null, children);
}

describe('useAuthSession', () => {
  it('初期状態は isReady: false', () => {
    mockEnsureSession.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAuthSession(), { wrapper });

    expect(result.current.isReady).toBe(false);
    expect(result.current.userId).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.needsUsernameSetup).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.statusMessage).toBeNull();
  });

  it('ensureSessionが成功したら isReady: true になる', async () => {
    mockEnsureSession.mockResolvedValueOnce({
      userId: 'user-uuid-123',
      accessToken: 'token-123',
      isNewUser: false,
      needsUsernameSetup: false,
    });

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.userId).toBe('user-uuid-123');
    expect(result.current.accessToken).toBe('token-123');
    expect(result.current.needsUsernameSetup).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.statusMessage).toBeNull();
  });

  it('needsUsernameSetup: true が正しく反映される', async () => {
    mockEnsureSession.mockResolvedValueOnce({
      userId: 'user-uuid-new',
      accessToken: 'token-new',
      isNewUser: true,
      needsUsernameSetup: true,
    });

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.needsUsernameSetup).toBe(true);
    expect(result.current.userId).toBe('user-uuid-new');
    expect(result.current.accessToken).toBe('token-new');
  });

  it('ensureSessionがエラーをthrowしたら error にセットされる', async () => {
    const err = new Error('network error');
    mockEnsureSession.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.error).toBe(err);
    expect(result.current.userId).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.needsUsernameSetup).toBe(false);
  });

  it('Error以外のthrowもErrorに変換される', async () => {
    mockEnsureSession.mockRejectedValueOnce('string error');

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('string error');
  });

  it('Supabase風のオブジェクトエラーは詳細付きメッセージに正規化される', async () => {
    mockEnsureSession.mockRejectedValueOnce({
      message: 'Auth failed',
      code: '401',
      details: 'Token expired',
      hint: 'Sign in again',
    });

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Auth failed (401 | Token expired | Sign in again)');
  });

  it('ensureSessionのretry通知をローディング文言に反映する', async () => {
    mockEnsureSession.mockImplementationOnce(({ onRetry }) => {
      onRetry({ operation: 'anonymous-sign-in', nextAttempt: 2, maxAttempts: 8, delayMs: 1000 });
      return new Promise(() => {});
    });

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.statusMessage).toBe('サーバーの応答に時間がかかっています');
    });
    expect(result.current.isReady).toBe(false);
  });
});
