import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/env';

export default async function LegacyAdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) redirect('/');
  await requireSessionUser().catch(() => redirect('/login'));
  return <>{children}</>;
}
