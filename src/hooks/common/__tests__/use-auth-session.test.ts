import { renderHook, waitFor } from '@testing-library/react-native';

const mockEnsureSession = jest.fn();

jest.mock('@/usecases/auth/ensure-session-usecase', () => ({
  ensureSession: (...args: unknown[]) => mockEnsureSession(...args),
}));

import { useAuthSession } from '../use-auth-session';

describe('useAuthSession', () => {
  it('初期状態は isReady: false', () => {
    mockEnsureSession.mockReturnValue(new Promise(() => {})); // pending
    const { result } = renderHook(() => useAuthSession());

    expect(result.current.isReady).toBe(false);
    expect(result.current.userId).toBeNull();
    expect(result.current.needsUsernameSetup).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('ensureSessionが成功したら isReady: true になる', async () => {
    mockEnsureSession.mockResolvedValueOnce({
      userId: 'user-uuid-123',
      isNewUser: false,
      needsUsernameSetup: false,
    });

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.userId).toBe('user-uuid-123');
    expect(result.current.needsUsernameSetup).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('needsUsernameSetup: true が正しく反映される', async () => {
    mockEnsureSession.mockResolvedValueOnce({
      userId: 'user-uuid-new',
      isNewUser: true,
      needsUsernameSetup: true,
    });

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.needsUsernameSetup).toBe(true);
    expect(result.current.userId).toBe('user-uuid-new');
  });

  it('ensureSessionがエラーをthrowしたら error にセットされる', async () => {
    const err = new Error('network error');
    mockEnsureSession.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.error).toBe(err);
    expect(result.current.userId).toBeNull();
    expect(result.current.needsUsernameSetup).toBe(false);
  });

  it('Error以外のthrowもErrorに変換される', async () => {
    mockEnsureSession.mockRejectedValueOnce('string error');

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('string error');
  });
});
