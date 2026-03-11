import { setupUsername } from '../setup-username-usecase';

const mockUpdateDisplayName = jest.fn();

jest.mock('@/infra/datasources/player-api-datasource', () => ({
  PlayerApiDataSource: jest.fn().mockImplementation(() => ({
    updateDisplayName: (...args: unknown[]) => mockUpdateDisplayName(...args),
  })),
}));

describe('setupUsername', () => {
  const token = 'token-abc';

  it('有効なユーザーネームをupdateDisplayNameに渡す', async () => {
    mockUpdateDisplayName.mockResolvedValueOnce(undefined);

    await setupUsername(token, '将棋太郎');

    expect(mockUpdateDisplayName).toHaveBeenCalledWith(token, '将棋太郎');
  });

  it('前後の空白をtrimして渡す', async () => {
    mockUpdateDisplayName.mockResolvedValueOnce(undefined);

    await setupUsername(token, '  スペース付き  ');

    expect(mockUpdateDisplayName).toHaveBeenCalledWith(token, 'スペース付き');
  });

  it('空文字はバリデーションエラーをthrowする', async () => {
    await expect(setupUsername(token, '')).rejects.toThrow('ユーザーネームを入力してください');
    expect(mockUpdateDisplayName).not.toHaveBeenCalled();
  });

  it('空白のみはバリデーションエラーをthrowする', async () => {
    await expect(setupUsername(token, '   ')).rejects.toThrow('ユーザーネームを入力してください');
    expect(mockUpdateDisplayName).not.toHaveBeenCalled();
  });

  it('datasourceがエラーをthrowした場合はそのままthrowする', async () => {
    const supabaseError = { message: 'update failed', code: '42501' };
    mockUpdateDisplayName.mockRejectedValueOnce(supabaseError);

    await expect(setupUsername(token, '名前')).rejects.toEqual(supabaseError);
  });
});
