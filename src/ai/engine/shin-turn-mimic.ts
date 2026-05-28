import type { AiBattlePosition } from '@/ai/model';

export type ShinTurnMimicEntry = {
  side: 'player' | 'enemy';
  bound_turn_number: number;
  mimic_char: string;
  mimic_piece_code: string;
  mimic_name?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function readSkillState(position: AiBattlePosition): Record<string, unknown> {
  const boardState = asRecord(position.boardState) ?? {};
  return asRecord(boardState.skill_state ?? boardState.skillState) ?? {};
}

function writeSkillState(position: AiBattlePosition, skillState: Record<string, unknown>): void {
  const boardState = asRecord(position.boardState) ?? {};
  position.boardState = {
    ...boardState,
    skill_state: skillState,
  };
}

function parseShinTurnMimicEntry(raw: unknown): ShinTurnMimicEntry | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const side = rec.side === 'player' || rec.side === 'enemy' ? rec.side : null;
  const boundTurn =
    typeof rec.bound_turn_number === 'number'
      ? rec.bound_turn_number
      : typeof rec.boundTurnNumber === 'number'
        ? rec.boundTurnNumber
        : null;
  const mimicChar =
    typeof rec.mimic_char === 'string'
      ? rec.mimic_char
      : typeof rec.mimicChar === 'string'
        ? rec.mimicChar
        : null;
  const mimicPieceCode =
    typeof rec.mimic_piece_code === 'string'
      ? rec.mimic_piece_code
      : typeof rec.mimicPieceCode === 'string'
        ? rec.mimicPieceCode
        : null;
  if (!side || boundTurn == null || !mimicChar || !mimicPieceCode) return null;
  const mimicName =
    typeof rec.mimic_name === 'string'
      ? rec.mimic_name
      : typeof rec.mimicName === 'string'
        ? rec.mimicName
        : undefined;
  return {
    side,
    bound_turn_number: boundTurn,
    mimic_char: mimicChar,
    mimic_piece_code: mimicPieceCode,
    ...(mimicName ? { mimic_name: mimicName } : {}),
  };
}

/** 手番側・現在ターンに紐づく「進」の模倣先（未設定なら null）。 */
export function readShinTurnMimic(
  position: AiBattlePosition,
  side: 'player' | 'enemy',
): ShinTurnMimicEntry | null {
  const skillState = readSkillState(position);
  const rawList = skillState.shin_turn_mimics;
  if (!Array.isArray(rawList)) return null;
  for (const raw of rawList) {
    const entry = parseShinTurnMimicEntry(raw);
    if (entry && entry.side === side && entry.bound_turn_number === position.turnNumber) {
      return entry;
    }
  }
  return null;
}

export function writeShinTurnMimic(position: AiBattlePosition, entry: ShinTurnMimicEntry): void {
  const skillState = { ...readSkillState(position) };
  const prev = Array.isArray(skillState.shin_turn_mimics) ? skillState.shin_turn_mimics : [];
  const filtered = prev.filter((raw) => {
    const parsed = parseShinTurnMimicEntry(raw);
    if (!parsed) return false;
    return !(parsed.side === entry.side && parsed.bound_turn_number === entry.bound_turn_number);
  });
  skillState.shin_turn_mimics = [...filtered, entry];
  writeSkillState(position, skillState);
}

export function ensureShinTurnMimic(
  position: AiBattlePosition,
  side: 'player' | 'enemy',
  pick: () => Omit<ShinTurnMimicEntry, 'side' | 'bound_turn_number'> | null,
): ShinTurnMimicEntry | null {
  const existing = readShinTurnMimic(position, side);
  if (existing) return existing;
  const chosen = pick();
  if (!chosen) return null;
  const entry: ShinTurnMimicEntry = {
    side,
    bound_turn_number: position.turnNumber,
    mimic_char: chosen.mimic_char,
    mimic_piece_code: chosen.mimic_piece_code,
    ...(chosen.mimic_name ? { mimic_name: chosen.mimic_name } : {}),
  };
  writeShinTurnMimic(position, entry);
  return entry;
}
