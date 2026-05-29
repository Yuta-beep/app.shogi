import type { ImageSourcePropType } from 'react-native';

import type { SkillVisualEffect } from '@/domain/battle/skill-visual-effect';

/**
 * スキル発動パーティクル画像の登録表。
 *
 * 画像の置き場所: `assets/battle/skill-particles/`
 */
export type SkillParticleKey = 'default' | 'sparkle' | 'flame_burn' | 'moon' | 'mist' | 'phantom';

export const SKILL_PARTICLE_ASSETS: Partial<Record<SkillParticleKey, ImageSourcePropType>> = {
  flame_burn: require('../../assets/battle/skill-particles/piece-炎.png'),
};

export function resolveSkillParticleAsset(
  key?: SkillParticleKey | string | null,
): ImageSourcePropType | null {
  if (!key) {
    return SKILL_PARTICLE_ASSETS.default ?? null;
  }
  const normalized = key as SkillParticleKey;
  return SKILL_PARTICLE_ASSETS[normalized] ?? SKILL_PARTICLE_ASSETS.default ?? null;
}

export function resolveSkillParticleForVisualEffect(
  effect: SkillVisualEffect,
): ImageSourcePropType | null {
  if (effect.kind === 'flame_burn') {
    return resolveSkillParticleAsset('flame_burn');
  }
  return resolveSkillParticleAsset('default');
}

export const skillParticleAssetPreloadTargets: ImageSourcePropType[] = Object.values(
  SKILL_PARTICLE_ASSETS,
).filter((source): source is ImageSourcePropType => source != null);
