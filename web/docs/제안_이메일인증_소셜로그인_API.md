# 제안: 이메일 인증 · 소셜 로그인 API

작성: 웹(강건우) · 상태: **제안 (서버 담당 확인 필요)**

지금 서버에는 `POST /api/auth/signup`(이메일+비밀번호)만 있습니다.
앱·웹·서버가 같은 모양으로 만들도록 아래 모양을 제안합니다. 바꿀 부분은 표시해서 알려 주세요.
응답·오류 형식은 `docs/API_약속.md` 3번(로그인 응답)·4번(`{ message }`)을 그대로 따릅니다.

---

## 1. 이메일 인증 (가입할 때)

흐름: 이메일 입력 → **인증 코드 받기** → 메일로 온 6자리 입력 → **확인** → 가입하기

### 1-1. 인증 코드 보내기
```http
POST /api/auth/email/send
{ "email": "kim@example.com" }
```
```json
{ "expiresInSeconds": 300, "resendAfterSeconds": 60 }
```
- 6자리 숫자 코드를 메일로 보냄. 유효 5분
- 이미 가입된 이메일이면 `409` `{ "message": "이미 가입된 이메일입니다." }`
- 같은 이메일로 60초 안에 다시 보내면 `429`

### 1-2. 코드 확인
```http
POST /api/auth/email/verify
{ "email": "kim@example.com", "code": "482913" }
```
```json
{ "emailVerificationToken": "ev_9Kq...", "expiresInSeconds": 1800 }
```
- 틀리면 `400` `{ "message": "인증 코드가 맞지 않아요." }`, 만료면 `400` `{ "message": "인증 코드가 만료됐어요. 다시 받아 주세요." }`
- 5번 틀리면 그 코드는 무효(`429`), 다시 받아야 함

### 1-3. 가입 요청에 칸 하나 추가
```http
POST /api/auth/signup
{ ...지금과 같음, "emailVerificationToken": "ev_9Kq..." }
```
- 토큰이 없거나, 만료됐거나, 다른 이메일 것이면 `400` `{ "message": "이메일 인증을 완료해 주세요." }`

### 서버 참고
- 테이블 예: `email_verifications(id, email, code_hash, expires_at, attempts, verified_at)`, `users.email_verified_at`
- 메일 발송: `spring-boot-starter-mail` + Gmail SMTP(앱 비밀번호) 등. 계정 정보는 환경 변수(`MAIL_USERNAME`, `MAIL_PASSWORD`)
- **`test` 프로필(H2)에서는 메일을 보내지 않고 코드를 서버 로그에 찍기** → 메일 설정 없이 웹·앱 테스트 가능

---

## 2. 소셜 로그인 (카카오 · 구글)

비밀 키(client secret)는 서버에만 두는 **인가 코드 방식**입니다.

```
[웹] 카카오 로그인 버튼
  → 카카오 로그인 화면 (redirect_uri = {웹 주소}/oauth/kakao/callback)
  → 웹 콜백 화면이 code 를 받음
  → POST /api/auth/oauth/kakao { code, redirectUri }
  → (서버가 카카오에 code 를 보내 사용자 정보 받음)
  → ① 이미 연결된 계정: 로그인 응답 (API 약속 3번과 같은 모양)
     ② 처음 온 사람: { signupRequired: true, signupToken, email, name }
        → 웹이 가입 화면(역할·휴대폰·회사)을 보여 주고 signup 에 signupToken 을 같이 보냄
```

### 2-1. 소셜 로그인
```http
POST /api/auth/oauth/{provider}        provider = kakao | google
{ "code": "인가코드", "redirectUri": "http://localhost:5173/oauth/kakao/callback" }
```
이미 가입된 사람 → 로그인과 같은 응답
```json
{ "user": {}, "accessToken": "...", "refreshToken": "...", "tokenType": "Bearer", "accessTokenExpiresAt": "...", "refreshTokenExpiresAt": "..." }
```
처음 온 사람 → 가입 필요
```json
{ "signupRequired": true, "signupToken": "st_...", "provider": "kakao", "email": "kim@kakao.com", "name": "김현장" }
```
- `email`이 `null`일 수 있음(카카오는 비즈 앱이 아니면 이메일을 못 받을 수 있음) → 그때는 가입 화면에서 이메일 입력 + 1번 이메일 인증
- 같은 이메일로 이미 이메일 가입한 계정이 있으면 `409` `{ "message": "이미 이메일로 가입된 계정이에요. 이메일로 로그인해 주세요." }` (자동 연결은 하지 않음 → 계정 탈취 방지)
- 앱은 카카오 SDK가 주는 토큰을 쓰므로 `{ "accessToken": "카카오 토큰" }`도 받게 하면 앱·웹이 같은 API를 씀

### 2-2. 소셜 가입
```http
POST /api/auth/signup
{ "role": "worker", "name": "김현장", "phone": "010-...", "signupToken": "st_...", "company": null, "companyCode": null }
```
- `signupToken`이 있으면 `password`는 필요 없음. 소셜에서 받은 이메일은 인증된 것으로 봄(이메일이 없었으면 `email` + `emailVerificationToken` 필요)
- `signupToken` 유효 10분

### 서버 참고
- 테이블 예: `user_social_accounts(id, user_id, provider, provider_user_id, email, created_at)` UNIQUE(`provider`, `provider_user_id`)
- `users.password_hash`를 NULL 허용으로 변경(소셜 전용 계정)
- 환경 변수: `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `/api/auth/email/**`, `/api/auth/oauth/**`는 로그인 없이 호출 가능하게 SecurityConfig에 추가

---

## 3. 미리 준비해야 하는 것 (코드 밖)

| 할 일 | 내용 |
|---|---|
| 카카오 개발자 앱 등록 | developers.kakao.com → 앱 만들기 → REST API 키, Client Secret, 카카오 로그인 켜기, Redirect URI 등록 (`http://localhost:5173/oauth/kakao/callback` + 발표 서버 주소), 동의 항목(닉네임, 이메일) |
| 구글 OAuth 클라이언트 | Google Cloud Console → OAuth 동의 화면 → 사용자 인증 정보(웹 애플리케이션) → 승인된 리디렉션 URI 같은 방식으로 등록 |
| 메일 보낼 계정 | 팀 Gmail 하나 + 앱 비밀번호 (2단계 인증 필요) |

키는 깃허브에 올리지 않고 각자 `.env`/환경 변수로 받습니다. 웹에는 공개 키인 Client ID만 들어갑니다(`VITE_KAKAO_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`).

## 4. 정해 줘야 할 것

1. 소셜은 **카카오 · 구글** 두 개로 충분한지 (네이버 추가 여부)
2. 위 API 모양 그대로 가도 되는지, 바꿀 부분
3. 카카오/구글 앱 등록과 메일 계정은 누가 만들지
4. 이메일 인증을 **필수**로 할지 (필수면 기존 데모 계정은 인증된 것으로 처리)
