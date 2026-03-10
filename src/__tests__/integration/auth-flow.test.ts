/**
 * 統合テスト: 認証フロー
 *
 * Supabaseクライアントのみモックし、
 * ensureSession → PlayerSupabaseDataSource → useAuthSession の
 * 複数レイヤーを通したフローを検証する。
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useAuthSession } from '@/hooks/common/use-auth-session';
import { setupUsername } from '@/usecases/player/setup-username-usecase';

const mockGetSession: jest.Mock = jest.fn();
const mockSignInAnonymously: jest.Mock = jest.fn();
const mockSingle: jest.Mock = jest.fn();
const mockEq: jest.Mock = jest.fn(() => ({ single: mockSingle }));
const mockSelect: jest.Mock = jest.fn(() => ({ eq: mockEq }));
const mockUpdateEq: jest.Mock = jest.fn();
const mockUpdate: jest.Mock = jest.fn(() => ({ eq: mockUpdateEq }));
const mockFrom: jest.Mock = jest.fn(() => ({ select: mockSelect, update: mockUpdate }));

jest.mock('@/lib/supabase/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signInAnonymously: () => mockSignInAnonymously(),
    },
    from: (table: string) => mockFrom(table),
  },
}));

const NEW_USER_ID = 'new-user-uuid';
const EXISTING_USER_ID = 'existing-user-uuid';

describe('認証フロー 統合テスト', () => {
  describe('初回起動（セッションなし）', () => {
    it('匿名サインインし needsUsernameSetup: true になる', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });
      mockSignInAnonymously.mockResolvedValueOnce({
        data: { user: { id: NEW_USER_ID } },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({ data: { display_name: null }, error: null });

      const { result } = renderHook(() => useAuthSession());

      await waitFor(() => expect(result.current.isReady).toBe(true));

      expect(result.current.userId).toBe(NEW_USER_ID);
      expect(result.current.needsUsernameSetup).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('2回目以降の起動（セッションあり）', () => {
    it('username設定済みなら needsUsernameSetup: false になる', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: EXISTING_USER_ID } } },
      });
      mockSingle.mockResolvedValueOnce({ data: { display_name: '将棋太郎' }, error: null });

      const { result } = renderHook(() => useAuthSession());

      await waitFor(() => expect(result.current.isReady).toBe(true));

      expect(result.current.userId).toBe(EXISTING_USER_ID);
      expect(result.current.needsUsernameSetup).toBe(false);
    });

    it('username未設定なら needsUsernameSetup: true になる', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: EXISTING_USER_ID } } },
      });
      mockSingle.mockResolvedValueOnce({ data: { display_name: null }, error: null });

      const { result } = renderHook(() => useAuthSession());

      await waitFor(() => expect(result.current.isReady).toBe(true));

      expect(result.current.userId).toBe(EXISTING_USER_ID);
      expect(result.current.needsUsernameSetup).toBe(true);
    });
  });

  describe('ユーザーネーム登録フロー', () => {
    it('setupUsernameがSupabaseのupdateを呼ぶ', async () => {
      mockUpdateEq.mockResolvedValueOnce({ error: null });

      await setupUsername(NEW_USER_ID, '新プレイヤー');

      expect(mockFrom).toHaveBeenCalledWith('players');
      expect(mockUpdate).toHaveBeenCalledWith({ display_name: '新プレイヤー' });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', NEW_USER_ID);
    });

    it('username登録後に再起動するとneedsUsernameSetup: falseになる', async () => {
      // username登録
      mockUpdateEq.mockResolvedValueOnce({ error: null });
      await setupUsername(NEW_USER_ID, '新プレイヤー');

      // 再起動（セッション残存、display_nameあり）
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: NEW_USER_ID } } },
      });
      mockSingle.mockResolvedValueOnce({ data: { display_name: '新プレイヤー' }, error: null });

      const { result } = renderHook(() => useAuthSession());

      await waitFor(() => expect(result.current.isReady).toBe(true));

      expect(result.current.needsUsernameSetup).toBe(false);
    });
  });

  describe('エラーケース', () => {
    it('ネットワークエラー時は error にセットされる', async () => {
      mockGetSession.mockRejectedValueOnce(new Error('network error'));

      const { result } = renderHook(() => useAuthSession());

      await waitFor(() => expect(result.current.isReady).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('network error');
      expect(result.current.userId).toBeNull();
    });

    it('匿名サインイン失敗時は error にセットされる', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });
      mockSignInAnonymously.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Anonymous sign-in failed' },
      });

      const { result } = renderHook(() => useAuthSession());

      await waitFor(() => expect(result.current.isReady).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.userId).toBeNull();
    });
  });
});
