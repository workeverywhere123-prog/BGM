import { redirect } from 'next/navigation';
import { AuthCard } from '../AuthCard';
import { loginAction } from '../actions';
import { getSessionUser } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata = {
  title: '로그인 · boardgame-league',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const params = await searchParams;
  // Before Supabase keys are set, bounce to home (which shows the setup banner).
  if (!isSupabaseConfigured()) redirect('/');
  const user = await getSessionUser();
  if (user) redirect(params.redirectTo ?? '/');

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <AuthCard mode="login" action={loginAction} redirectTo={params.redirectTo ?? '/'} />
    </main>
  );
}
