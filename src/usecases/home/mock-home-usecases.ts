import { homeMock } from '@/constants/home-mock';
import { HomeSnapshot, LoadHomeSnapshotUseCase } from '@/usecases/home/load-home-snapshot-usecase';

export class MockLoadHomeSnapshotUseCase implements LoadHomeSnapshotUseCase {
  async execute(): Promise<HomeSnapshot> {
    return {
      playerName: homeMock.playerName,
      rating: homeMock.rating,
      pawnCurrency: homeMock.pawnCurrency,
      goldCurrency: homeMock.goldCurrency,
      playerRank: homeMock.playerRank,
      playerExp: homeMock.playerExp,
      stamina: homeMock.stamina,
      maxStamina: homeMock.maxStamina,
    };
  }
}
