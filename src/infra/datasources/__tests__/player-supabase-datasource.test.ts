import { PlayerSupabaseDataSource } from '../player-supabase-datasource';

const mockSingle: jest.Mock = jest.fn();
const mockUpdateEq: jest.Mock = jest.fn();
const mockSelectEq: jest.Mock = jest.fn(() => ({ single: mockSingle }));
const mockUpdate: jest.Mock = jest.fn(() => ({ eq: mockUpdateEq }));
const mockSelect: jest.Mock = jest.fn(() => ({ eq: mockSelectEq }));
const mockFrom: jest.Mock = jest.fn(() => ({ select: mockSelect, update: mockUpdate }));

jest.mock('@/lib/supabase/supabase-client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

describe('PlayerSupabaseDataSource', () => {
  const ds = new PlayerSupabaseDataSource();
  const userId = 'user-uuid-123';

  describe('getDisplayName', () => {
    it('display_nameがある場合はその値を返す', async () => {
      mockSingle.mockResolvedValueOnce({ data: { display_name: 'テストユーザー' }, error: null });

      const result = await ds.getDisplayName(userId);

      expect(mockFrom).toHaveBeenCalledWith('players');
      expect(mockSelect).toHaveBeenCalledWith('display_name');
      expect(mockSelectEq).toHaveBeenCalledWith('id', userId);
      expect(result).toBe('テストユーザー');
    });

    it('display_nameがnullの場合はnullを返す', async () => {
      mockSingle.mockResolvedValueOnce({ data: { display_name: null }, error: null });

      const result = await ds.getDisplayName(userId);

      expect(result).toBeNull();
    });

    it('Supabaseエラーが発生した場合はthrowする', async () => {
      const supabaseError = { message: 'not found', code: 'PGRST116' };
      mockSingle.mockResolvedValueOnce({ data: null, error: supabaseError });

      await expect(ds.getDisplayName(userId)).rejects.toEqual(supabaseError);
    });
  });

  describe('updateDisplayName', () => {
    it('display_nameをupdateする', async () => {
      mockUpdateEq.mockResolvedValueOnce({ error: null });

      await ds.updateDisplayName(userId, '新しい名前');

      expect(mockFrom).toHaveBeenCalledWith('players');
      expect(mockUpdate).toHaveBeenCalledWith({ display_name: '新しい名前' });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', userId);
    });

    it('Supabaseエラーが発生した場合はthrowする', async () => {
      const supabaseError = { message: 'update failed', code: '42501' };
      mockUpdateEq.mockResolvedValueOnce({ error: supabaseError });

      await expect(ds.updateDisplayName(userId, '名前')).rejects.toEqual(supabaseError);
    });
  });
});
