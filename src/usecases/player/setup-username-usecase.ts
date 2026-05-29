import { PlayerApiDataSource } from '@/infra/datasources/player-api-datasource';

export interface PlayerProfileWriter {
  updateDisplayName(token: string, username: string): Promise<void>;
}

export async function setupUsername(
  token: string,
  username: string,
  dataSource: PlayerProfileWriter = new PlayerApiDataSource(),
): Promise<void> {
  const trimmed = username.trim();
  if (!trimmed) throw new Error('ユーザーネームを入力してください');
  await dataSource.updateDisplayName(token, trimmed);
}
