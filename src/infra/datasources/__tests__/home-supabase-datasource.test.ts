import { HomeSupabaseDataSource } from '../home-supabase-datasource';

const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
const mockGetSession = jest.fn();

jest.mock('@/lib/supabase/supabase-client', () => ({
  supabase: {
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockSession = {
  user: { id: 'user-uuid-123' },
  access_token: 'token',
};

describe('HomeSupabaseDataSource', () => {
  const ds = new HomeSupabaseDataSource();

  describe('getSnapshot', () => {
    it('playersテーブルからHomeSnapshotを返す', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: mockSession }, error: null });
      mockSingle.mockResolvedValueOnce({
        data: {
          display_name: 'テストプレイヤー',
          rating: 1600,
          pawn_currency: 100,
          gold_currency: 5,
        },
        error: null,
      });

      const result = await ds.getSnapshot();

      expect(mockFrom).toHaveBeenCalledWith('players');
      expect(mockSelect).toHaveBeenCalledWith('display_name, rating, pawn_currency, gold_currency');
      expect(mockEq).toHaveBeenCalledWith('id', 'user-uuid-123');
      expect(result).toEqual({
        playerName: 'テストプレイヤー',
        rating: 1600,
        pawnCurrency: 100,
        goldCurrency: 5,
      });
    });

    it('セッションがない場合はthrowする', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      await expect(ds.getSnapshot()).rejects.toThrow('No active session');
    });

    it('セッション取得エラーの場合はthrowする', async () => {
      const sessionError = new Error('network error');
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: sessionError });

      await expect(ds.getSnapshot()).rejects.toEqual(sessionError);
    });

    it('Supabaseクエリエラーの場合はthrowする', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: mockSession }, error: null });
      const queryError = { message: 'query failed', code: 'PGRST116' };
      mockSingle.mockResolvedValueOnce({ data: null, error: queryError });

      await expect(ds.getSnapshot()).rejects.toEqual(queryError);
    });
  });
});
