import { supabase } from '@/lib/supabase/supabase-client';
import { HomeSnapshot } from '@/domain/models/home';

export class HomeSupabaseDataSource {
  async getSnapshot(): Promise<HomeSnapshot> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('No active session');

    const { data, error } = await supabase
      .from('players')
      .select('display_name, rating, pawn_currency, gold_currency, player_rank, player_exp')
      .eq('id', session.user.id)
      .single();

    if (error) throw error;

    return {
      playerName: data.display_name,
      rating: data.rating,
      pawnCurrency: data.pawn_currency,
      goldCurrency: data.gold_currency,
      playerRank: data.player_rank,
      playerExp: data.player_exp,
    };
  }
}
