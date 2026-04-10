import { PlayerApiDataSource } from '../player-api-datasource';

const mockGetJson: jest.Mock = jest.fn();
const mockPutJson: jest.Mock = jest.fn();

jest.mock('@/infra/http/api-client', () => {
  const actual =
    jest.requireActual<typeof import('@/infra/http/api-client')>('@/infra/http/api-client');
  return {
    ...actual,
    getJson: (...args: unknown[]) => mockGetJson(...args),
    putJson: (...args: unknown[]) => mockPutJson(...args),
  };
});

const { ApiClientError } =
  jest.requireActual<typeof import('@/infra/http/api-client')>('@/infra/http/api-client');

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

    it('falls back to /api/v1/me/snapshot when display-name returns HTML 404', async () => {
      mockGetJson
        .mockRejectedValueOnce(
          new ApiClientError(
            {
              code: 'INVALID_JSON_RESPONSE',
              message: 'Expected JSON but received HTML (status: 404)',
            },
            404,
          ),
        )
        .mockResolvedValueOnce({ playerName: '  スナップショット名  ' });

      const result = await ds.getDisplayName(token);

      expect(mockGetJson).toHaveBeenNthCalledWith(1, '/api/v1/me/display-name', { token });
      expect(mockGetJson).toHaveBeenNthCalledWith(2, '/api/v1/me/snapshot', { token });
      expect(result).toBe('スナップショット名');
    });

    it('returns null when fallback snapshot has empty playerName', async () => {
      mockGetJson
        .mockRejectedValueOnce(
          new ApiClientError({ code: 'INVALID_JSON_RESPONSE', message: 'HTML 404' }, 404),
        )
        .mockResolvedValueOnce({ playerName: '   ' });

      const result = await ds.getDisplayName(token);
      expect(result).toBeNull();
    });

    it('returns null when fallback snapshot is PLAYER_NOT_FOUND', async () => {
      mockGetJson
        .mockRejectedValueOnce(
          new ApiClientError({ code: 'INVALID_JSON_RESPONSE', message: 'HTML 404' }, 404),
        )
        .mockRejectedValueOnce(
          new ApiClientError({ code: 'PLAYER_NOT_FOUND', message: 'not found' }, 404),
        );

      const result = await ds.getDisplayName(token);
      expect(result).toBeNull();
    });

    it('rethrows non-404 display-name errors', async () => {
      mockGetJson.mockRejectedValueOnce(
        new ApiClientError({ code: 'UNAUTHORIZED', message: 'no' }, 401),
      );

      await expect(ds.getDisplayName(token)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
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
