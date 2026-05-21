'use client';

import { useState, useRef } from 'react';

interface ProfileEditorProps {
  player: {
    id: string;
    nickname: string;
    username: string;
    bio: string | null;
    avatar_url: string | null;
    profile_title: string | null;
    banner_color: string | null;
  };
}

const BANNER_PRESETS = [
  { label: '숲', value: '#1a3d2a' },
  { label: '심해', value: '#0f2744' },
  { label: '흑요석', value: '#1a1a1e' },
  { label: '자수정', value: '#2d1a44' },
  { label: '황금', value: '#3d2e0a' },
  { label: '적철', value: '#3d1010' },
];

export default function ProfileEditor({ player }: ProfileEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [nickname, setNickname] = useState(player.nickname);
  const [bio, setBio] = useState(player.bio ?? '');
  const [title, setTitle] = useState(player.profile_title ?? '');
  const [bannerColor, setBannerColor] = useState(player.banner_color ?? '#1a3d2a');
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url ?? '');
  const [avatarPreview, setAvatarPreview] = useState(player.avatar_url ?? '');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 미리보기
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setAvatarUrl(json.url);
    } catch {
      setError('업로드 실패. URL 직접 입력을 이용해 주세요.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, bio, avatar_url: avatarUrl, profile_title: title, banner_color: bannerColor }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setOpen(false);
      // 닉네임 변경 시 URL도 바뀔 수 있으므로 full reload
      const savedNickname = json.nickname;
      if (savedNickname && savedNickname !== player.nickname) {
        window.location.href = `/profile/${player.username}`;
      } else {
        window.location.reload();
      }
    } catch {
      setError('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.12em',
          padding: '0.45rem 1rem', border: '1px solid rgba(201,168,76,0.5)',
          background: 'rgba(201,168,76,0.08)', color: '#c9a84c', cursor: 'pointer',
          transition: 'all 0.2s', lineHeight: 1.4,
        }}
      >
        프로필 편집
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(5,20,12,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{ background: 'var(--background)', border: '1px solid rgba(201,168,76,0.25)', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem' }}>

            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>PROFILE SETTINGS</p>
                <h2 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.2rem', color: 'var(--foreground)', lineHeight: 1.1 }}>프로필 꾸미기</h2>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--white-dim)', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.5, marginTop: '0.2rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>

              {/* 프로필 사진 */}
              <div>
                <label style={labelStyle}>프로필 사진</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                  >
                    {avatarPreview
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.4rem', color: 'var(--gold-dim)' }}>{player.nickname[0]}</span>
                    }
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '0'}
                    >
                      <span style={{ fontSize: '1.2rem' }}>📷</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.12em', padding: '0.45rem 1rem', border: '1px solid rgba(201,168,76,0.3)', background: 'transparent', color: 'var(--gold-dim)', cursor: 'pointer', marginBottom: '0.5rem', display: 'block' }}
                    >
                      {uploading ? '업로드 중...' : '이미지 파일 선택'}
                    </button>
                    <input
                      value={avatarUrl}
                      onChange={e => { setAvatarUrl(e.target.value); setAvatarPreview(e.target.value); }}
                      placeholder="또는 이미지 URL 직접 입력"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>

              {/* 닉네임 */}
              <div>
                <label style={labelStyle}>닉네임</label>
                <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={20} style={inputStyle} />
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'rgba(244,239,230,0.3)', marginTop: '0.3rem' }}>2~20자, 다른 플레이어와 중복 불가</p>
              </div>

              {/* 칭호 */}
              <div>
                <label style={labelStyle}>칭호 / 한 줄 소개</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="예: 전략의 달인, 마피아 전문가, 보드게임 수집가..."
                  maxLength={30}
                  style={inputStyle}
                />
              </div>

              {/* 바이오 */}
              <div>
                <label style={labelStyle}>소개글</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="자신을 소개해 주세요"
                  rows={3}
                  maxLength={200}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'rgba(244,239,230,0.3)', marginTop: '0.3rem', textAlign: 'right' }}>{bio.length}/200</p>
              </div>

              {/* 배너 색상 */}
              <div>
                <label style={labelStyle}>프로필 배너 색상</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {BANNER_PRESETS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setBannerColor(p.value)}
                      style={{
                        width: 44, height: 44, background: p.value, border: `2px solid ${bannerColor === p.value ? 'var(--gold)' : 'transparent'}`,
                        cursor: 'pointer', position: 'relative', flexShrink: 0,
                      }}
                      title={p.label}
                    >
                      {bannerColor === p.value && (
                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>✓</span>
                      )}
                    </button>
                  ))}
                  {/* 커스텀 색상 */}
                  <label style={{ width: 44, height: 44, border: '1px dashed rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', flexShrink: 0 }} title="직접 선택">
                    <input type="color" value={bannerColor} onChange={e => setBannerColor(e.target.value)} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', color: 'var(--gold-dim)', pointerEvents: 'none' }}>+</span>
                  </label>
                </div>
                <div style={{ marginTop: '0.6rem', height: 8, background: bannerColor, border: '1px solid rgba(201,168,76,0.1)' }} />
              </div>

              {error && (
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: '#f87171', padding: '0.5rem 0.8rem', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.06)' }}>
                  {error}
                </p>
              )}

              {/* 저장 */}
              <div style={{ display: 'flex', gap: '0.8rem', paddingTop: '0.4rem' }}>
                <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em', padding: '0.8rem', border: '1px solid rgba(201,168,76,0.2)', background: 'transparent', color: 'var(--white-dim)', cursor: 'pointer' }}>
                  취소
                </button>
                <button type="button" onClick={handleSave} disabled={saving || uploading} style={{ flex: 2, fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.18em', padding: '0.8rem', border: 'none', background: saving ? 'rgba(201,168,76,0.3)' : 'var(--gold)', color: '#0b2218', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                  {saving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'Cinzel', serif", fontSize: '0.57rem', letterSpacing: '0.15em',
  color: 'var(--gold-dim)', display: 'block', marginBottom: '0.5rem',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.9rem', boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.25)',
  color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif",
  fontSize: '1rem', outline: 'none',
};
