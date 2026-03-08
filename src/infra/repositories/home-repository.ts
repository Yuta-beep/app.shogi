import { HomeRepository } from '@/domain/repositories/home-repository';
import { HomeApiDataSource } from '@/infra/datasources/home-api-datasource';
import { HomeSnapshot } from '@/usecases/home/load-home-snapshot-usecase';

export class ApiHomeRepository implements HomeRepository {
  constructor(private readonly dataSource = new HomeApiDataSource()) {}

  async loadSnapshot(): Promise<HomeSnapshot> {
    return this.dataSource.getSnapshot();
  }
}
