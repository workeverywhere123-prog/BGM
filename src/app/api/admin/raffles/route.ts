import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data: raffles } = await supabase
    .from('raffles')
    .select('id, name, prize, status, created_at')
    .order('created_at', { ascending: false });
  return NextResponse.json({ raffles: raffles ?? [] });
}
