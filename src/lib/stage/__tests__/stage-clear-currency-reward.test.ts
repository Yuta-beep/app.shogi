import { computeStageClearCurrencyGrant } from '@/lib/stage/stage-clear-currency-reward';

describe('stage-clear-currency-reward (app)', () => {
  it('matches BFF formula', () => {
    expect(computeStageClearCurrencyGrant(3, true)).toEqual({ pawn: 20, gold: 1 });
    expect(computeStageClearCurrencyGrant(7, false)).toEqual({ pawn: 3, gold: 0 });
  });
});
