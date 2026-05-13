import { ZodError } from 'zod';
import { PieceApiDataSource } from '../piece-api-datasource';

const mockGetJson: jest.Mock = jest.fn();

jest.mock('@/infra/http/api-client', () => ({
  getJson: (...args: unknown[]) => mockGetJson(...args),
}));

describe('PieceApiDataSource', () => {
  const ds = new PieceApiDataSource();

  it('returns parsed piece catalog response', async () => {
    mockGetJson.mockResolvedValueOnce({
      items: [
        {
          pieceId: 1,
          pieceCode: 'FU',
          sfenCode: 'P',
          canonicalCode: 'FU',
          isPromoted: false,
          moveCode: 'pawn',
          char: '歩',
          name: '歩兵',
          imageSignedUrl: null,
          quantity: 1,
          unlock: 'initial',
          desc: 'forward one step',
          skill: '',
          move: 'forward',
          moveVectors: [{ dx: 0, dy: -1, maxStep: 1 }],
          isRepeatable: false,
          canJump: false,
          moveConstraints: null,
          moveRules: [],
        },
      ],
    });

    const result = await ds.getCatalog();

    expect(mockGetJson).toHaveBeenCalledWith('/api/v1/pieces/catalog');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.pieceCode).toBe('FU');
  });

  it('throws ZodError when piece catalog response is invalid', async () => {
    mockGetJson.mockResolvedValueOnce({
      items: [
        {
          pieceId: 1,
          char: '歩',
          name: '歩兵',
          unlock: 'initial',
          desc: 'forward one step',
          skill: '',
          move: 'forward',
          moveVectors: 'invalid',
          isRepeatable: false,
        },
      ],
    });

    await expect(ds.getCatalog()).rejects.toBeInstanceOf(ZodError);
  });
});
