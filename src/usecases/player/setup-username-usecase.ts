import { PlayerSupabaseDataSource } from '@/infra/datasources/player-supabase-datasource';

const dataSource = new PlayerSupabaseDataSource();

export async function setupUsername(userId: string, username: string): Promise<void> {
  const trimmed = username.trim();
  if (!trimmed) throw new Error('ユーザーネームを入力してください');
  await dataSource.updateDisplayName(userId, trimmed);
}
