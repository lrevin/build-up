# 휴대폰 알림 (FCM)

보고·자재 요청이 생기면 관계된 사람의 휴대폰으로 알림을 보냅니다.
**앱과 서버 코드는 다 만들어져 있고, Firebase 설정 파일 두 개만 넣으면 켜집니다.**
파일이 없으면 서버·앱 모두 알림만 건너뛰고 나머지 기능은 그대로 동작해요.

이 폴더는 알림 관련 코드만 모아 둔 **사본**입니다. 실제로 돌아가는 원본은 아래 위치에 있어요.
코드를 고칠 때는 원본을 고치고, 이 폴더도 같이 맞춰 주세요.

| 이 폴더 | 원본 위치 | 하는 일 |
|---|---|---|
| `server/PushService.java` | `api/server/src/main/java/com/buildup/server/push/` | Firebase 연결, 알림 보내기, 못 받는 기기 주소 정리 |
| `server/Notices.java` | 〃 | 언제·누구에게·어떤 문구로 보낼지 |
| `server/PushController.java` | 〃 | `POST /api/push/token`, `DELETE /api/push/token` |
| `server/DeviceToken.java`, `DeviceTokenRepository.java` | 〃 | `device_tokens` 표 (V11 설계 그대로) |
| `app/push.ts` | `api/push.ts` | 로그인 때 등록, 로그아웃 때 삭제, 알림 받기 |
| `app/index.js` | 앱 맨 위 `index.js` | 앱이 꺼져 있을 때 온 알림 처리 |

앱 쪽 연결부: `app/App.tsx`의 `PushBridge`(로그인하면 등록, 알림 누르면 해당 화면 열기),
`api/buildup.ts`의 로그아웃(`unregisterPush`).

## 알림이 가는 경우

| 언제 | 받는 사람 | 제목 예 |
|---|---|---|
| 보고 제출 | 현장 총관리자 + 연결된 본사 관계자 (보낸 본인 제외) | `새 현장 보고 · 한빛 오피스텔 신축공사` |
| 승인 / 보완 요청 | 보고한 사람 | `보고 승인 · …` / `보완 요청 · …` |
| 보완 후 다시 올림 | 보완을 요청한 사람 | `보완 완료 · …` |
| 자재 요청 | 현장 총관리자 + 본사 관계자 | `자재 요청 · …` / `긴급 자재 요청 · …` |
| 자재 승인 / 반려 | 요청한 사람 | `자재 요청 승인 · …` / `자재 요청 반려 · …` |

알림에는 `type`(report | material), `siteId`, `siteName`이 같이 가서, 누르면 앱이 그 현장의 보고·자재 화면을 엽니다.

## 켜는 방법

### 1. Firebase 프로젝트 만들기
1. https://console.firebase.google.com → **프로젝트 추가** (이름 예: `buildup`, 애널리틱스는 꺼도 됨)
2. **Android 앱 추가** → 패키지 이름 `com.buildupapp` (다르면 알림이 안 와요)

### 2. 앱 설정 파일 `google-services.json`
- Android 앱 추가 화면에서 내려받아 앱 프로젝트의 `android/app/google-services.json`에 넣기
- 이미 준비된 것(따로 할 일 없음)
  - `android/build.gradle`: `classpath("com.google.gms:google-services:4.4.3")`
  - `android/app/build.gradle`: 파일이 있을 때만 `com.google.gms.google-services` 적용
  - `package.json`: `@react-native-firebase/app`, `@react-native-firebase/messaging`
  - `AndroidManifest.xml`: `POST_NOTIFICATIONS` 권한(안드로이드 13 이상 알림 허락)
- 넣은 뒤에는 앱을 **다시 빌드**해야 해요: `npx react-native run-android`

### 3. 서버 키 파일 `firebase-key.json`
- Firebase 콘솔 ⚙ **프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성**
- 받은 파일 이름을 `firebase-key.json`으로 바꿔서
  - 내 PC: 서버 폴더 맨 위(`api/server/firebase-key.json`)
  - 배포 서버: `/opt/buildup/firebase-key.json` (권한 600), 환경 변수 `FIREBASE_KEY=/opt/buildup/firebase-key.json`
- 설정 이름: `buildup.firebase-key` (기본값 `firebase-key.json`)
- 서버 의존성: `com.google.firebase:firebase-admin:9.9.0` (build.gradle에 이미 있음)

> **두 파일 모두 깃허브에 올리면 안 됩니다.** 특히 `firebase-key.json`은 우리 이름으로 알림을 보낼 수 있는 열쇠예요.
> 둘 다 `.gitignore`에 들어 있어요.

### 4. 확인
1. 서버를 켜면 로그에 `알림 켜짐: Firebase 연결 완료`가 나와야 해요.
   (`알림 꺼짐: Firebase 키 파일이 없습니다`가 나오면 파일 위치 확인)
2. 앱에서 로그인 → 알림 허용 → DB `device_tokens` 표에 한 줄이 생겼는지 확인
3. 다른 계정(예: 작업자)으로 보고를 올리면, 현장 관리자 휴대폰에 `새 현장 보고` 알림이 와야 해요.
   - 에뮬레이터는 **Google Play가 들어간 이미지**여야 알림을 받아요.
   - 앱을 보고 있을 때 온 알림은 화면 위에 잠깐 뜨는 안내로 보여요.

## 막힐 때

| 증상 | 확인할 것 |
|---|---|
| `device_tokens`에 아무것도 안 생김 | `google-services.json` 위치, 앱 다시 빌드했는지, 알림 허용했는지, 앱이 서버 모드인지(데모 모드는 알림 안 씀) |
| 등록은 되는데 알림이 안 옴 | 서버 로그 `알림 보내기 실패`, 키 파일이 같은 Firebase 프로젝트 것인지 |
| 같은 휴대폰으로 다른 계정 로그인 | 정상: 그 휴대폰은 새 계정 쪽으로 옮겨져요 |
| 계정당 휴대폰 10대 넘음 | `알림을 받을 휴대폰은 10대까지` 오류 (일부러 막아 둠) |
