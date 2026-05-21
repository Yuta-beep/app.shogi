import {
  GACHA_PIECE_SKILL_BINDINGS,
  gachaSkillCodeByChar,
  skillDefinitionsV2ForGachaChar,
} from '@/ai/engine/gacha-piece-skill-definitions';

describe('gacha-piece-skill-definitions', () => {
  it('wires engine-ready hooks for 室・逃・爆', () => {
    const hooks = GACHA_PIECE_SKILL_BINDINGS.map(
      (b) => (b.definition.effects as { params?: { hook?: string } }[])[0]?.params?.hook,
    );
    expect(hooks).toContain('safe_room_mark_king_cell');
    expect(hooks).toContain('escape_king_follow');
    expect(hooks).toContain('bomb_explosion_push');
    expect(hooks).toContain('hen_random_edge_imprison');
  });

  it('returns skill payload for 室 with 30% proc', () => {
    const payload = skillDefinitionsV2ForGachaChar('室');
    expect(payload).not.toBeNull();
    const def = payload!.definitions[0] as {
      conditions?: { type: string; params?: { procChance?: number } }[];
    };
    expect(def.conditions?.[0]?.type).toBe('chance_roll');
    expect(def.conditions?.[0]?.params?.procChance).toBe(0.3);
    expect(gachaSkillCodeByChar('灯')).toBe('skill_gacha_tou');
  });

  it('returns skill payload for 安 with 10% proc and transform hook', () => {
    const payload = skillDefinitionsV2ForGachaChar('安');
    expect(payload).not.toBeNull();
    const def = payload!.definitions[0] as {
      conditions?: { type: string; params?: { procChance?: number } }[];
      effects?: { params?: { hook?: string } }[];
    };
    expect(def.conditions?.[0]?.params?.procChance).toBe(0.1);
    expect(def.effects?.[0]?.params?.hook).toBe('an_opponent_special_to_pawn');
    expect(gachaSkillCodeByChar('安')).toBe('skill_gacha_an');
  });

  it('returns skill payload for 宋 with 20% proc and gold summon hook', () => {
    const payload = skillDefinitionsV2ForGachaChar('宋');
    expect(payload).not.toBeNull();
    const def = payload!.definitions[0] as {
      conditions?: { type: string; params?: { procChance?: number } }[];
      effects?: { params?: { hook?: string; summonPieceChar?: string } }[];
    };
    expect(def.conditions?.[0]?.params?.procChance).toBe(0.2);
    expect(def.effects?.[0]?.params?.hook).toBe('so_summon_random_adjacent_gold');
    expect(def.effects?.[0]?.params?.summonPieceChar).toBe('金');
    expect(gachaSkillCodeByChar('宋')).toBe('skill_gacha_so');
  });

  it('returns skill payload for 灯 with 20% proc and fire transform hook', () => {
    const payload = skillDefinitionsV2ForGachaChar('灯');
    expect(payload).not.toBeNull();
    const def = payload!.definitions[0] as {
      conditions?: { type: string; params?: { procChance?: number } }[];
      effects?: { params?: { hook?: string; toPieceChar?: string } }[];
    };
    expect(def.conditions?.[0]?.params?.procChance).toBe(0.2);
    expect(def.effects?.[0]?.params?.hook).toBe('tou_ally_pawn_to_fire');
    expect(def.effects?.[0]?.params?.toPieceChar).toBe('火');
  });

  it('returns skill payload for 辺 with edge imprison hook', () => {
    const payload = skillDefinitionsV2ForGachaChar('辺');
    expect(payload).not.toBeNull();
    const def = payload!.definitions[0] as {
      effects?: { params?: { hook?: string; durationTurns?: number } }[];
    };
    expect(def.effects?.[0]?.params?.hook).toBe('hen_random_edge_imprison');
    expect(def.effects?.[0]?.params?.durationTurns).toBe(2);
  });

  it('returns skill payload for 逸 with 30% proc and send-to-hand hook', () => {
    const payload = skillDefinitionsV2ForGachaChar('逸');
    expect(payload).not.toBeNull();
    const def = payload!.definitions[0] as {
      conditions?: { type: string; params?: { procChance?: number } }[];
      effects?: { params?: { hook?: string } }[];
    };
    expect(def.conditions?.[0]?.params?.procChance).toBe(0.3);
    expect(def.effects?.[0]?.params?.hook).toBe('itsu_random_enemy_to_opponent_hand');
  });
});
