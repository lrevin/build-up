# web

상부·관리자가 보는 **웹 화면** 코드만 올리는 폴더입니다. (본사 관리자 대시보드, 담당: 강건우)

React 19 · Vite · React Router · TanStack Query · Axios · Tailwind CSS v4

## 실행

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

지금은 **더미 데이터 모드**가 기본입니다. 서버 없이 바로 동작합니다.

| 계정 | 비밀번호 | 용도 |
| --- | --- | --- |
| `hq@buildup.dev` | `buildup1234` | 본사 관계자 (정상 로그인) |
| `site@buildup.dev` | `buildup1234` | 현장 관리자 (웹 접근 차단 확인용) |

더미 데이터는 메모리에만 있어서 새로고침하면 처음 상태로 돌아갑니다.

## 실제 서버로 전환

`.env.example`을 `.env.local`로 복사한 뒤:

```
VITE_USE_DUMMY=false
```

`/api` 요청은 vite proxy가 `http://localhost:8080`으로 넘깁니다 (`vite.config.js`).

전환 전에 팀에서 확정해야 하는 것 (코드에 `TODO(백엔드 확인)` 표시):

1. 보고 검토 상태값 표기 — `src/constants/enums.js`, `src/api/reportsApi.js`
2. 본사 계정 구분 값 (`/api/auth/me`의 `role`) — `src/constants/enums.js`
3. 로그인 응답·refresh 요청 필드명 — `src/api/authApi.js`, `src/api/axiosInstance.js`

## 화면

| 경로 | 화면 |
| --- | --- |
| `/login` | 로그인 (본사·시스템 관리자만 통과) |
| `/` | 대시보드: 현장 카드, 선택 현장 진행률 추이·최근 보고·사진 타임라인, 승인 대기 보고 처리 |
| `/reports` | 보고 승인: 상태·현장별 필터, 승인 / 보완 요청 |
| `/sites` | 현장 관리: 연결된 현장 목록 |
| `/sites/:siteId` | 현장 상세: 진행률 추이, 보고 이력, 전체 사진 타임라인 |
| `/photos` | 사진 기록: 현장별 사진을 촬영일 순으로 |

## 폴더 구조

```
src/
├── api/            서버 호출만 (경로는 endpoints.js 한 곳). 더미 모드면 mocks로 분기
├── mocks/          더미 데이터(seed.js)와 가짜 서버(mockServer.js) — app/types.ts 형식 그대로
├── hooks/queries/  React Query 훅과 캐시 키
├── contexts/       AuthContext (로그인 상태만. 서버 데이터는 React Query)
├── components/
│   ├── common/     도메인과 무관한 UI (Card, Badge, ProgressBar, Toast …)
│   └── domain/     Build Up 전용 UI (SiteCard, ReportReviewPanel, PhotoTimeline …)
├── layouts/        사이드바 레이아웃
├── pages/          화면 단위 조립
├── routes/         라우트 정의, 로그인 가드
├── services/       토큰 저장, 날짜·숫자 포맷
└── constants/      enum (상태값·역할) — 서버 값과 1:1로 맞추는 곳
```

## 데이터 형식 기준

응답 모양은 레포의 공용 계약 `app/types.ts`(SiteSummary, Site, Report, ReportPage, HqInfo)를 따릅니다.
진행률은 보고자가 입력한 현장 전체 진행률(`reports.to_progress`)을 그대로 씁니다 (V9 이후 공정 가중치 합산 아님).

## 알아둘 점

- 웹에는 푸시 알림이 없어서 현장 목록·보고 목록을 30초마다 다시 불러옵니다.
- 역할 검사는 화면 편의용입니다. 승인 API 권한 검사는 서버에서 반드시 해야 합니다.
