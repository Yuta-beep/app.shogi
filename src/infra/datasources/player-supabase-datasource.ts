import { supabase } from '@/lib/supabase/supabase-client';

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);

  if (error && typeof error === 'object') {
    const maybe = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const message = typeof maybe.message === 'string' ? maybe.message : 'Supabase request failed';
    const extras = [maybe.code, maybe.details, maybe.hint].filter((v) => typeof v === 'string');
    return new Error(extras.length > 0 ? `${message} (${extras.join(' | ')})` : message);
  }

  return new Error(String(error));
}

export class PlayerSupabaseDataSource {
  async getDisplayName(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('players')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw toError(error);
    return data?.display_name ?? null;
  }

  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .upsert(
        {
          id: userId,
          display_name: displayName,
        },
        { onConflict: 'id' },
      )
      .select('id')
      .single();

    if (error) throw toError(error);
  }
}
