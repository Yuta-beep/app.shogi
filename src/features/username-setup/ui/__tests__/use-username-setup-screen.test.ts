import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useUsernameSetupScreen } from '@/features/username-setup/ui/use-username-setup-screen';

const mockReplace = jest.fn();
const mockGetSession = jest.fn();
const mockSignOut = jest.fn();
const mockSignInAnonymously = jest.fn();
const mockSetupUsername = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: (...args: unknown[]) => mockReplace(...args),
  }),
}));

jest.mock('@/lib/supabase/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
    },
  },
}));

jest.mock('@/usecases/player/setup-username-usecase', () => ({
  setupUsername: (...args: unknown[]) => mockSetupUsername(...args),
}));

describe('useUsernameSetupScreen', () => {
  const currentUserId = 'user-current';
  const refreshedUserId = 'user-refreshed';

  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: currentUserId } } },
    });
    mockSignOut.mockResolvedValue({ error: null });
    mockSignInAnonymously.mockResolvedValue({
      data: { user: { id: refreshedUserId } },
      error: null,
    });
  });

  it('初期化で session.user.id を読み取り、成功時はトップへ遷移する', async () => {
    mockSetupUsername.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUsernameSetupScreen());

    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    act(() => {
      result.current.setUsername('将棋太郎');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSetupUsername).toHaveBeenCalledWith(currentUserId, '将棋太郎');
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(result.current.error).toBeNull();
  });

  it('userId が取得できない場合は送信しても何もしない', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const { result } = renderHook(() => useUsernameSetupScreen());

    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    act(() => {
      result.current.setUsername('名前');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSetupUsername).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('通常エラー時はエラーメッセージを保持し遷移しない', async () => {
    mockSetupUsername.mockRejectedValueOnce(new Error('登録失敗'));

    const { result } = renderHook(() => useUsernameSetupScreen());
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    act(() => {
      result.current.setUsername('名前');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('登録失敗');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('players FKエラー時は匿名セッション再作成後に再試行して遷移する', async () => {
    mockSetupUsername
      .mockRejectedValueOnce(new Error('violates foreign key constraint players_id_fkey'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUsernameSetupScreen());
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    act(() => {
      result.current.setUsername('再試行ユーザー');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
    expect(mockSetupUsername).toHaveBeenNthCalledWith(1, currentUserId, '再試行ユーザー');
    expect(mockSetupUsername).toHaveBeenNthCalledWith(2, refreshedUserId, '再試行ユーザー');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('再試行も失敗した場合はエラー表示し遷移しない', async () => {
    mockSetupUsername
      .mockRejectedValueOnce(new Error('violates foreign key constraint'))
      .mockRejectedValueOnce(new Error('再試行失敗'));

    const { result } = renderHook(() => useUsernameSetupScreen());
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    act(() => {
      result.current.setUsername('再試行ユーザー');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('再試行失敗');
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
