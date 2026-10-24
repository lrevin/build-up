# Build Up 서버 (Spring Boot)

앱(`app/`)과 본사 웹 대시보드(`web/`)가 함께 쓰는 API 서버입니다.
주고받는 값은 [`docs/API_약속.md`](../../docs/API_약속.md)를 따릅니다.

- Java 17 · Spring Boot 4 · Spring Security(JWT + Refresh Token) · JPA · MySQL 8
- DB 구조: `database/`의 V1~V11 설계를 Flyway로 그대로 적용 (`src/main/resources/db/migration`)
- 사진·첨부: 서버 폴더 또는 AWS S3 (`buildup.storage=local | s3`)
- 휴대폰 알림: Firebase(FCM) — `firebase-key.json`이 있을 때만 켜짐
- API 문서: 서버를 켠 뒤 `http://localhost:8080/swagger-ui.html`

## 폴더 구조

```
src/main/java/com/buildup/server/
├─ auth/      로그인·회원가입, JWT 접근 토큰, Refresh Token
├─ user/      사용자, 역할(worker / admin / hq / system)
├─ site/      현장, 참여 코드, 참여자, 진행률 계산 방식(직접 입력 / 공정 가중치 자동 계산)
├─ report/    보고(사진·첨부·촬영 정보), 검토(승인·보완 요청), 파일 저장소(로컬 / S3)
├─ material/  자재 요청, 승인·반려
├─ hq/        본사, 본사 화면용 API
├─ export/    작업일보 엑셀 내려받기
├─ push/      휴대폰 알림(FCM)
├─ system/    시스템 관리자(통계, 계정 사용 중지)
├─ seed/      데모 데이터(테스트 계정)
├─ config/    보안·CORS·API 문서 설정
└─ common/    오류 응답, 시도 횟수 제한 등 공통
src/main/resources/   application.properties(기본), application-prod.properties(배포)
src/main/resources/db/migration/   Flyway 마이그레이션 V1~V11 (database/migrations와 같은 파일)
src/test/             자동 테스트(JUnit, H2 메모리 DB)
deploy/               AWS EC2·RDS·S3 배포 안내, Nginx·자동 실행 설정 예시
```

## 내 컴퓨터에서 실행

1. MySQL 8에 빈 `buildup_team` 데이터베이스와 `buildup` 사용자를 만든다.
   ```sql
   CREATE DATABASE buildup_team DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   GRANT ALL PRIVILEGES ON buildup_team.* TO 'buildup'@'localhost';
   ```
   표는 직접 만들지 않아요. 서버를 켜면 Flyway가 V1~V11을 차례로 적용하고,
   JPA는 표 구조가 코드와 맞는지만 확인해요(`ddl-auto=validate`).
2. `src/main/resources/application-local.properties`를 만들고 아래처럼 적는다. **이 파일은 깃허브에 올리지 않는다.**
   ```properties
   spring.datasource.password=내_DB_비밀번호
   buildup.jwt-secret=32자_이상_아무_문자열
   ```
3. 실행
   ```bash
   ./gradlew bootRun
   ```
   - `application-local.properties`는 기본으로 같이 읽어요(`spring.profiles.active=local`).
   - 처음 켜면 데모 데이터가 들어가요. 테스트 계정 비밀번호는 모두 `1234`예요.
   - 본사 `hq@buildup.kr`, 관리자 `admin@buildup.kr`, 작업자 `worker@buildup.kr`
4. 자동 테스트: `./gradlew test` (MySQL 없이 메모리 DB로 돌아가요)

## DB 구조를 바꿀 때

1. `database/migrations`에 다음 번호(`V12__...sql`)로 새 파일을 만든다. 이미 적용된 V1~V11 파일은 고치지 않는다.
2. 같은 파일을 `api/server/src/main/resources/db/migration`에도 넣는다.
3. 엔티티를 바꾸고 서버를 켜서 Flyway 적용·구조 확인이 통과하는지 본다.

## 앱·웹 연결

| 클라이언트 | 서버 주소 |
|---|---|
| 앱(에뮬레이터) | 앱 로그인 화면 아래 **변경** → 서버 연결 → `http://10.0.2.2:8080/api` |
| 앱(실제 폰) | 같은 와이파이에서 `http://내PC의IP:8080/api` |
| 웹(`web/`) | `.env.local`에 `VITE_USE_DUMMY=false` → `npm run dev` (`/api`는 8080으로 전달) |

배포는 [`deploy/DEPLOY.md`](deploy/DEPLOY.md)를 참고하세요.
