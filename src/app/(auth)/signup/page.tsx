import { redirect } from 'next/navigation';
import { AuthCard } from '../AuthCard';
import { signupAction } from '../actions';
import { getSessionUser } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata = {
  title: '회원가입 · boardgame-league',
};

export default async function SignupPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const user = await getSessionUser();
  if (user) redirect('/');

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <AuthCard mode="signup" action={signupAction} />
    </main>
  );
}
