import { HomeRepository } from '@/domain/repositories/home-repository';
import type { HomeSnapshot } from '@/domain/models/home';
import { HomeApiDataSource } from '@/infra/datasources/home-api-datasource';

export class ApiHomeRepository implements HomeRepository {
  constructor(private readonly dataSource = new HomeApiDataSource()) {}

  async loadSnapshot(): Promise<HomeSnapshot> {
    return this.dataSource.getSnapshot();
  }
}
