import { homeMock } from '@/constants/home-mock';
import { MockLoadHomeSnapshotUseCase } from '@/usecases/home/mock-home-usecases';

describe('MockLoadHomeSnapshotUseCase', () => {
  it('returns the expected home snapshot', async () => {
    const usecase = new MockLoadHomeSnapshotUseCase();

    await expect(usecase.execute()).resolves.toEqual({
      playerName: homeMock.playerName,
      rating: homeMock.rating,
      pawnCurrency: homeMock.pawnCurrency,
      goldCurrency: homeMock.goldCurrency,
    });
  });
});
