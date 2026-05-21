import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 });

    if (file.size > 2 * 1024 * 1024)
      return NextResponse.json({ error: '파일 크기는 2MB 이하여야 합니다' }, { status: 400 });

    if (!file.type.startsWith('image/'))
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다' }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const ext = file.name.split('.').pop() ?? 'jpg';
    // 타임스탬프를 파일명에 포함해 브라우저 캐시 무효화
    const ts = Date.now();
    const path = `avatars/${user.id}_${ts}.${ext}`;

    // 이전 아바타 파일 삭제 (용량 절약)
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list('avatars', { search: user.id });
    if (existingFiles?.length) {
      await supabase.storage.from('avatars').remove(
        existingFiles.map(f => `avatars/${f.name}`)
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

    await supabase.from('players')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
