import type { HomeSnapshot } from '@/domain/models/home';

export interface HomeRepository {
  loadSnapshot(): Promise<HomeSnapshot>;
}
