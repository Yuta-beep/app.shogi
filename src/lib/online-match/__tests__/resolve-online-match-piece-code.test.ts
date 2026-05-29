import { resolveOnlineMatchPieceCode } from '@/lib/online-match/resolve-online-match-piece-code';

describe('resolveOnlineMatchPieceCode', () => {
  it('maps gacha char 膠 to BFF piece code', () => {
    expect(resolveOnlineMatchPieceCode('膠')).toBe('PIECE_GACHA_KOU');
  });

  it('maps standard char 歩 to FU', () => {
    expect(resolveOnlineMatchPieceCode('歩')).toBe('FU');
  });
});
