# 2주차 발표 화면 순서

발표 대본 순서대로 번호를 붙였습니다. 파일 이름을 누르면 해당 줄로 바로 이동합니다.

| 순서 | 보여줄 화면 | 볼 줄 |
|---|---|---|
| 0 | 계획서 표지 | (계획서 파일) |
| 0 | [database/security 폴더](../../database/security) | 폴더 목록 |
| 1 | [01_SecurityConfig.java](01_SecurityConfig.java#L46-L59) | 46~59 · 로그인 없이 쓰는 주소와 로그인이 필요한 주소 나누기 |
| 2 | [02_RefreshTokenService.java](02_RefreshTokenService.java#L40-L77) | 40~77 · `issue` 발급, `validate` 확인, `revoke` 폐기 |
| 3 | [03_PasswordConfig.java](03_PasswordConfig.java#L12-L14) | 13 · `BCryptPasswordEncoder` |
| 4 | [04_V9__align_schema_with_mobile_app.sql](04_V9__align_schema_with_mobile_app.sql#L4-L19) | 4~19 · 현장 `work_type`, 보고 `work` 추가 |
| - | 앱 시연 | 공사 현장 추가 → 관리자 → 공사 종류 검색(화장실, 샷시) → 직접 입력 |
| 5 | [05_workTypes.ts](05_workTypes.ts#L17) | 17 · 공사 종류 목록 시작, 62 · 수도 공사 |
| - | 앱 시연 | 현장 들어가기 → 보고 작성(진행한 작업 입력, 진행률) |
| 6 | [06_ReportScreen.tsx](06_ReportScreen.tsx#L581-L600) | 581~600 · 진행한 작업 입력칸 |
| 7 | [07_2주차_진행_보고서.pdf](07_2주차_진행_보고서.pdf) | 다음주 작업 예정 사항 |

원본 위치: `database/security/…`, `database/migrations/…`, `app/…` (여기 있는 파일은 발표용 복사본입니다)
