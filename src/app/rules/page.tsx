import { redirect } from 'next/navigation';

export default function RulesPage() {
  redirect('/notice?tab=rules');
}
