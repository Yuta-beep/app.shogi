import {
  normalizePvpRating,
  PVP_RATING_INITIAL,
} from '@/lib/online-match/pvp-rating-constants';

describe('pvp-rating-constants', () => {
  it('normalizes invalid values to 0', () => {
    expect(normalizePvpRating('abc')).toBe(PVP_RATING_INITIAL);
    expect(normalizePvpRating(-10)).toBe(0);
    expect(normalizePvpRating(12.9)).toBe(12);
  });
});
