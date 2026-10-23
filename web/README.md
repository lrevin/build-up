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
| `hq@buildup.dev` | `buildup1234` | 본사 관리자 (승인·보완 요청·자재 처리 가능) |
| `hq2@buildup.dev` | `buildup1234` | 본사 직원 (조회만 가능) |
| `site@buildup.dev` | `buildup1234` | 현장 관리자 (웹 접근 차단 확인용) |

더미 데이터는 메모리에만 있어서 새로고침하면 처음 상태로 돌아갑니다.

## 실제 서버로 전환

`.env.example`을 `.env.local`로 복사한 뒤:

```
VITE_USE_DUMMY=false
```

`/api` 요청은 vite proxy가 `http://localhost:8080`으로 넘깁니다 (`vite.config.js`).

상태값·계정 구분·로그인 응답 형식은 `docs/API_약속.md`에 맞춰 두었습니다. 서버가 실행되면 이 설정만 바꾸면 됩니다.

## 화면

| 경로 | 화면 |
| --- | --- |
| `/login` | 로그인 (본사·시스템 관리자만 통과) |
| `/` | 대시보드: 현장 카드, 선택 현장 진행률 추이·최근 보고·사진 타임라인, 승인 대기 보고 처리 |
| `/reports` | 보고 승인: 상태·현장별 필터, 승인 / 보완 요청 |
| `/materials` | 자재 요청: 현장 자재 요청 승인 / 반려 (반려 사유 필수) |
| `/sites` | 현장 관리: 연결된 현장 목록 |
| `/sites/:siteId` | 현장 상세: 공정 현황(자동 계산 현장), 진행률 추이, 보고 이력, 사진 타임라인, 작업일보 엑셀 내려받기 |
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

- 값 약속: `docs/API_약속.md` (검토 상태 `pending/approved/revision`, 계정 `role`·`hqRole`·`canReviewReports`, 로그인 토큰, 오류 `{ message }`)
- 응답 모양: `app/types.ts` (SiteSummary, Site, Report, ReportPage, HqInfo, MaterialRequest)
- 진행률: 현장마다 `progressMode`가 `manual`(보고자가 직접 입력) 또는 `auto`(공정 진행률 × 가중치 합계)
- 승인 버튼은 보고·자재 요청마다 서버가 내려주는 `canReview` / `canApprove`로 표시합니다. 본사 직원(`hqRole: member`)은 조회만 할 수 있습니다.
- 더미 모드의 작업일보는 엑셀에서 열리는 CSV로 내려받습니다. 실서버는 `POST /api/sites/{id}/worklog/link`가 주는 주소를 엽니다.

## 알아둘 점

- 웹에는 푸시 알림이 없어서 현장 목록·보고 목록을 30초마다 다시 불러옵니다.
- 역할 검사는 화면 편의용입니다. 승인 API 권한 검사는 서버에서 반드시 해야 합니다.
