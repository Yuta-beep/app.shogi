/** 着手後スキルで盤面に出すビジュアルエフェクト（エンジン → UI） */
export type SkillVisualEffect = {
  kind: 'flame_burn';
  row: number;
  col: number;
};

export function parseSkillVisualEffects(raw: unknown): SkillVisualEffect[] {
  if (!Array.isArray(raw)) return [];
  const out: SkillVisualEffect[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const kind = (entry as { kind?: unknown }).kind;
    if (kind !== 'flame_burn') continue;
    const row = Number((entry as { row?: unknown }).row);
    const col = Number((entry as { col?: unknown }).col);
    if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
    if (row < 0 || row > 8 || col < 0 || col > 8) continue;
    out.push({ kind: 'flame_burn', row, col });
  }
  return out;
}
