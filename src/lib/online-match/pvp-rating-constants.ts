export const PVP_RATING_INITIAL = 0;
export const PVP_RATING_WIN_DELTA = 50;
export const PVP_RATING_LOSS_DELTA = 30;

export function normalizePvpRating(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return PVP_RATING_INITIAL;
  return Math.max(0, Math.floor(n));
}
