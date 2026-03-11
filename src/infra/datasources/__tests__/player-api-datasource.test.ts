import { PlayerApiDataSource } from '../player-api-datasource';

const mockGetJson: jest.Mock = jest.fn();
const mockPutJson: jest.Mock = jest.fn();

jest.mock('@/infra/http/api-client', () => ({
  getJson: (...args: unknown[]) => mockGetJson(...args),
  putJson: (...args: unknown[]) => mockPutJson(...args),
}));

describe('PlayerApiDataSource', () => {
  const ds = new PlayerApiDataSource();
  const token = 'token-123';

  describe('getDisplayName', () => {
    it('calls /api/v1/me/display-name and returns displayName', async () => {
      mockGetJson.mockResolvedValueOnce({ displayName: 'テストユーザー' });

      const result = await ds.getDisplayName(token);

      expect(mockGetJson).toHaveBeenCalledWith('/api/v1/me/display-name', { token });
      expect(result).toBe('テストユーザー');
    });

    it('returns null when displayName is null', async () => {
      mockGetJson.mockResolvedValueOnce({ displayName: null });
      const result = await ds.getDisplayName(token);
      expect(result).toBeNull();
    });
  });

  describe('updateDisplayName', () => {
    it('calls PUT /api/v1/me/display-name', async () => {
      mockPutJson.mockResolvedValueOnce({ displayName: '新しい名前' });

      await ds.updateDisplayName(token, '新しい名前');

      expect(mockPutJson).toHaveBeenCalledWith(
        '/api/v1/me/display-name',
        { displayName: '新しい名前' },
        { token },
      );
    });
  });
});
