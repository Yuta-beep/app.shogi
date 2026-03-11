import { ensureSession } from '../ensure-session-usecase';
import { ApiClientError } from '@/infra/http/api-client';

const mockGetSession = jest.fn();
const mockSignInAnonymously = jest.fn();
const mockSignOut = jest.fn();
const mockGetDisplayName = jest.fn();

jest.mock('@/lib/supabase/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

jest.mock('@/infra/datasources/player-api-datasource', () => ({
  PlayerApiDataSource: jest.fn().mockImplementation(() => ({
    getDisplayName: (...args: unknown[]) => mockGetDisplayName(...args),
  })),
}));

describe('ensureSession', () => {
  const userId = 'user-uuid-abc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('セッション取得時にエラーが発生した場合', () => {
    it('そのままthrowし、匿名サインインしない', async () => {
      mockGetSession.mockRejectedValueOnce(new Error('session fetch failed'));

      await expect(ensureSession()).rejects.toThrow('session fetch failed');
      expect(mockSignInAnonymously).not.toHaveBeenCalled();
      expect(mockGetDisplayName).not.toHaveBeenCalled();
    });
  });

  describe('既存セッションがある場合', () => {
    const session = { user: { id: userId }, access_token: 'token-123' };

    it('display_nameがあれば needsUsernameSetup: false を返す', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session } });
      mockGetDisplayName.mockResolvedValueOnce('プレイヤー名');

      const result = await ensureSession();

      expect(result).toEqual({ userId, isNewUser: false, needsUsernameSetup: false });
      expect(mockSignInAnonymously).not.toHaveBeenCalled();
      expect(mockGetDisplayName).toHaveBeenCalledWith('token-123');
    });

    it('display_nameがnullなら needsUsernameSetup: true を返す', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session } });
      mockGetDisplayName.mockResolvedValueOnce(null);

      const result = await ensureSession();

      expect(result).toEqual({ userId, isNewUser: false, needsUsernameSetup: true });
    });

    it('display_name取得でエラーが起きたらthrowする', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session } });
      mockGetDisplayName.mockRejectedValueOnce(new Error('profile fetch failed'));

      await expect(ensureSession()).rejects.toThrow('profile fetch failed');
      expect(mockSignInAnonymously).not.toHaveBeenCalled();
    });

    it('display_name取得で401なら匿名セッションを再作成して再試行する', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session } });
      mockGetDisplayName
        .mockRejectedValueOnce(
          new ApiClientError({ code: 'UNAUTHORIZED', message: 'Authentication required' }, 401),
        )
        .mockResolvedValueOnce(null);
      mockSignInAnonymously.mockResolvedValueOnce({
        data: { user: { id: 'reauthed-user' }, session: { access_token: 'token-reauthed' } },
        error: null,
      });

      const result = await ensureSession();

      expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
      expect(mockGetDisplayName).toHaveBeenNthCalledWith(1, 'token-123');
      expect(mockGetDisplayName).toHaveBeenNthCalledWith(2, 'token-reauthed');
      expect(result).toEqual({
        userId: 'reauthed-user',
        isNewUser: true,
        needsUsernameSetup: true,
      });
    });
  });

  describe('セッションがない場合（初回起動）', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
    });

    it('匿名サインインし isNewUser: true, needsUsernameSetup: true を返す', async () => {
      mockSignInAnonymously.mockResolvedValueOnce({
        data: { user: { id: userId }, session: { access_token: 'token-abc' } },
        error: null,
      });
      mockGetDisplayName.mockResolvedValueOnce(null);

      const result = await ensureSession();

      expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
      expect(mockGetDisplayName).toHaveBeenCalledWith('token-abc');
      expect(result).toEqual({ userId, isNewUser: true, needsUsernameSetup: true });
    });

    it('getSession -> signInAnonymously -> getDisplayName の順で呼ばれる', async () => {
      mockSignInAnonymously.mockResolvedValueOnce({
        data: { user: { id: userId }, session: { access_token: 'token-abc' } },
        error: null,
      });
      mockGetDisplayName.mockResolvedValueOnce('プレイヤー名');

      await ensureSession();

      const getSessionOrder = mockGetSession.mock.invocationCallOrder[0];
      const signInOrder = mockSignInAnonymously.mock.invocationCallOrder[0];
      const getDisplayNameOrder = mockGetDisplayName.mock.invocationCallOrder[0];

      expect(getSessionOrder).toBeLessThan(signInOrder);
      expect(signInOrder).toBeLessThan(getDisplayNameOrder);
    });

    it('signInAnonymouslyがrejectした場合はthrowする', async () => {
      mockSignInAnonymously.mockRejectedValueOnce(new Error('network timeout'));

      await expect(ensureSession()).rejects.toThrow('network timeout');
      expect(mockGetDisplayName).not.toHaveBeenCalled();
    });

    it('signInAnonymouslyがエラーを返した場合はthrowする', async () => {
      mockSignInAnonymously.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'sign-in failed' },
      });

      await expect(ensureSession()).rejects.toThrow('sign-in failed');
    });

    it('signInAnonymouslyがuserなしを返した場合はthrowする', async () => {
      mockSignInAnonymously.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      });

      await expect(ensureSession()).rejects.toThrow('Anonymous sign-in failed');
    });
  });
});
