import { redirect } from 'next/navigation';

export default function StatsPage() {
  redirect('/records?tab=stats');
}
