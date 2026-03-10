import { setupUsername } from '../setup-username-usecase';

const mockUpdateDisplayName = jest.fn();

jest.mock('@/infra/datasources/player-supabase-datasource', () => ({
  PlayerSupabaseDataSource: jest.fn().mockImplementation(() => ({
    updateDisplayName: (...args: unknown[]) => mockUpdateDisplayName(...args),
  })),
}));

describe('setupUsername', () => {
  const userId = 'user-uuid-abc';

  it('有効なユーザーネームをupdateDisplayNameに渡す', async () => {
    mockUpdateDisplayName.mockResolvedValueOnce(undefined);

    await setupUsername(userId, '将棋太郎');

    expect(mockUpdateDisplayName).toHaveBeenCalledWith(userId, '将棋太郎');
  });

  it('前後の空白をtrimして渡す', async () => {
    mockUpdateDisplayName.mockResolvedValueOnce(undefined);

    await setupUsername(userId, '  スペース付き  ');

    expect(mockUpdateDisplayName).toHaveBeenCalledWith(userId, 'スペース付き');
  });

  it('空文字はバリデーションエラーをthrowする', async () => {
    await expect(setupUsername(userId, '')).rejects.toThrow('ユーザーネームを入力してください');
    expect(mockUpdateDisplayName).not.toHaveBeenCalled();
  });

  it('空白のみはバリデーションエラーをthrowする', async () => {
    await expect(setupUsername(userId, '   ')).rejects.toThrow('ユーザーネームを入力してください');
    expect(mockUpdateDisplayName).not.toHaveBeenCalled();
  });

  it('datasourceがエラーをthrowした場合はそのままthrowする', async () => {
    const supabaseError = { message: 'update failed', code: '42501' };
    mockUpdateDisplayName.mockRejectedValueOnce(supabaseError);

    await expect(setupUsername(userId, '名前')).rejects.toEqual(supabaseError);
  });
});
