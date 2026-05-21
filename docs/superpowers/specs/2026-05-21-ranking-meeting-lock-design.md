# 랭크 경기 모임 잠금 — Design Spec

**Date:** 2026-05-21
**Status:** Approved

---

## 목적

`is_ranked = true` 인 방(🏆 랭크 경기)은 라피스 획득/손실이 발생한다.
아무 때나 랭크 방을 만들어 진행되는 것을 막고, 관리자가 연 **정기 모임(`status = 'active'`) 중에만** 랭크 경기 방 생성을 허용한다.
`is_ranked = false` 인 친선 경기는 제한 없이 자유롭게 만들 수 있다.

---

## 조건

| 상황 | 랭크 경기 방 생성 | 친선 경기 방 생성 |
|------|-----------------|-----------------|
| `meetings.status = 'active'` 인 모임 존재 | ✅ 허용 | ✅ 허용 |
| 활성 모임 없음 | ❌ 차단 | ✅ 허용 |

---

## 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/app/api/rooms/route.ts` | POST: `is_ranked=true` 시 활성 모임 존재 여부 체크 |
| `src/app/rooms/page.tsx` | 활성 모임 여부 조회 후 `hasActiveMeeting` prop 전달 |
| `src/app/rooms/RoomsClient.tsx` | `hasActiveMeeting` prop 수신, CreateModal로 전달, 토글 비활성화 |

---

## API 변경 (`POST /api/rooms`)

요청 body에 `is_ranked: true` 가 포함된 경우:

1. `meetings` 테이블에서 `status = 'active'` 인 행 존재 여부 조회
2. 없으면 → `403 { error: '정기 모임 중에만 랭크 경기를 만들 수 있습니다' }` 반환
3. 있으면 → 기존 로직 그대로 방 생성

```
POST /api/rooms { is_ranked: true, ... }
  └─ 활성 모임 조회
       있음 → 방 생성 201
       없음 → 403 에러

POST /api/rooms { is_ranked: false, ... }
  └─ 그냥 방 생성 201 (기존 동작)
```

---

## UI 변경

### `src/app/rooms/page.tsx`
`getSessionUser`, `getRooms` 와 함께 활성 모임 존재 여부(`hasActiveMeeting: boolean`)를 병렬 조회해서 `RoomsClient`에 prop으로 전달.

### `src/app/rooms/RoomsClient.tsx`
- `RoomsClient` props에 `hasActiveMeeting: boolean` 추가
- `CreateModal` props에 `hasActiveMeeting: boolean` 추가
- `hasActiveMeeting = false` 일 때:
  - `isRanked` 초기값을 `false`로 설정
  - 랭크/친선 토글 클릭 막음 (`pointer-events: none`)
  - 토글 영역에 잠금 안내 문구 표시: "정기 모임 중에만 랭크 경기를 만들 수 있습니다"

---

## 보안

UI 비활성화는 UX용. 실제 차단은 API 서버에서만 수행.

---

## 범위 밖

- 이미 생성된 랭크 방: 영향 없음
- 경기 결과 기록 admin 화면: 변경 없음
- 게임 타입(순위전·팀전 등) 선택: 변경 없음
