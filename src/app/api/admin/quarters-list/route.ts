import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data: quarters } = await supabase.from('quarters').select('id, name').order('created_at', { ascending: false });
  return NextResponse.json({ quarters: quarters ?? [] });
}
