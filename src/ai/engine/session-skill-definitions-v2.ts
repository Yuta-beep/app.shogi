import type { PieceCatalogItem } from '@/domain/models/piece';

/**
 * ステージ開始時に boardState.skill_definitions_v2 へ載せる定義。
 * BFF が駒マスタに structured skill を載せていない場合でも、幻・霧のクライアント挙動を成立させる。
 * API 側で同名 skillId が来た場合はそちらで上書きする。
 */
const CANONICAL_FALLBACK_DEFINITIONS: ReadonlyArray<Record<string, unknown>> = [
  {
    skillId: 38,
    pieceChars: ['幻'],
    trigger: { type: 'continuous_rule' },
    conditions: [{ type: 'chance_roll', params: { procChance: 0.5 } }],
    effects: [
      {
        type: 'defense_or_immunity',
        target: { group: 'self', selector: 'self_piece' },
        params: { mode: 'evade_capture' },
      },
    ],
  },
  {
    skillId: 39,
    pieceChars: ['霧'],
    trigger: { type: 'after_move' },
    conditions: [{ type: 'chance_roll', params: { procChance: 0.3 } }],
    effects: [
      {
        type: 'send_to_hand',
        target: { group: 'adjacent', selector: 'adjacent_enemy' },
        params: { handOwner: 'target_owner' },
      },
    ],
  },
];

type PieceCatalogItemWithSkillJson = PieceCatalogItem & {
  skillDefinitionsV2?: unknown;
  skill_definitions_v2?: unknown;
};

function definitionsFromCatalogItem(item: PieceCatalogItemWithSkillJson): unknown[] {
  const raw = item.skillDefinitionsV2 ?? item.skill_definitions_v2;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const defs = (raw as { definitions?: unknown }).definitions;
    if (Array.isArray(defs)) return defs;
  }
  return [];
}

export function assembleSkillDefinitionsV2ForSession(
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
): { definitions: Record<string, unknown>[] } {
  const bySkillId = new Map<number, Record<string, unknown>>();
  const extras: Record<string, unknown>[] = [];

  for (const def of CANONICAL_FALLBACK_DEFINITIONS) {
    const id = Number(def.skillId);
    if (Number.isFinite(id)) {
      bySkillId.set(id, { ...def });
    } else {
      extras.push({ ...def });
    }
  }

  for (const item of Object.values(pieceDefsByCode)) {
    if (!item) continue;
    for (const entry of definitionsFromCatalogItem(item as PieceCatalogItemWithSkillJson)) {
      if (!entry || typeof entry !== 'object') continue;
      const rec = entry as Record<string, unknown>;
      const sid = Number(rec.skillId);
      if (Number.isFinite(sid)) {
        bySkillId.set(sid, rec);
      } else {
        extras.push(rec);
      }
    }
  }

  return { definitions: [...bySkillId.values(), ...extras] };
}
