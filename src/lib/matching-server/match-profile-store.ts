import type { MatchPlayerProfile } from '@/domain/matching-server/protocol';

export type StoredMatchProfile = {
  self: MatchPlayerProfile;
  opponent: MatchPlayerProfile;
};

let activeProfile: StoredMatchProfile | null = null;

export function setActiveMatchProfile(profile: StoredMatchProfile): void {
  activeProfile = profile;
}

export function getActiveMatchProfile(): StoredMatchProfile | null {
  return activeProfile;
}

export function clearActiveMatchProfile(): void {
  activeProfile = null;
}

export function formatMatchPlayerLabel(profile: MatchPlayerProfile, prefix: string): string {
  const name = profile.displayName.trim() || profile.userId;
  return `${prefix}: ${name} (R${profile.rating})`;
}
