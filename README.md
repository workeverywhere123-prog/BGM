# Boardgame League

보드게임 리그 관리 홈페이지. Next.js (App Router) + TypeScript + Tailwind CSS 기반.

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:9000](http://localhost:9000) 열면 Welcome 화면이 보입니다.

## 스크립트

- `npm run dev` — 개발 서버 실행 (포트 9000)
- `npm run build` — 프로덕션 빌드
- `npm start` — 프로덕션 서버 실행 (포트 9000)
- `npm run lint` — ESLint 실행

## 폴더 구조

```
src/
  app/
    layout.tsx      # 루트 레이아웃
    page.tsx        # 홈 (Welcome)
    globals.css     # 전역 스타일
public/             # 정적 파일 (이미지, 아이콘 등)
```

## 앞으로 추가 예정

- 회원가입 / 로그인
- 게임 결과 입력 및 기록
- 랭킹 / 리더보드
- 일정 및 대진표 관리
