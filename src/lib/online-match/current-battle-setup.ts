import * as SecureStore from 'expo-secure-store';

const CURRENT_BATTLE_SETUP_ID_KEY = 'current_online_match_battle_setup_id';

export async function saveCurrentBattleSetupId(battleSetupId: string) {
  await SecureStore.setItemAsync(CURRENT_BATTLE_SETUP_ID_KEY, battleSetupId);
}

export async function loadCurrentBattleSetupId() {
  return SecureStore.getItemAsync(CURRENT_BATTLE_SETUP_ID_KEY);
}

export async function clearCurrentBattleSetupId() {
  await SecureStore.deleteItemAsync(CURRENT_BATTLE_SETUP_ID_KEY);
}
