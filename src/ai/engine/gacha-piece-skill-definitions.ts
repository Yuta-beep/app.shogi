import type { GachaCollectibleChar } from '@/constants/gacha-piece-metadata';
import { AN_SKILL_DESCRIPTION_JA, SOU_SKILL_DESCRIPTION_JA } from '@/ai/engine/shop-piece-moves';

/**
 * ガチャ駒の skill_definitions_v2（Supabase 未登録時のクライアント正典）。
 * 実処理は skill-runtime / apply-move / legal-moves。BFF の m_gacha とは独立。
 *
 * skillId は 90000 + pieceId で piece マスタと対応づける。
 */
export type GachaPieceSkillBinding = {
  char: GachaCollectibleChar;
  /** master.m_skill.skill_code（BFF seed と揃える） */
  skillCode: string;
  skillId: number;
  definition: Record<string, unknown>;
  /** skill-runtime に script_hook 実装あり */
  engineReady: boolean;
};

function afterMoveScriptHook(
  char: GachaCollectibleChar,
  skillCode: string,
  skillId: number,
  hook: string,
  skillText: string,
): GachaPieceSkillBinding {
  return {
    char,
    skillCode,
    skillId,
    engineReady: true,
    definition: {
      skillId,
      pieceChars: [char],
      trigger: { group: 'event_move', type: 'after_move' },
      conditions: [],
      effects: [
        {
          type: 'script_hook',
          target: { group: 'self', selector: 'self_piece' },
          params: { hook },
        },
      ],
      source: {
        skillText,
        sourceKind: 'manual',
        sourceFile: 'gacha-piece-skill-definitions',
        sourceFunction: hook,
      },
      classification: {
        implementationKind: 'script_hook',
        tags: ['gacha', 'move_trigger', hook],
      },
      scriptHook: hook,
      notes: 'gacha-client-canonical',
    },
  };
}

/** エンジン実装済み（script_hook） */
const ENGINE_READY_GACHA_SKILLS: GachaPieceSkillBinding[] = [
  {
    char: '室',
    skillCode: 'skill_gacha_muro',
    skillId: 90116,
    engineReady: true,
    definition: {
      skillId: 90116,
      pieceChars: ['室'],
      trigger: { group: 'event_move', type: 'after_move' },
      conditions: [{ type: 'chance_roll', params: { procChance: 0.3 } }],
      effects: [
        {
          type: 'script_hook',
          target: { group: 'self', selector: 'self_piece' },
          params: { hook: 'safe_room_mark_king_cell', durationTurns: 2 },
        },
      ],
      source: {
        skillText:
          '移動時30%の確率で2ターン、味方の王がいるマスをセーフルームにする。王は移動できないが敵に取られない。',
        sourceKind: 'manual',
        sourceFile: 'gacha-piece-skill-definitions',
        sourceFunction: 'SHITSU_SAFE_ROOM',
      },
      classification: {
        implementationKind: 'script_hook',
        tags: ['gacha', 'move_trigger', 'safe_room_cell'],
      },
      scriptHook: 'safe_room_mark_king_cell',
      notes: 'gacha-client-canonical',
    },
  },
  {
    char: '定',
    skillCode: 'skill_gacha_sadame',
    skillId: 90117,
    engineReady: true,
    definition: {
      skillId: 90117,
      pieceChars: ['定'],
      trigger: { group: 'event_move', type: 'after_move' },
      conditions: [],
      effects: [
        {
          type: 'script_hook',
          target: { group: 'self', selector: 'self_piece' },
          params: { hook: 'sadame_opponent_next_turn_cost_cap', maxPieceCost: 5 },
        },
      ],
      source: {
        skillText: '移動後、次の相手番のみコスト5以下の駒しか動かせない。',
        sourceKind: 'manual',
        sourceFile: 'gacha-piece-skill-definitions',
        sourceFunction: 'SADAME_COST_CAP',
      },
      classification: {
        implementationKind: 'script_hook',
        tags: ['gacha', 'move_trigger', 'opponent_turn_max_piece_cost'],
      },
      scriptHook: 'sadame_opponent_next_turn_cost_cap',
      notes: 'gacha-client-canonical',
    },
  },
  {
    char: '安',
    skillCode: 'skill_gacha_an',
    skillId: 90118,
    engineReady: true,
    definition: {
      skillId: 90118,
      pieceChars: ['安'],
      trigger: { group: 'event_move', type: 'after_move' },
      conditions: [{ type: 'chance_roll', params: { procChance: 0.1 } }],
      effects: [
        {
          type: 'script_hook',
          target: { group: 'self', selector: 'self_piece' },
          params: { hook: 'an_opponent_special_to_pawn' },
        },
      ],
      source: {
        skillText: AN_SKILL_DESCRIPTION_JA,
        sourceKind: 'manual',
        sourceFile: 'gacha-piece-skill-definitions',
        sourceFunction: 'AN_SPECIAL_TO_PAWN',
      },
      classification: {
        implementationKind: 'script_hook',
        tags: ['gacha', 'move_trigger', 'an_transform'],
      },
      scriptHook: 'an_opponent_special_to_pawn',
      notes: 'gacha-client-canonical',
    },
  },
  {
    char: '宋',
    skillCode: 'skill_gacha_so',
    skillId: 90119,
    engineReady: true,
    definition: {
      skillId: 90119,
      pieceChars: ['宋'],
      trigger: { group: 'event_move', type: 'after_move' },
      conditions: [{ type: 'chance_roll', params: { procChance: 0.2 } }],
      effects: [
        {
          type: 'script_hook',
          target: { group: 'self', selector: 'self_piece' },
          params: {
            hook: 'so_summon_random_adjacent_gold',
            summonPieceCode: 'KI',
            summonPieceChar: '金',
          },
        },
      ],
      source: {
        skillText: '移動時20%の確率で、周囲8マスのランダムな空きマス1マスに「金」を召喚する。',
        sourceKind: 'manual',
        sourceFile: 'gacha-piece-skill-definitions',
        sourceFunction: 'SO_SUMMON_GOLD',
      },
      classification: {
        implementationKind: 'script_hook',
        tags: ['gacha', 'move_trigger', 'summon_gold'],
      },
      scriptHook: 'so_summon_random_adjacent_gold',
      notes: 'gacha-client-canonical',
    },
  },
  {
    char: '灯',
    skillCode: 'skill_gacha_tou',
    skillId: 90120,
    engineReady: true,
    definition: {
      skillId: 90120,
      pieceChars: ['灯'],
      trigger: { group: 'event_move', type: 'after_move' },
      conditions: [{ type: 'chance_roll', params: { procChance: 0.2 } }],
      effects: [
        {
          type: 'script_hook',
          target: { group: 'self', selector: 'self_piece' },
          params: { hook: 'tou_ally_pawn_to_fire', toPieceCode: 'FIR', toPieceChar: '火' },
        },
      ],
      source: {
        skillText: '移動時20%の確率で、味方の「歩」をランダムに1体「火」駒に変化させる。',
        sourceKind: 'manual',
        sourceFile: 'gacha-piece-skill-definitions',
        sourceFunction: 'TOU_ALLY_PAWN_TO_FIRE',
      },
      classification: {
        implementationKind: 'script_hook',
        tags: ['gacha', 'move_trigger', 'tou_pawn_to_fire'],
      },
      scriptHook: 'tou_ally_pawn_to_fire',
      notes: 'gacha-client-canonical',
    },
  },
  afterMoveScriptHook(
    '爆',
    'skill_gacha_baku',
    90114,
    'bomb_explosion_push',
    '移動時爆発を起こし、周囲8マスのすべての駒（味方・敵）を外側へ1マス遠ざける（押し出し先が空きマスのときのみ。巨駒は対象外）。',
  ),
  {
    char: '辺',
    skillCode: 'skill_gacha_hen',
    skillId: 90121,
    engineReady: true,
    definition: {
      skillId: 90121,
      pieceChars: ['辺'],
      trigger: { group: 'event_move', type: 'after_move' },
      conditions: [],
      effects: [
        {
          type: 'script_hook',
          target: { group: 'self', selector: 'self_piece' },
          params: { hook: 'hen_random_edge_imprison', durationTurns: 2 },
        },
      ],
      source: {
        skillText:
          '移動時、将棋盤の4辺のうちランダムに1辺を選び、その辺上のすべての駒を2ターン移動不能にする。',
        sourceKind: 'manual',
        sourceFile: 'gacha-piece-skill-definitions',
        sourceFunction: 'HEN_RANDOM_EDGE_IMPRISON',
      },
      classification: {
        implementationKind: 'script_hook',
        tags: ['gacha', 'move_trigger', 'hen_edge_highlight'],
      },
      scriptHook: 'hen_random_edge_imprison',
      notes: 'gacha-client-canonical',
    },
  },
  {
    char: '逸',
    skillCode: 'skill_gacha_itsu',
    skillId: 90122,
    engineReady: true,
    definition: {
      skillId: 90122,
      pieceChars: ['逸'],
      trigger: { group: 'event_move', type: 'after_move' },
      conditions: [{ type: 'chance_roll', params: { procChance: 0.3 } }],
      effects: [
        {
          type: 'script_hook',
          target: { group: 'self', selector: 'self_piece' },
          params: { hook: 'itsu_random_enemy_to_opponent_hand' },
        },
      ],
      source: {
        skillText:
          '移動時30%の確率で、相手の駒（王を除く）を1体ランダムに選び、相手の手持ち駒に送る。',
        sourceKind: 'manual',
        sourceFile: 'gacha-piece-skill-definitions',
        sourceFunction: 'ITSU_SEND_ENEMY_TO_HAND',
      },
      classification: {
        implementationKind: 'script_hook',
        tags: ['gacha', 'move_trigger', 'itsu_send_to_hand'],
      },
      scriptHook: 'itsu_random_enemy_to_opponent_hand',
      notes: 'gacha-client-canonical',
    },
  },
  afterMoveScriptHook(
    '逃',
    'skill_gacha_to',
    90124,
    'escape_king_follow',
    '移動した方向と同じ向きに、味方の王を1マス追従させる（空マスのみ）。',
  ),
  afterMoveScriptHook(
    '艸',
    'skill_gacha_sou',
    90125,
    'sou_grass_random_pit_cells',
    SOU_SKILL_DESCRIPTION_JA,
  ),
  afterMoveScriptHook(
    '膠',
    'skill_gacha_ko',
    90127,
    'ko_glue_follow_horizontal_ally',
    '隣接する味方駒が横移動（同一行で左右）したとき、同じ向きに1マス追従する（空マスのみ）。',
  ),
];

/** 未配線（skill-runtime / 仕様確定後に追加） */
export const GACHA_SKILL_TODO: ReadonlyArray<{
  char: GachaCollectibleChar;
  skillCode: string;
}> = [{ char: '煽', skillCode: 'skill_gacha_aori' }];

export const GACHA_PIECE_SKILL_BINDINGS: readonly GachaPieceSkillBinding[] =
  ENGINE_READY_GACHA_SKILLS;

export function gachaSkillDefinitionsV2Payload(): { definitions: Record<string, unknown>[] } {
  return { definitions: GACHA_PIECE_SKILL_BINDINGS.map((b) => b.definition) };
}

export function skillDefinitionsV2ForGachaChar(
  char: string,
): { definitions: Record<string, unknown>[] } | null {
  const binding = GACHA_PIECE_SKILL_BINDINGS.find((b) => b.char === char);
  if (!binding) return null;
  return { definitions: [binding.definition] };
}

export function gachaSkillCodeByChar(char: string): string | null {
  const ready = GACHA_PIECE_SKILL_BINDINGS.find((b) => b.char === char);
  if (ready) return ready.skillCode;
  const todo = GACHA_SKILL_TODO.find((t) => t.char === char);
  return todo?.skillCode ?? null;
}
