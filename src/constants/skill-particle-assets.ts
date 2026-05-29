import type { ImageSourcePropType } from 'react-native';

import type { SkillVisualEffect } from '@/domain/battle/skill-visual-effect';

/**
 * スキル発動パーティクル画像の登録表。
 *
 * 画像の置き場所: `assets/battle/skill-particles/`
 * ファイル名: `piece-{駒の漢字}.png`
 */
export const SKILL_PARTICLE_BY_PIECE_CHAR: Partial<Record<string, ImageSourcePropType>> = {
  時: require('../../assets/battle/skill-particles/piece-時.png'),
  水: require('../../assets/battle/skill-particles/piece-水.png'),
  波: require('../../assets/battle/skill-particles/piece-波.png'),
  火: require('../../assets/battle/skill-particles/piece-火.png'),
  炎: require('../../assets/battle/skill-particles/piece-炎.png'),
  煽: require('../../assets/battle/skill-particles/piece-煽.png'),
  爆: require('../../assets/battle/skill-particles/piece-爆.png'),
  盾: require('../../assets/battle/skill-particles/piece-盾.png'),
  鉄: require('../../assets/battle/skill-particles/piece-鉄.png'),
  雷: require('../../assets/battle/skill-particles/piece-雷.png'),
  電: require('../../assets/battle/skill-particles/piece-電.png'),
  風: require('../../assets/battle/skill-particles/piece-風.png'),
  魔: require('../../assets/battle/skill-particles/piece-魔.png'),
};

export function resolveSkillParticleForPieceChar(
  pieceChar?: string | null,
): ImageSourcePropType | null {
  if (!pieceChar) return null;
  const trimmed = pieceChar.trim();
  return SKILL_PARTICLE_BY_PIECE_CHAR[trimmed] ?? null;
}

export function resolveSkillParticleForVisualEffect(
  effect: SkillVisualEffect,
): ImageSourcePropType | null {
  return resolveSkillParticleForPieceChar(effect.pieceChar);
}

export const skillParticleAssetPreloadTargets: ImageSourcePropType[] = Object.values(
  SKILL_PARTICLE_BY_PIECE_CHAR,
).filter((source): source is ImageSourcePropType => source != null);
