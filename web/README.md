# web

Build Up **웹 화면** 코드 폴더입니다. 모든 계정이 쓰며, 본사는 관리자 페이지·현장 관리자/작업자는 사용자 페이지로 갑니다. (담당: 강건우)

React 19 · Vite · React Router · TanStack Query · Axios · Tailwind CSS v4

## 실행

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

지금은 **더미 데이터 모드**가 기본입니다. 서버 없이 바로 동작합니다.
계정은 서버 데모 계정(`api/server` DemoDataSeeder)과 같고, 비밀번호는 모두 `1234`입니다.

| 계정 | 가는 곳 |
| --- | --- |
| `hq@buildup.kr` | 관리자 페이지 `/admin` (본사 관리자: 승인·보완 요청·자재 처리) |
| `admin@buildup.kr` | 사용자 페이지 `/my` (현장 관리자: 보고 작성 + 자기 현장 승인·자재 처리) |
| `worker@buildup.kr` | 사용자 페이지 `/my` (작업자: 보고 작성·내 보고 확인) |
| `park@buildup.kr` | 사용자 페이지 `/my` (본사 없이 운영하는 현장 관리자 → 보고가 바로 승인됨) |
| `sys@buildup.kr` | `/system` (시스템 관리자 화면은 준비 중 안내) |
| `hq2@buildup.kr` | 관리자 페이지, 본사 직원(조회만) — **더미 전용** |

로그인 화면의 **회원가입**으로 새 계정도 만들 수 있습니다 (`/signup`, 서버 `POST /api/auth/signup`).
더미 데이터는 메모리에만 있어서 새로고침하면 처음 상태로 돌아갑니다. (더미에서 가입한 계정도 사라짐)

## 실제 서버와 연결

### 1) 서버 켜기 — MySQL 없이 (Java 17만 필요)
서버의 자동 테스트 설정(H2 메모리 DB + 데모 계정)으로 켭니다. 서버를 끄면 데이터는 처음으로 돌아갑니다.

```powershell
cd api\server
$env:SPRING_PROFILES_ACTIVE="test"
.\gradlew.bat bootTestRun
```
`Started BuildupServerApplication`이 보이면 성공. 확인: http://localhost:8080/api/health → `{"status":"ok"}`
(MySQL로 켜는 정식 방법은 `api/server/README.md`)

### 2) 웹을 서버 모드로
`web` 폴더에 `.env.local` 파일을 만들고(커밋 금지) 아래 한 줄을 넣은 뒤 `npm run dev`를 다시 실행합니다.

```
VITE_USE_DUMMY=false
```

`/api`·`/files`(사진)·`/downloads`(작업일보) 요청은 vite proxy가 `http://localhost:8080`으로 넘깁니다 (`vite.config.js`).
상태값·계정 구분·로그인 응답 형식은 `docs/API_약속.md`와 서버 DTO에 맞춰 두었습니다.

## 화면

모든 계정이 로그인할 수 있고, 계정 종류(`/api/auth/me`의 `role`)에 따라 다른 페이지로 갑니다.

**회원가입 `/signup`**: 역할 선택(현장 관리자 · 작업자 · 본사 관계자) → 정보 입력 → 가입하면 바로 로그인.
앱 가입 화면과 같은 규칙(본사 코드로 보고·합류, 새 본사 등록 시 본사 코드 발급). 현장 관리자의 회사·사무소명은 DB에 칸이 없어 받지 않습니다.

**가입 인증 (필수)**: 이메일·휴대폰 둘 다 [인증 받기] → 6자리 확인 → 가입 (`docs/API_약속.md` 3번 "가입 인증").
더미 모드는 메일·문자 대신 화면에 코드를 보여 줍니다. 실서버(개발 PC)는 **서버 콘솔**에 코드가 찍힙니다.

**카카오 로그인**: 로그인·가입 화면의 카카오 버튼 → 카카오 → `/oauth/kakao/callback` → 처음이면 가입 화면(비밀번호 없음, 휴대폰 인증 필요).
더미 모드는 가짜 카카오 계정 하나로 동작. 실서버는 `.env.local`에 키를 넣어야 버튼이 보입니다(서버에도 카카오 키가 있어야 함, 없으면 503).

```
VITE_KAKAO_REST_API_KEY=카카오앱REST키   # 카카오 콘솔 Redirect URI: http://localhost:5173/oauth/kakao/callback
```
다른 계정의 주소를 직접 입력하면 자기 첫 화면으로 돌아갑니다. (실제 권한 검사는 서버가 함)

**관리자 페이지 `/admin` — 본사 관계자(`hq`)**

| 경로 | 화면 |
| --- | --- |
| `/admin` | 대시보드: 현장 카드, 공정 현황/진행률 추이, 최근 보고, 사진 타임라인, 승인 대기 보고 처리 |
| `/admin/reports` | 보고 승인: 상태·현장별 필터, 승인 / 보완 요청 |
| `/admin/materials` | 자재 요청: 승인 / 반려 (반려 사유 필수) |
| `/admin/sites`, `/admin/sites/:id` | 현장 목록 · 상세 (작업일보 엑셀 내려받기) |
| `/admin/photos` | 사진 기록 |

**사용자 페이지 `/my` — 현장 관리자(`admin`) · 작업자(`worker`)**

| 경로 | 화면 |
| --- | --- |
| `/my` | 내 현장: 참여 중인 현장 카드, **참여 코드로 현장 참여**(코드 → 현장 확인 → 참여) |
| `/my/sites/:id` | 현장 상세: 보고 / 자재 요청 / 사진 탭. 현장 관리자는 참여 코드 확인·보고 승인·자재 처리·작업일보 엑셀 |
| `/my/report/new` | **보고 작성**: 현장 → 진행한 작업(한 줄씩) → 사진 → 진행률(직접 입력 또는 공정 선택) → 작업일보·메모·첨부 → 제출 |
| `/my/reports` | 보고 이력: 검토 결과 확인, 보완 요청 받은 보고 다시 제출 |

웹 보고 작성은 앱과 같은 `POST /api/sites/{id}/reports`(multipart)를 씁니다.
사진 촬영 시각·위치(EXIF)는 서버가 사진 파일에서 직접 읽으므로 원본 파일을 그대로 올립니다.
제출 위치는 브라우저 위치 권한으로 받고, 거부하면 위치 없이 제출됩니다.

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
