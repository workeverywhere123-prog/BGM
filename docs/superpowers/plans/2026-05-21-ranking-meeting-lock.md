# 랭크 경기 모임 잠금 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `is_ranked = true` 인 방은 정기 모임(`meetings.status = 'active'`)이 열려 있을 때만 생성 가능하도록 API와 UI 양쪽에서 차단한다.

**Architecture:** 서버(API route)에서 실제 차단, 클라이언트(RoomsClient)에서 UX 피드백 제공. `rooms/page.tsx`가 활성 모임 여부를 조회해 prop으로 내려주고, CreateModal이 그에 따라 랭크 토글을 비활성화한다.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript

---

## 파일 맵

| 액션 | 파일 |
|------|------|
| 수정 | `src/app/api/rooms/route.ts` |
| 수정 | `src/app/rooms/page.tsx` |
| 수정 | `src/app/rooms/RoomsClient.tsx` |

---

## Task 1: API 서버 차단

**Files:**
- Modify: `src/app/api/rooms/route.ts`

- [ ] **Step 1: route.ts POST 핸들러에 체크 추가**

`src/app/api/rooms/route.ts` 에서 `POST` 함수 내부, `if (!location || !scheduled_at)` 체크 바로 뒤에 추가:

```typescript
// is_ranked=true 인 경우 활성 모임 필요
if (is_ranked === true) {
  const { count } = await supabase
    .from('meetings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');
  if (!count) {
    return NextResponse.json(
      { error: '정기 모임 중에만 랭크 경기를 만들 수 있습니다' },
      { status: 403 }
    );
  }
}
```

전체 수정 후 `POST` 함수:

```typescript
export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = await createSupabaseServerClient();
    const { title, location, scheduled_at, game_types, max_players, note, boardlife_game_id, boardlife_game_name, boardlife_game_thumb, is_online, is_ranked } = await req.json();

    if (!location || !scheduled_at) {
      return NextResponse.json({ error: '장소와 일시를 입력해주세요' }, { status: 400 });
    }

    if (is_ranked === true) {
      const { count } = await supabase
        .from('meetings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');
      if (!count) {
        return NextResponse.json(
          { error: '정기 모임 중에만 랭크 경기를 만들 수 있습니다' },
          { status: 403 }
        );
      }
    }

    const { data: room, error } = await supabase
      .from('rooms')
      .insert({ host_id: user.id, title: title || null, location, scheduled_at, game_types: game_types ?? [], max_players: max_players ?? 6, note: note || null, boardlife_game_id: boardlife_game_id || null, boardlife_game_name: boardlife_game_name || null, boardlife_game_thumb: boardlife_game_thumb || null, is_online: is_online ?? false, is_ranked: is_ranked ?? true })
      .select('id, title, location, scheduled_at, game_types, max_players, status, note, host_id, boardlife_game_id, boardlife_game_name, boardlife_game_thumb, is_online, is_ranked')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('room_members').insert({ room_id: room.id, player_id: user.id });

    const { data: hostPlayer } = await supabase.from('players').select('id, nickname, username').eq('id', user.id).single();

    return NextResponse.json({
      ...room,
      host: hostPlayer,
      members: [hostPlayer],
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/rooms/route.ts
git commit -m "feat: block ranked room creation without active meeting"
```

---

## Task 2: 페이지에서 활성 모임 여부 조회

**Files:**
- Modify: `src/app/rooms/page.tsx`

- [ ] **Step 1: 활성 모임 조회 추가**

`src/app/rooms/page.tsx` 에서 `Promise.all` 에 활성 모임 조회를 추가하고 `RoomsClient`에 prop 전달.

기존:
```typescript
const [resolvedUser, rooms] = await Promise.all([
  configured ? getSessionUser().catch(() => null) : Promise.resolve(null),
  configured ? getRooms() : Promise.resolve([]),
]);
```

변경 후:
```typescript
async function getHasActiveMeeting(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase
      .from('meetings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
    return (count ?? 0) > 0;
  } catch { return false; }
}

// RoomsPage 함수 내부:
const [resolvedUser, rooms, hasActiveMeeting] = await Promise.all([
  configured ? getSessionUser().catch(() => null) : Promise.resolve(null),
  configured ? getRooms() : Promise.resolve([]),
  configured ? getHasActiveMeeting() : Promise.resolve(false),
]);
```

- [ ] **Step 2: RoomsClient에 prop 전달**

기존:
```tsx
<RoomsClient initialRooms={rooms as any[]} currentUserId={user?.id ?? null} currentUserNickname={user?.nickname ?? null} userGames={userGames} />
```

변경 후:
```tsx
<RoomsClient initialRooms={rooms as any[]} currentUserId={user?.id ?? null} currentUserNickname={user?.nickname ?? null} userGames={userGames} hasActiveMeeting={hasActiveMeeting} />
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/rooms/page.tsx
git commit -m "feat: pass hasActiveMeeting to RoomsClient"
```

---

## Task 3: UI 토글 비활성화

**Files:**
- Modify: `src/app/rooms/RoomsClient.tsx`

- [ ] **Step 1: RoomsClient props에 hasActiveMeeting 추가**

`src/app/rooms/RoomsClient.tsx` 의 `RoomsClient` 컴포넌트 props 정의 수정:

기존:
```typescript
export default function RoomsClient({
  initialRooms, currentUserId, currentUserNickname, userGames,
}: {
  initialRooms: Room[];
  currentUserId: string | null;
  currentUserNickname: string | null;
  userGames: UserGame[];
})
```

변경 후:
```typescript
export default function RoomsClient({
  initialRooms, currentUserId, currentUserNickname, userGames, hasActiveMeeting,
}: {
  initialRooms: Room[];
  currentUserId: string | null;
  currentUserNickname: string | null;
  userGames: UserGame[];
  hasActiveMeeting: boolean;
})
```

- [ ] **Step 2: CreateModal 호출부에 hasActiveMeeting 전달**

`RoomsClient` 내부에서 `CreateModal`을 렌더링하는 부분을 찾아 prop 추가.

기존:
```tsx
{showCreate && (
  <CreateModal
    onClose={() => setShowCreate(false)}
    onCreate={handleCreate}
    isPending={isPending}
    currentUserNickname={currentUserNickname ?? ''}
    userGames={userGames}
  />
)}
```

변경 후:
```tsx
{showCreate && (
  <CreateModal
    onClose={() => setShowCreate(false)}
    onCreate={handleCreate}
    isPending={isPending}
    currentUserNickname={currentUserNickname ?? ''}
    userGames={userGames}
    hasActiveMeeting={hasActiveMeeting}
  />
)}
```

- [ ] **Step 3: CreateModal props 정의에 hasActiveMeeting 추가**

기존:
```typescript
function CreateModal({ onClose, onCreate, isPending, currentUserNickname, userGames }: {
  onClose: () => void; onCreate: (d: CreateData) => void;
  isPending: boolean; currentUserNickname: string; userGames: UserGame[];
})
```

변경 후:
```typescript
function CreateModal({ onClose, onCreate, isPending, currentUserNickname, userGames, hasActiveMeeting }: {
  onClose: () => void; onCreate: (d: CreateData) => void;
  isPending: boolean; currentUserNickname: string; userGames: UserGame[];
  hasActiveMeeting: boolean;
})
```

- [ ] **Step 4: isRanked 초기값 및 토글 동작 수정**

기존 (`CreateModal` 내부):
```typescript
const [isRanked, setIsRanked] = useState(true);
```

변경 후:
```typescript
const [isRanked, setIsRanked] = useState(hasActiveMeeting);
```

- [ ] **Step 5: 토글 UI 수정 — 비활성 모임 시 잠금 표시**

기존 랭크/친선 토글 블록:
```tsx
{/* 라피스 반영 여부 */}
<div style={{ marginTop: '1.2rem', padding: '0.9rem 1.1rem', border: `1px solid ${isRanked ? 'rgba(201,168,76,0.3)' : 'rgba(148,163,184,0.2)'}`, background: isRanked ? 'rgba(201,168,76,0.05)' : 'rgba(148,163,184,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer' }}
  onClick={() => setIsRanked(p => !p)}>
  <div>
    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.15em', color: isRanked ? 'var(--gold)' : 'var(--white-dim)', marginBottom: '0.2rem' }}>
      {isRanked ? '🏆 랭크 경기 — 라피스 반영' : '🎮 친선 경기 — 라피스 미반영'}
    </p>
    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'var(--white-dim)', opacity: 0.6 }}>
      {isRanked ? '게임 결과에 따라 라피스가 지급/차감됩니다' : '경기는 기록되지만 라피스에 영향을 주지 않습니다'}
    </p>
  </div>
  <div style={{ width: 40, height: 22, borderRadius: 11, background: isRanked ? 'var(--gold)' : 'rgba(148,163,184,0.3)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
    <div style={{ position: 'absolute', top: 3, left: isRanked ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
  </div>
</div>
```

변경 후:
```tsx
{/* 라피스 반영 여부 */}
<div
  style={{
    marginTop: '1.2rem', padding: '0.9rem 1.1rem',
    border: `1px solid ${!hasActiveMeeting ? 'rgba(148,163,184,0.15)' : isRanked ? 'rgba(201,168,76,0.3)' : 'rgba(148,163,184,0.2)'}`,
    background: !hasActiveMeeting ? 'rgba(148,163,184,0.02)' : isRanked ? 'rgba(201,168,76,0.05)' : 'rgba(148,163,184,0.04)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
    cursor: hasActiveMeeting ? 'pointer' : 'not-allowed',
    opacity: hasActiveMeeting ? 1 : 0.5,
  }}
  onClick={() => { if (hasActiveMeeting) setIsRanked(p => !p); }}
>
  <div>
    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.15em', color: isRanked ? 'var(--gold)' : 'var(--white-dim)', marginBottom: '0.2rem' }}>
      {!hasActiveMeeting
        ? '🔒 랭크 경기 잠금 — 정기 모임 중에만 가능'
        : isRanked ? '🏆 랭크 경기 — 라피스 반영' : '🎮 친선 경기 — 라피스 미반영'}
    </p>
    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'var(--white-dim)', opacity: 0.6 }}>
      {!hasActiveMeeting
        ? '현재 진행 중인 정기 모임이 없습니다'
        : isRanked ? '게임 결과에 따라 라피스가 지급/차감됩니다' : '경기는 기록되지만 라피스에 영향을 주지 않습니다'}
    </p>
  </div>
  <div style={{ width: 40, height: 22, borderRadius: 11, background: isRanked && hasActiveMeeting ? 'var(--gold)' : 'rgba(148,163,184,0.3)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
    <div style={{ position: 'absolute', top: 3, left: isRanked && hasActiveMeeting ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
  </div>
</div>
```

- [ ] **Step 6: TypeScript 타입 체크**

```bash
npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 7: 커밋**

```bash
git add src/app/rooms/RoomsClient.tsx
git commit -m "feat: disable ranked toggle when no active meeting"
```

---

## 최종 동작 확인

- [ ] 활성 모임 없을 때 `/rooms` → 방 개설 모달 → 랭크/친선 토글이 🔒 잠금 상태로 표시되고 클릭 안 됨
- [ ] 활성 모임 없을 때 `is_ranked: true` 로 직접 POST → 403 에러 반환
- [ ] 활성 모임 있을 때 → 토글 정상 작동, 랭크 방 생성 성공
- [ ] 활성 모임 있을 때 친선(is_ranked: false) 방 → 활성 모임 없어도 정상 생성
