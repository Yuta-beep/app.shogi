const mockGetSession = jest.fn();
const mockSignInAnonymously = jest.fn();
const mockGetDisplayName = jest.fn();

jest.mock('@/lib/supabase/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
    },
  },
}));

jest.mock('@/infra/datasources/player-supabase-datasource', () => ({
  PlayerSupabaseDataSource: jest.fn().mockImplementation(() => ({
    getDisplayName: (...args: unknown[]) => mockGetDisplayName(...args),
  })),
}));

import { ensureSession } from '../ensure-session-usecase';

describe('ensureSession', () => {
  const userId = 'user-uuid-abc';

  describe('既存セッションがある場合', () => {
    const session = { user: { id: userId } };

    it('display_nameがあれば needsUsernameSetup: false を返す', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session } });
      mockGetDisplayName.mockResolvedValueOnce('プレイヤー名');

      const result = await ensureSession();

      expect(result).toEqual({ userId, isNewUser: false, needsUsernameSetup: false });
      expect(mockSignInAnonymously).not.toHaveBeenCalled();
    });

    it('display_nameがnullなら needsUsernameSetup: true を返す', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session } });
      mockGetDisplayName.mockResolvedValueOnce(null);

      const result = await ensureSession();

      expect(result).toEqual({ userId, isNewUser: false, needsUsernameSetup: true });
    });
  });

  describe('セッションがない場合（初回起動）', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
    });

    it('匿名サインインし isNewUser: true, needsUsernameSetup: true を返す', async () => {
      mockSignInAnonymously.mockResolvedValueOnce({ data: { user: { id: userId } }, error: null });
      mockGetDisplayName.mockResolvedValueOnce(null);

      const result = await ensureSession();

      expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ userId, isNewUser: true, needsUsernameSetup: true });
    });

    it('signInAnonymouslyがエラーを返した場合はthrowする', async () => {
      mockSignInAnonymously.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'sign-in failed' },
      });

      await expect(ensureSession()).rejects.toThrow('sign-in failed');
    });

    it('signInAnonymouslyがuserなしを返した場合はthrowする', async () => {
      mockSignInAnonymously.mockResolvedValueOnce({ data: { user: null }, error: null });

      await expect(ensureSession()).rejects.toThrow('Anonymous sign-in failed');
    });
  });
});
