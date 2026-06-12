export interface RaffleRow {
  id: string; name: string; prize: string; description: string | null;
  status: 'open' | 'closed' | 'drawn';
  created_at: string; ends_at: string | null; drawn_at: string | null;
  winner_id: string | null; winner_nickname: string | null; winner_username: string | null;
  entry_count: number; total_tickets: number;
}
