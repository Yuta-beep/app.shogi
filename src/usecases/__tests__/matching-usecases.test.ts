import { MockCancelMatchingUseCase, MockStartMatchingUseCase } from '@/usecases/matching/mock-matching-usecases';

describe('matching usecases', () => {
  it('returns initial matching snapshot', async () => {
    const usecase = new MockStartMatchingUseCase();

    await expect(usecase.execute()).resolves.toEqual({
      title: 'オンライン対戦',
      status: '対戦相手を探しています',
      progress: 62,
    });
  });

  it('cancel completes without throwing', async () => {
    const usecase = new MockCancelMatchingUseCase();

    await expect(usecase.execute()).resolves.toBeUndefined();
  });
});
