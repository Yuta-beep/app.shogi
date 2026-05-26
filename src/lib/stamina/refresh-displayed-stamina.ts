import { isApiDataSource } from '@/lib/config/data-source';
import {
  getHomeSnapshotState,
  loadHomeSnapshot,
  patchHomeSnapshotStamina,
} from '@/hooks/common/home-snapshot-store';
import { getMockStaminaDisplay } from '@/lib/stamina/spend-stage-stamina';

/** 回復時刻を過ぎたら HUD のスタミナ表示を更新する */
export function refreshDisplayedStaminaRecovery(): void {
  const { snapshot } = getHomeSnapshotState();
  if (snapshot.stamina >= snapshot.maxStamina) return;
  if (!snapshot.nextRecoveryAt) return;
  if (new Date(snapshot.nextRecoveryAt).getTime() > Date.now()) return;

  if (isApiDataSource()) {
    void loadHomeSnapshot(true);
    return;
  }

  const { stamina, nextRecoveryAt } = getMockStaminaDisplay();
  patchHomeSnapshotStamina({ stamina, nextRecoveryAt });
}
