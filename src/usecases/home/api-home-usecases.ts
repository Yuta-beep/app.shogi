import { HomeRepository } from '@/domain/repositories/home-repository';
import { ApiHomeRepository } from '@/infra/repositories/home-repository';
import { HomeSnapshot, LoadHomeSnapshotUseCase } from '@/usecases/home/load-home-snapshot-usecase';

export class ApiLoadHomeSnapshotUseCase implements LoadHomeSnapshotUseCase {
  constructor(private readonly repository: HomeRepository = new ApiHomeRepository()) {}

  async execute(): Promise<HomeSnapshot> {
    return this.repository.loadSnapshot();
  }
}
