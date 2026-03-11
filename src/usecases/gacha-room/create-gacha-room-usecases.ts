import { isApiDataSource } from '@/lib/config/data-source';
import {
  ApiLoadGachaLobbyUseCase,
  ApiRollGachaUseCase,
} from '@/usecases/gacha-room/api-gacha-room-usecases';
import {
  LoadGachaLobbyUseCase,
  GachaLobbySnapshot,
} from '@/usecases/gacha-room/load-gacha-lobby-usecase';
import {
  MockLoadGachaLobbyUseCase,
  MockRollGachaUseCase,
} from '@/usecases/gacha-room/mock-gacha-room-usecases';
import {
  RollGachaInput,
  RollGachaResult,
  RollGachaUseCase,
} from '@/usecases/gacha-room/roll-gacha-usecase';

export function createLoadGachaLobbyUseCase(): LoadGachaLobbyUseCase {
  return isApiDataSource() ? new ApiLoadGachaLobbyUseCase() : new MockLoadGachaLobbyUseCase();
}

export function createRollGachaUseCase(): RollGachaUseCase {
  return isApiDataSource() ? new ApiRollGachaUseCase() : new MockRollGachaUseCase();
}

export type { GachaLobbySnapshot, RollGachaInput, RollGachaResult };
