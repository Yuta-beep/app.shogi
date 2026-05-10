export function getMatchingServerWsBaseUrl() {
  const raw = (process.env.EXPO_PUBLIC_MATCHING_SERVER_WS_URL ?? '').trim();
  return raw.replace(/\/+$/, '');
}
