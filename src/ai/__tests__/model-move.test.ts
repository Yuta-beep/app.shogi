import { normalizeBattleMove, normalizePieceCode, toBasePieceCode } from '@/ai/model/move';

describe('ai model move', () => {
  it('normalizes piece codes to uppercase', () => {
    expect(normalizePieceCode('fu')).toBe('FU');
    expect(normalizePieceCode(null)).toBeNull();
  });

  it('maps promoted codes to base piece codes', () => {
    expect(toBasePieceCode('to')).toBe('FU');
    expect(toBasePieceCode('ry')).toBe('HI');
    expect(toBasePieceCode('ryu')).toBe('RYU');
  });

  it('strips PIECE_SHOGI_ / PIECE_ prefixes for base piece code', () => {
    expect(toBasePieceCode('PIECE_SHOGI_HOS')).toBe('HOS');
    expect(toBasePieceCode('piece_shogi_hos')).toBe('HOS');
    expect(toBasePieceCode('PIECE_MAK')).toBe('MAK');
  });

  it('preserves opaque DB piece instance ids (hex after PIECE_) for SFEN/catalog keys', () => {
    expect(toBasePieceCode('PIECE_D4B4C9E252E1')).toBe('PIECE_D4B4C9E252E1');
    expect(toBasePieceCode('piece_bc786fd783f2')).toBe('PIECE_BC786FD783F2');
  });

  it('normalizes a battle move payload', () => {
    const move = normalizeBattleMove({
      fromRow: 7,
      fromCol: 4,
      toRow: 6,
      toCol: 4,
      pieceCode: 'fu',
      promote: false,
      dropPieceCode: null,
      capturedPieceCode: 'ki',
      notation: null,
    });

    expect(move.pieceCode).toBe('FU');
    expect(move.capturedPieceCode).toBe('KI');
  });

  it('normalizes battle move captured code with PIECE_SHOGI_ prefix', () => {
    const move = normalizeBattleMove({
      fromRow: 3,
      fromCol: 4,
      toRow: 4,
      toCol: 4,
      pieceCode: 'OU',
      promote: false,
      dropPieceCode: null,
      capturedPieceCode: 'PIECE_SHOGI_HOS',
      notation: null,
    });
    expect(move.capturedPieceCode).toBe('HOS');
  });
});
