import { redirect } from 'next/navigation';

export default function LeaderboardPage() {
  redirect('/records?tab=leaderboard');
}
