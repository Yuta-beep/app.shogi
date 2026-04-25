import { normalizeBattleMove, normalizePieceCode, toBasePieceCode } from '@/ai/model/move';

describe('ai model move', () => {
  it('normalizes piece codes to uppercase', () => {
    expect(normalizePieceCode('fu')).toBe('FU');
    expect(normalizePieceCode(null)).toBeNull();
  });

  it('maps promoted codes to base piece codes', () => {
    expect(toBasePieceCode('to')).toBe('FU');
    expect(toBasePieceCode('ry')).toBe('HI');
    expect(toBasePieceCode('ryu')).toBe('HI');
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
});
