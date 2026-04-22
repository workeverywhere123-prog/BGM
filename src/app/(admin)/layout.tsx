import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/env';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) redirect('/');
  await requireSessionUser().catch(() => redirect('/login'));

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <nav className="flex items-center gap-6 text-sm">
          <a href="/" className="font-bold tracking-tight opacity-90 hover:opacity-100">
            BGM
          </a>
          <a href="/admin/record" className="opacity-60 hover:opacity-100">
            경기 기록
          </a>
        </nav>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
