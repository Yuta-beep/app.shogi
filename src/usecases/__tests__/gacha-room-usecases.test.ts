import { MockLoadGachaLobbyUseCase, MockRollGachaUseCase } from '@/usecases/gacha-room/mock-gacha-room-usecases';

describe('gacha room usecases', () => {
  it('loads gacha banners, wallet, and history', async () => {
    const usecase = new MockLoadGachaLobbyUseCase();
    const snapshot = await usecase.execute();

    expect(snapshot.banners).toHaveLength(4);
    expect(snapshot.pawnCurrency).toBe(3000);
    expect(snapshot.goldCurrency).toBe(20);
    expect(snapshot.history).toEqual([]);
  });

  it('returns a deterministic roll result for miss path', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const usecase = new MockRollGachaUseCase();
    const result = await usecase.execute({ gachaId: 'ukanmuri' });

    expect(result).toEqual({
      type: 'miss',
      currency: 'pawn',
      amount: 5,
    });
    randomSpy.mockRestore();
  });
});
