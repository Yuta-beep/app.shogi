import { PlayerSupabaseDataSource } from '../player-supabase-datasource';

const mockMaybeSingle: jest.Mock = jest.fn();
const mockSingle: jest.Mock = jest.fn();
const mockUpsertSelect: jest.Mock = jest.fn(() => ({ single: mockSingle }));
const mockUpsert: jest.Mock = jest.fn(() => ({ select: mockUpsertSelect }));
const mockSelectEq: jest.Mock = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect: jest.Mock = jest.fn(() => ({ eq: mockSelectEq }));
const mockFrom: jest.Mock = jest.fn(() => ({ select: mockSelect, upsert: mockUpsert }));

jest.mock('@/lib/supabase/supabase-client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

describe('PlayerSupabaseDataSource', () => {
  const ds = new PlayerSupabaseDataSource();
  const userId = 'user-uuid-123';

  describe('getDisplayName', () => {
    it('display_nameがある場合はその値を返す', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { display_name: 'テストユーザー' }, error: null });

      const result = await ds.getDisplayName(userId);

      expect(mockFrom).toHaveBeenCalledWith('players');
      expect(mockSelect).toHaveBeenCalledWith('display_name');
      expect(mockSelectEq).toHaveBeenCalledWith('id', userId);
      expect(result).toBe('テストユーザー');
    });

    it('display_nameがnullの場合はnullを返す', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { display_name: null }, error: null });

      const result = await ds.getDisplayName(userId);

      expect(result).toBeNull();
    });

    it('Supabaseエラーが発生した場合はthrowする', async () => {
      const supabaseError = { message: 'not found', code: 'PGRST116' };
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: supabaseError });

      await expect(ds.getDisplayName(userId)).rejects.toThrow('not found');
    });
  });

  describe('updateDisplayName', () => {
    it('display_nameをupdateする', async () => {
      mockSingle.mockResolvedValueOnce({ error: null });

      await ds.updateDisplayName(userId, '新しい名前');

      expect(mockFrom).toHaveBeenCalledWith('players');
      expect(mockUpsert).toHaveBeenCalledWith(
        { id: userId, display_name: '新しい名前' },
        { onConflict: 'id' }
      );
      expect(mockUpsertSelect).toHaveBeenCalledWith('id');
    });

    it('Supabaseエラーが発生した場合はthrowする', async () => {
      const supabaseError = { message: 'update failed', code: '42501' };
      mockSingle.mockResolvedValueOnce({ error: supabaseError });

      await expect(ds.updateDisplayName(userId, '名前')).rejects.toThrow('update failed');
    });
  });
});
