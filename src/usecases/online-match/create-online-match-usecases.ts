import { isApiDataSource } from '@/lib/config/data-source';
import { ApiSaveOnlineMatchSetupUseCase } from '@/usecases/online-match/api-online-match-usecases';
import { MockSaveOnlineMatchSetupUseCase } from '@/usecases/online-match/mock-online-match-usecases';
import type { SaveOnlineMatchSetupUseCase } from '@/usecases/online-match/save-online-match-setup-usecase';

export function createSaveOnlineMatchSetupUseCase(token?: string): SaveOnlineMatchSetupUseCase {
  return isApiDataSource() && token
    ? new ApiSaveOnlineMatchSetupUseCase(token)
    : new MockSaveOnlineMatchSetupUseCase();
}
