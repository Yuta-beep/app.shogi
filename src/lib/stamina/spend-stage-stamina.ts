import type { HomeSnapshot } from '@/domain/models/home';
import { ApiClientError } from '@/infra/http/api-client';
import { getHomeSnapshotState, patchHomeSnapshotStamina } from '@/hooks/common/home-snapshot-store';
import { isApiDataSource } from '@/lib/config/data-source';
import {
  calculateStaminaWithRecovery,
  NORMAL_STAGE_STAMINA_COST,
  STAMINA_RECOVERY_MS,
} from '@/lib/stamina/stamina-rules';

let mockStaminaUpdatedAtMs = Date.now();
let mockStaminaStored = 50;

/** BFF 未反映のクライアント側スタミナ消費（ステージ1の stamina_cost=0 など） */
let pendingClientOnlyStaminaDeduction = 0;
let staminaBaselineWhenPendingSet: number | null = null;

export function resetMockStaminaState(stamina = 50): void {
  mockStaminaStored = stamina;
  mockStaminaUpdatedAtMs = Date.now();
  resetPendingClientStaminaDeduction();
}

export function resetPendingClientStaminaDeduction(): void {
  pendingClientOnlyStaminaDeduction = 0;
  staminaBaselineWhenPendingSet = null;
}

/**
 * ホーム API のスタミナをマージする。
 * サーバーがまだ減算を反映していない間は、クライアントで差し引いた分を維持する。
 */
export function mergeServerHomeStamina(server: HomeSnapshot): HomeSnapshot {
  if (pendingClientOnlyStaminaDeduction <= 0) return server;

  if (staminaBaselineWhenPendingSet != null && server.stamina < staminaBaselineWhenPendingSet) {
    resetPendingClientStaminaDeduction();
    return server;
  }

  return {
    ...server,
    stamina: Math.max(0, server.stamina - pendingClientOnlyStaminaDeduction),
  };
}

function recordPendingClientStaminaDeduction(amount: number, baseline: number): void {
  if (amount <= 0) return;
  pendingClientOnlyStaminaDeduction += amount;
  staminaBaselineWhenPendingSet = baseline;
}

function spendStaminaOnHomeSnapshot(cost: number): SpendStageStaminaResult {
  const { snapshot } = getHomeSnapshotState();
  const stamina = snapshot.stamina;
  if (stamina < cost) {
    return { ok: false, current: stamina, required: cost };
  }

  const newStamina = stamina - cost;
  const nextRecoveryAt =
    newStamina < snapshot.maxStamina
      ? (snapshot.nextRecoveryAt ?? new Date(Date.now() + STAMINA_RECOVERY_MS).toISOString())
      : null;

  patchHomeSnapshotStamina({ stamina: newStamina, nextRecoveryAt });
  return { ok: true, stamina: newStamina, nextRecoveryAt };
}

/** モック用: ホーム読み込み時にスタミナ基準時刻をリセットしないよう内部状態を同期 */
export function syncMockStaminaFromSnapshot(stamina: number, maxStamina: number): void {
  // ホーム再読み込みで消費済みスタミナが巻き戻らないよう、同期値は下げる方向のみ
  mockStaminaStored = Math.min(mockStaminaStored, stamina);
  if (stamina >= maxStamina) {
    mockStaminaStored = maxStamina;
    mockStaminaUpdatedAtMs = Date.now();
    return;
  }
  const { stamina: recovered } = calculateStaminaWithRecovery({
    stored: mockStaminaStored,
    max: maxStamina,
    updatedAtMs: mockStaminaUpdatedAtMs,
  });
  mockStaminaStored = Math.min(recovered, stamina);
}

export function getMockStaminaDisplay(): {
  stamina: number;
  maxStamina: number;
  nextRecoveryAt: string | null;
} {
  return currentMockStamina();
}

function currentMockStamina(): {
  stamina: number;
  maxStamina: number;
  nextRecoveryAt: string | null;
} {
  const max = getHomeSnapshotState().snapshot.maxStamina;
  const { stamina, nextRecoveryAt } = calculateStaminaWithRecovery({
    stored: mockStaminaStored,
    max,
    updatedAtMs: mockStaminaUpdatedAtMs,
  });
  return { stamina, maxStamina: max, nextRecoveryAt };
}

export type SpendStageStaminaResult =
  | { ok: true; stamina: number; nextRecoveryAt: string | null }
  | { ok: false; current: number; required: number };

export function trySpendNormalStageStamina(): SpendStageStaminaResult {
  const cost = NORMAL_STAGE_STAMINA_COST;
  const { stamina, maxStamina } = currentMockStamina();
  if (stamina < cost) {
    return { ok: false, current: stamina, required: cost };
  }

  const newStamina = stamina - cost;
  const elapsed = Date.now() - mockStaminaUpdatedAtMs;
  const ticksPassed = Math.floor(elapsed / STAMINA_RECOVERY_MS);
  mockStaminaStored = newStamina;
  mockStaminaUpdatedAtMs = Date.now() - (elapsed - ticksPassed * STAMINA_RECOVERY_MS);

  const next =
    newStamina < maxStamina
      ? new Date(mockStaminaUpdatedAtMs + STAMINA_RECOVERY_MS).toISOString()
      : null;

  patchHomeSnapshotStamina({ stamina: newStamina, nextRecoveryAt: next });
  return { ok: true, stamina: newStamina, nextRecoveryAt: next };
}

export function throwIfInsufficientStageStamina(result: SpendStageStaminaResult): void {
  if (result.ok) return;
  throw new ApiClientError(
    {
      code: 'INSUFFICIENT_STAMINA',
      message: `スタミナが足りません（${result.current}/${result.required}）`,
    },
    422,
  );
}

/**
 * API 開始後: BFF が `stamina_cost` 未設定（ステージ1など）で減らなかった分をクライアントで補う。
 * 既に NORMAL_STAGE_STAMINA_COST 以上減っていれば何もしない（二重消費防止）。
 */
export function ensureNormalStageStaminaCharged(staminaBeforeBattleStart: number): void {
  if (!isApiDataSource()) return;

  const current = getHomeSnapshotState().snapshot.stamina;
  const deducted = staminaBeforeBattleStart - current;
  const need = NORMAL_STAGE_STAMINA_COST - deducted;
  if (need <= 0) return;

  const spend = spendStaminaOnHomeSnapshot(need);
  throwIfInsufficientStageStamina(spend);
  recordPendingClientStaminaDeduction(need, staminaBeforeBattleStart);
}
