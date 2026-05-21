import { formatMatchingSquare, parseMatchingSquare } from '@/lib/matching-server/square';

describe('matching-server square', () => {
  it('round-trips row/col through USI square', () => {
    const coord = parseMatchingSquare('7g');
    expect(coord).toEqual({ row: 6, col: 2 });
    expect(formatMatchingSquare(coord.row, coord.col)).toBe('7g');
  });
});
