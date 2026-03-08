import { HomeSnapshot } from '@/usecases/home/load-home-snapshot-usecase';

export interface HomeRepository {
  loadSnapshot(): Promise<HomeSnapshot>;
}
