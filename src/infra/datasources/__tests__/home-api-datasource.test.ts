import { HomeApiDataSource } from '../home-api-datasource';

const mockGetSession: jest.Mock = jest.fn();
const mockGetJson: jest.Mock = jest.fn();

jest.mock('@/lib/supabase/supabase-client', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
  },
}));

jest.mock('@/infra/http/api-client', () => ({
  getJson: (...args: unknown[]) => mockGetJson(...args),
}));

describe('HomeApiDataSource', () => {
  const ds = new HomeApiDataSource();

  it('calls BFF /api/v1/me/snapshot with bearer token', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'token-123' } },
      error: null,
    });
    mockGetJson.mockResolvedValueOnce({
      playerName: '将棋太郎',
      rating: 1500,
      pawnCurrency: 0,
      goldCurrency: 0,
      playerRank: 1,
      playerExp: 0,
    });

    const result = await ds.getSnapshot();

    expect(mockGetJson).toHaveBeenCalledWith('/api/v1/me/snapshot', { token: 'token-123' });
    expect(result.playerRank).toBe(1);
    expect(result.playerExp).toBe(0);
  });

  it('throws when no active session exists', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(ds.getSnapshot()).rejects.toThrow('No active session');
  });
});
