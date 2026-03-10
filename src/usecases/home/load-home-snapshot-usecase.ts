import type { HomeSnapshot } from '@/domain/models/home';

export type { HomeSnapshot } from '@/domain/models/home';

export interface LoadHomeSnapshotUseCase {
  execute(): Promise<HomeSnapshot>;
}
