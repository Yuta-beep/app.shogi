import type { GachaLobbySnapshot } from '@/domain/models/gacha';

export type {
  GachaBanner,
  GachaLineupEntry,
  GachaLobbySnapshot,
} from '@/domain/models/gacha';

export interface LoadGachaLobbyUseCase {
  execute(): Promise<GachaLobbySnapshot>;
}
