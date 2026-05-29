/** 着手後スキルで盤面・持ち駒に出すビジュアルエフェクト（エンジン → UI） */
export type SkillVisualEffectPlacement =
  | { type: 'board'; row: number; col: number }
  | { type: 'hand'; side: 'player' | 'enemy'; pieceCode: string; slotIndex?: number };

export type SkillVisualEffect = {
  id: string;
  pieceChar: string;
  placements: SkillVisualEffectPlacement[];
};

function isValidBoardCell(row: number, col: number): boolean {
  return (
    Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row <= 8 && col >= 0 && col <= 8
  );
}

function parsePlacement(raw: unknown): SkillVisualEffectPlacement | null {
  if (!raw || typeof raw !== 'object') return null;
  const type = (raw as { type?: unknown }).type;
  if (type === 'board') {
    const row = Number((raw as { row?: unknown }).row);
    const col = Number((raw as { col?: unknown }).col);
    if (!isValidBoardCell(row, col)) return null;
    return { type: 'board', row, col };
  }
  if (type === 'hand') {
    const side = (raw as { side?: unknown }).side;
    if (side !== 'player' && side !== 'enemy') return null;
    const pieceCode = String((raw as { pieceCode?: unknown }).pieceCode ?? '').trim();
    if (!pieceCode) return null;
    const slotIndexRaw = (raw as { slotIndex?: unknown }).slotIndex;
    const slotIndex =
      slotIndexRaw == null
        ? undefined
        : Number.isInteger(Number(slotIndexRaw))
          ? Number(slotIndexRaw)
          : undefined;
    return {
      type: 'hand',
      side,
      pieceCode: pieceCode.toUpperCase(),
      ...(slotIndex != null && slotIndex >= 0 ? { slotIndex } : {}),
    };
  }
  return null;
}

function parseEffectEntry(raw: unknown, fallbackId: string): SkillVisualEffect | null {
  if (!raw || typeof raw !== 'object') return null;
  const entry = raw as Record<string, unknown>;
  const kind = entry.kind;
  if (kind === 'flame_burn') {
    const row = Number(entry.row);
    const col = Number(entry.col);
    if (!isValidBoardCell(row, col)) return null;
    return {
      id: String(entry.id ?? fallbackId),
      pieceChar: '炎',
      placements: [{ type: 'board', row, col }],
    };
  }
  const pieceChar = String(entry.pieceChar ?? entry.piece_char ?? '').trim();
  if (!pieceChar) return null;
  const placementsRaw = entry.placements;
  const placements: SkillVisualEffectPlacement[] = [];
  if (Array.isArray(placementsRaw)) {
    for (const p of placementsRaw) {
      const parsed = parsePlacement(p);
      if (parsed) placements.push(parsed);
    }
  }
  if (placements.length === 0) return null;
  return {
    id: String(entry.id ?? fallbackId),
    pieceChar,
    placements,
  };
}

export function parseSkillVisualEffects(raw: unknown): SkillVisualEffect[] {
  if (!Array.isArray(raw)) return [];
  const out: SkillVisualEffect[] = [];
  raw.forEach((entry, index) => {
    const parsed = parseEffectEntry(entry, `legacy-fx-${index}`);
    if (parsed) out.push(parsed);
  });
  return out;
}
