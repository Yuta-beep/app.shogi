import { saveCurrentBattleSetupId } from '@/lib/online-match/current-battle-setup';
import type { SaveOnlineMatchSetupUseCase } from '@/usecases/online-match/save-online-match-setup-usecase';

export class MockSaveOnlineMatchSetupUseCase implements SaveOnlineMatchSetupUseCase {
  async execute() {
    const battleSetupId = `mock_bsetup_${Math.random().toString(36).slice(2, 8)}`;
    await saveCurrentBattleSetupId(battleSetupId);
    return {
      battleSetupId,
      status: 'validated' as const,
    };
  }
}
