import { PlayerApiDataSource } from '@/infra/datasources/player-api-datasource';

const dataSource = new PlayerApiDataSource();

export async function setupUsername(token: string, username: string): Promise<void> {
  const trimmed = username.trim();
  if (!trimmed) throw new Error('ユーザーネームを入力してください');
  await dataSource.updateDisplayName(token, trimmed);
}
