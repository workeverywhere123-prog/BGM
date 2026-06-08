import { redirect } from 'next/navigation';

// /record 접근 시 사이드바가 있는 /admin/record 로 리다이렉트
export default function RecordLegacyRedirect() {
  redirect('/admin/record');
}
