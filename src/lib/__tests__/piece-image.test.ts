import { resolvePieceImageSource } from '@/lib/piece-image';

describe('resolvePieceImageSource', () => {
  it('resolves shop piece 走 from assets/pieces via char', () => {
    expect(resolvePieceImageSource({ char: '走', pieceId: 99999 })).toBe(
      require('../../assets/pieces/走.png'),
    );
  });

  it('resolves shop piece 走 from assets/pieces via piece_code', () => {
    expect(resolvePieceImageSource({ pieceCode: 'piece_shop_so' })).toBe(
      require('../../assets/pieces/走.png'),
    );
  });

  it('resolves shop piece 種 via canonical code', () => {
    expect(resolvePieceImageSource({ pieceCode: 'TANE' })).toBe(
      require('../../assets/pieces/種.png'),
    );
  });
});
