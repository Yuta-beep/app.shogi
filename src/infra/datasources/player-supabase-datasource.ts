import { supabase } from '@/lib/supabase/supabase-client';

export class PlayerSupabaseDataSource {
  async getDisplayName(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('players')
      .select('display_name')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data.display_name ?? null;
  }

  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .update({ display_name: displayName })
      .eq('id', userId);

    if (error) throw error;
  }
}
