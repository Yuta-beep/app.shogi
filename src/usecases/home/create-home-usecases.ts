import { isApiDataSource } from '@/lib/config/data-source';
import { ApiLoadHomeSnapshotUseCase } from '@/usecases/home/api-home-usecases';
import { LoadHomeSnapshotUseCase } from '@/usecases/home/load-home-snapshot-usecase';
import { MockLoadHomeSnapshotUseCase } from '@/usecases/home/mock-home-usecases';

export function createLoadHomeSnapshotUseCase(): LoadHomeSnapshotUseCase {
  return isApiDataSource() ? new ApiLoadHomeSnapshotUseCase() : new MockLoadHomeSnapshotUseCase();
}
