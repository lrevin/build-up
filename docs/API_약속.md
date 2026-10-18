# API 약속 (앱 · 웹 · 서버 공통)

앱·웹·서버가 주고받는 값을 아래로 통일합니다. 서버 주소 앞부분은 `/api` 입니다.
값이 바뀌면 이 문서부터 고치고 팀에 알려 주세요.

---

## 1. 보고 검토 상태

| API(JSON) 값 | DB 값 | 뜻 |
|---|---|---|
| `pending` | `PENDING` | 검토 대기 |
| `approved` | `APPROVED` | 승인 |
| `revision` | `REVISION` | 보완 요청(코멘트 필수) |

- **API로는 항상 소문자**, DB에는 대문자로 저장합니다.
- 예전 이름 `REJECTED`는 쓰지 않습니다. DB는 `database/migrations/V10__rename_review_rejected_to_revision.sql`로 바꿉니다.
- 자재 요청 상태(`requested` / `approved` / `rejected`)는 보고 검토와 별개이고 그대로입니다.

검토 요청 예시
```http
PATCH /api/reports/{reportId}/review
{ "status": "revision", "comment": "사진이 흐려요. 다시 찍어 주세요." }
```

---

## 2. 계정 구분(본사 여부·승인 권한)

`/api/auth/me`와 로그인 응답의 `user`에 아래 값이 들어 있습니다.

```json
{
  "id": "3",
  "name": "정본사",
  "email": "hq@buildup.kr",
  "phone": "010-7777-8888",
  "role": "hq",
  "company": "한빛건설 본사",
  "companyCode": "250901",
  "hqName": null,
  "hqRole": "manager",
  "canReviewReports": true
}
```

| 칸 | 값 | 설명 |
|---|---|---|
| `role` | `worker` / `admin` / `hq` / `system` | 작업자 / 현장 관리자 / **본사 관계자** / 시스템 관리자 |
| `hqRole` | `manager` / `member` / `null` | 본사 관계자만. 본사 관리자 / 본사 일반 직원 |
| `canReviewReports` | `true` / `false` | 본사에서 **보고 검토·자재 승인**을 할 수 있는가(= 본사 관리자) |

- **웹 대시보드 로그인 조건:** `role === 'hq'` (현장 관리자도 받으려면 `role === 'admin'`도 허용)
- **승인 버튼 표시 조건:** `canReviewReports === true`. 보고마다 내려오는 `canReview`가 최종 판단입니다.
- 새 본사를 등록한 사람은 `manager`, 본사 코드로 합류한 사람은 `member`입니다.
- JWT 안의 `role` 클레임도 같은 소문자 값입니다. 다만 화면 판단은 `/api/auth/me`로 하세요.

DB 설계(창원)와의 대응

| DB | API |
|---|---|
| `users.role = SYSTEM_ADMIN` | `role: "system"` |
| `company_memberships.role = HQ_MANAGER` | `role: "hq"`, `hqRole: "manager"`, `canReviewReports: true` |
| `company_memberships.role = HQ_MEMBER` | `role: "hq"`, `hqRole: "member"`, `canReviewReports: false` |
| 현장을 만들 수 있는 계정(현장 관리자) | `role: "admin"` |
| 그 밖의 계정 | `role: "worker"` |

---

## 3. 로그인 · 토큰

### 로그인 / 회원가입
```http
POST /api/auth/login
{ "email": "hq@buildup.kr", "password": "1234" }
```
응답(가입 `POST /api/auth/signup`도 같은 모양)
```json
{
  "user": { "...": "위 2번의 user" },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "q8Zt...",
  "tokenType": "Bearer",
  "accessTokenExpiresAt": "2026-10-18T04:07:10Z",
  "refreshTokenExpiresAt": "2026-11-17T03:07:10Z"
}
```

- **`accessToken`**: API를 부를 때 `Authorization: Bearer {accessToken}`으로 보냅니다. 기본 60분입니다.
- **`refreshToken`**: 접근 토큰이 만료됐을 때 새로 받는 데 씁니다. 기본 30일입니다.

### 접근 토큰 다시 받기
```http
POST /api/auth/refresh
{ "refreshToken": "q8Zt..." }
```
- 응답은 로그인과 같은 모양입니다. 새 `accessToken`이 오고 `refreshToken`은 그대로입니다.
- 리프레시 토큰이 틀렸거나, 만료됐거나, 로그아웃한 것이면 `401`입니다. 이때는 다시 로그인합니다.

### 로그아웃
```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
{ "refreshToken": "q8Zt..." }
```
- 접근 토큰과 리프레시 토큰이 모두 바로 무효가 됩니다.

### 내 정보
```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```
- 응답은 위 2번의 `user`입니다.

### 클라이언트 처리(앱·웹 공통)
1. API가 `401`을 주면 `/api/auth/refresh`를 **한 번만** 부르고, 새 `accessToken`으로 같은 요청을 다시 보냅니다.
2. 동시에 여러 요청이 `401`이어도 갱신은 한 번만 합니다.
3. 갱신도 `401`이면 저장된 토큰을 지우고 로그인 화면으로 보냅니다.

- 앱 구현: `api/client.ts`의 `refreshAccessToken`

---

## 4. 오류 응답

모든 오류는 같은 모양입니다. 상태는 HTTP 상태 코드로 구분합니다.
```json
{ "message": "가중치 합계가 100%가 되어야 해요. (지금 90%)" }
```
- 화면에는 `message`를 그대로 보여 주면 됩니다.
- 주요 상태 코드: `401` 로그인 필요, `403` 권한 없음, `404` 없음, `409` 충돌, `429` 너무 많이 틀림

---

## 5. 그 밖에 자주 쓰는 값

| 값 | 내용 |
|---|---|
| 진행률 계산 방식 `progressMode` | `manual`(직접 입력) / `auto`(공정 가중치 자동 계산) |
| 날짜·시각 | ISO 8601 문자열(UTC). 예: `2026-10-18T03:07:10Z` |
| id | 모두 문자열 |
