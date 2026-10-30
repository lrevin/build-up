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
Authorization: Bearer {accessToken}   (없어도 됨)
{ "refreshToken": "q8Zt..." }
```
- **리프레시 토큰**은 바로 폐기됩니다. 이후 이 토큰으로 `/api/auth/refresh`를 부르면 `401`입니다.
- **접근 토큰**은 일부러 바로 폐기하지 않습니다(DB 설계 의도).
  - 서버가 로그인 상태를 저장하지 않는 JWT 방식이라, 접근 토큰은 만료 시각(기본 60분)이 지나야 스스로 무효가 됩니다.
  - 그래서 유효 시간을 짧게 두고, 로그아웃 뒤에는 리프레시 토큰이 막혀 새 접근 토큰을 받을 수 없게 합니다.
- **클라이언트(앱·웹)는 로그아웃할 때 저장해 둔 접근 토큰과 리프레시 토큰을 모두 지웁니다.**
- `refreshToken`만 있으면 로그아웃할 수 있습니다. `Authorization` 헤더는 없어도 됩니다.

### 내 정보
```http
GET /api/auth/me
Authorization: Bearer {accessToken}   (없어도 됨)
```
- 응답은 위 2번의 `user`입니다.

### 클라이언트 처리(앱·웹 공통)
1. API가 `401`을 주면 `/api/auth/refresh`를 **한 번만** 부르고, 새 `accessToken`으로 같은 요청을 다시 보냅니다.
2. 동시에 여러 요청이 `401`이어도 갱신은 한 번만 합니다.
3. 갱신도 `401`이면 저장된 토큰을 지우고 로그인 화면으로 보냅니다.

- 앱 구현: `api/client.ts`의 `refreshAccessToken`

### 가입 인증 (이메일 · 휴대폰 둘 다 필수)

흐름: 이메일 **인증 받기** → 메일로 온 6자리 입력 → **확인** / 휴대폰도 같은 방식(문자) → **가입하기**

```http
POST /api/auth/email/send      { "email": "kim@example.com" }
POST /api/auth/phone/send      { "phone": "010-1234-5678" }
```
```json
{ "expiresInSeconds": 300, "resendAfterSeconds": 60 }
```
- 코드는 6자리 숫자, **5분** 유효. 같은 이메일·번호로 **60초 안에** 다시 받으면 `429`
- 이미 가입된 이메일이면 `409` `{ "message": "이미 가입된 이메일입니다." }`
- 휴대폰은 010·011·016~019로 시작하는 번호만(`-`는 있어도 없어도 됨). 아니면 `400`
- 보내기 제한(문자 요금 보호): 한 기기(IP)당 1시간 10번, **같은 이메일·번호당 1시간 5번·하루 10번**. 넘으면 `429`

```http
POST /api/auth/email/verify    { "email": "kim@example.com", "code": "482913" }
POST /api/auth/phone/verify    { "phone": "010-1234-5678", "code": "482913" }
```
```json
{ "emailVerificationToken": "ev_9f3a...", "expiresInSeconds": 1800 }
{ "phoneVerificationToken": "pv_51c0...", "expiresInSeconds": 1800 }
```
- 틀리면 `400` `{ "message": "인증 코드가 맞지 않아요. (4번 남음)" }`, 5번 틀리면 `429`(코드를 다시 받아야 함, 다시 받기 60초 대기는 그대로)
- 만료면 `400` `{ "message": "인증 코드가 만료됐어요. 다시 받아 주세요." }`
- 받은 토큰은 **30분 안에** 가입 요청에 같이 보냅니다. 한 번 가입에 쓰면 다시 못 씁니다.
  (다른 칸이 틀려 가입이 실패하면 토큰은 그대로 남아서, 고쳐서 다시 보내면 됩니다)

가입 요청에 칸이 늘었습니다.
```http
POST /api/auth/signup
{
  "role": "worker", "name": "김현장", "email": "kim@example.com", "phone": "010-1234-5678",
  "password": "8자이상비밀번호", "company": null, "companyCode": null,
  "emailVerificationToken": "ev_9f3a...",
  "phoneVerificationToken": "pv_51c0...",
  "signupToken": null,
  "agreeAge": true, "agreeTerms": true, "agreePrivacy": true
}
```
- **필수 동의**(만 14세 이상 · 이용약관 · 개인정보 수집·이용)가 하나라도 `true`가 아니면 `400`
  `{ "message": "만 14세 이상만 가입할 수 있어요." }` / `{ "message": "이용약관과 개인정보 수집·이용에 동의해 주세요." }`.
  세 칸이 아예 없으면(예전 앱) `{ "message": "약관 동의가 필요해요. 앱이 예전 버전이면 최신 버전으로 업데이트해 주세요." }`.
  인증을 확인하기 전에 거절하므로 받은 인증 토큰은 그대로 남습니다. 동의 시각과 약관 버전은 `users`에 저장(V15)
- 인증이 없거나, 만료됐거나, **인증한 이메일·번호와 다른 값**으로 가입하면 `400`
  `{ "message": "이메일 인증을 완료해 주세요." }` / `{ "message": "휴대폰 인증을 완료해 주세요." }`
- 응답은 로그인과 같은 모양(바로 로그인 상태)
- 현장 관리자의 `company`(회사·사무소명)는 DB 설계(V11)에 칸이 없어 **저장되지 않습니다.** 화면에서 받지 않아도 됩니다.

> **메일·문자 설정이 없는 서버(개발 PC)**: 실제로 보내지 않고 **서버 로그**에 코드가 찍힙니다.
> `[개발 모드] 이메일 인증 코드 123456 → kim@example.com` 를 보고 입력하면 됩니다.

### 카카오 로그인

**웹** (인가 코드 방식, 비밀 키는 서버에만)
1. 카카오 로그인 화면으로 이동:
   `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id={REST API 키}&redirect_uri={웹 주소}/oauth/kakao/callback`
2. 콜백 화면이 받은 `code`를 서버로
```http
POST /api/auth/oauth/kakao
{ "code": "인가코드", "redirectUri": "http://localhost:5173/oauth/kakao/callback" }
```

**앱** (카카오 SDK 없이 휴대폰 브라우저로)
1. `POST /api/auth/oauth/kakao/begin` → `{ "url": "...", "key": "..." }`. **`key`는 앱만 기억**(폰에 저장)
2. `url`을 휴대폰 브라우저로 열기 → 서버가 카카오 로그인 화면으로 보냄
3. 로그인을 마치면 서버가 `buildupapp://oauth/kakao?ticket=...` 로 앱을 다시 엶
4. `POST /api/auth/oauth/kakao/ticket { "ticket": "...", "key": "1에서 받은 key" }` 로 결과 받기(티켓은 2분, 한 번만)
   - `key`가 없거나 다르면 `403`: 다른 사람이 보낸 로그인 링크를 열어도 로그인되지 않게 하기 위해서예요.
     앱은 진행 중인 카카오 로그인이 없으면 이 링크를 무시합니다.

**응답 (웹·앱 같음)**
- 이미 카카오로 가입한 사람 → 로그인과 같은 응답
- 처음 온 사람 → 가입 필요
```json
{ "signupRequired": true, "signupToken": "st_...", "provider": "kakao",
  "email": "kim@kakao.com", "name": "김현장", "expiresInSeconds": 600 }
```
- 가입 화면(역할·휴대폰 인증 등)을 보여 주고, `signup`에 `signupToken`을 같이 보냅니다(10분 유효).
  - `password`는 보내지 않습니다(카카오 계정은 비밀번호 없이 카카오로만 로그인).
  - `email`이 있으면(카카오가 인증한 이메일) 그 이메일 그대로 가입할 때 **이메일 인증 생략**. 휴대폰 인증은 항상 필요.
  - `email`이 `null`이면(카카오 이메일 동의 안 함) 이메일 입력 + 이메일 인증.
- 같은 이메일로 이미 이메일 가입한 계정이 있으면 `409`
  `{ "message": "이미 이메일로 가입된 계정이에요. 이메일로 로그인해 주세요." }` (자동 연결하지 않음)
- 서버에 카카오 키가 없으면 `503` `{ "message": "카카오 로그인이 아직 설정되지 않았어요." }`

**카카오 개발자 콘솔에 등록할 Redirect URI**
- 앱: `{서버 주소}/api/auth/oauth/kakao/callback` (예: `http://localhost:8080/api/auth/oauth/kakao/callback`)
- 웹: `{웹 주소}/oauth/kakao/callback`

### 비밀번호 찾기 (이메일 코드 → 새 비밀번호)

로그인 없이 쓸 수 있습니다. 가입 인증과 같은 순서예요.
```http
POST /api/auth/password/send    { "email": "kim@example.com" }
→ { "expiresInSeconds": 300, "resendAfterSeconds": 60 }

POST /api/auth/password/verify  { "email": "kim@example.com", "code": "123456" }
→ { "resetToken": "rv_...", "expiresInSeconds": 1800 }

POST /api/auth/password/reset   { "email": "kim@example.com", "resetToken": "rv_...", "password": "8자 이상" }
→ { "ok": true }
```
- `send`는 가입하지 않은 이메일이어도 같은 응답을 줍니다(가입 여부를 알 수 없게). 코드는 가입한 계정에만 보냅니다.
- 바꾸면 그 계정의 다른 기기 로그인(리프레시 토큰)은 모두 끊깁니다. 앱은 바꾼 뒤 로그아웃시켜요.
- 카카오로만 가입한 계정도 이걸로 비밀번호를 만들면 이메일 로그인을 할 수 있어요.

### 회원 탈퇴

```http
DELETE /api/auth/me      (Authorization 필요)
→ { "ok": true, "deleteAt": "2026-11-02T14:38:00Z" }
```
- 바로 로그아웃(리프레시 토큰 폐기, 알림 기기 삭제). 화면에서는 **한 번 더 확인**을 받고 부르세요.
- 탈퇴 신청한 계정으로 로그인하면 `403` `{ "message": "탈퇴 신청한 계정이에요. 7일 안에 같은 이메일로 다시 가입하면 계정과 현장 기록이 그대로 복구돼요." }`
- **실수로 탈퇴한 경우(7일 안)**: 같은 이메일로 다시 가입하면(인증 코드 보내기 → 가입) 새 계정을 만들지 않고
  **원래 계정을 복구**합니다. 이름·역할·현장·보고는 그대로, 비밀번호만 새로 입력한 값으로 바뀝니다.
  카카오로 가입한 계정은 7일 안에 카카오로 다시 로그인하면 복구됩니다.
- **7일 뒤** 서버가 계정 정보를 영구 삭제합니다(1시간마다 확인).
  - 내가 만든 현장은 보고·자재 요청·사진까지 모두 삭제
  - 다른 사람 현장에 남긴 보고·자재 요청은 지우지 않고 작성자를 `탈퇴한 사용자`로 표시(이메일·휴대폰·비밀번호는 삭제)
- 시스템 관리자, 발표용 예시 계정(`@buildup.kr`, 예시 데이터를 켠 서버)은 탈퇴할 수 없어요(`400`/`403`).
- DB: `users.deleted_at`(V13)

---

## 3-1. 보고 · 진행률 · 자재 재고 (CBT 의견 반영, DB V14)

### 진행률은 승인된 보고만 반영
- 보고를 올리면 `review.status = "pending"`이고 **현장 진행률은 그대로**입니다.
- 현장 총관리자나 연결된 본사 관리자가 `PATCH /api/reports/{id}/review { status: "approved" }`로 **승인한 순간** 진행률이 오릅니다.
  (본사 없는 현장의 총관리자 본인 보고는 제출하자마자 승인 → 바로 반영)
- 보고 응답의 `from`/`to`는 "이 보고가 승인되면" 바뀌는 값입니다.

### 보고 제출에 더해진 값 (multipart)
| 이름 | 내용 |
|---|---|
| `photoPhases` | 사진마다 `before`(작업 전) / `after`(작업 후). `photos`와 같은 순서·같은 개수. 없으면 `after` |
| `rating` | 현장 관리자(현장을 만든 사람)만: 오늘 작업 평점 `0.5` ~ `5.0`, 소수점 한 자리. 다른 사람이 보내면 `403` |
| `materials` | 오늘 사용한 자재 JSON 문자열 `[{ "name": "타일", "quantity": 30, "unit": "장" }]` (같은 이름·단위는 합침) |

- 사진 장수 제한은 없습니다(한 번에 보내는 전체 용량만 서버 설정 200MB).
- 보고 응답: `rating`, `materialUsages: [{ name, quantity, unit }]`, `photos[].phase`

### 현장 자재 재고
```http
POST /api/sites            { ..., "materials": [{ "name": "타일", "quantity": 100, "unit": "장" }] }   (현장 만들 때, 선택)
PUT  /api/sites/{id}/materials   { "materials": [ ... ] }   (현장 총관리자만, 목록 전체를 이 값으로)
GET  /api/sites/{id}  → { ..., "materials": [{ "name", "quantity"(남은 양), "unit", "updatedAt" }] }
```
- 보고가 **승인되면** 그 보고의 `materials`만큼 재고에서 뺍니다(이름·단위가 같은 자재, 띄어쓰기·대소문자 무시, 0 아래로는 안 내려감).
- 승인된 보고를 지우면 뺀 양을 되돌립니다.
- DB: `site_materials`, `report_material_usages`, `reports.rating`, `reports.materials_applied_at`, `report_photos.phase`

---

## 4. 오류 응답

모든 오류는 같은 모양입니다. 상태는 HTTP 상태 코드로 구분합니다.
```json
{ "message": "가중치 합계가 100%가 되어야 해요. (지금 90%)" }
```
- 화면에는 `message`를 그대로 보여 주면 됩니다.
- 주요 상태 코드: `401` 로그인 필요, `403` 권한 없음, `404` 없음, `409` 충돌, `429` 너무 많이 틀림·너무 자주 요청,
  `503` 메일·문자·카카오 연결 실패 또는 설정 없음

---

## 5. 그 밖에 자주 쓰는 값

| 값 | 내용 |
|---|---|
| 진행률 계산 방식 `progressMode` | `manual`(직접 입력) / `auto`(공정 가중치 자동 계산) |
| 날짜·시각 | ISO 8601 문자열(UTC). 예: `2026-10-18T03:07:10Z` |
| id | 모두 문자열 |
