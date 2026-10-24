# BuildUp Data Dictionary (V1~V11)

현재 엔티티와 Flyway V11을 기준으로 한 협업용 요약입니다. 정확한 컬럼 타입과 제약조건은 `database/migrations/`의 SQL이 최종 기준입니다.

| 테이블 | 역할 | 핵심 컬럼·제약 |
|---|---|---|
| `companies` | 회사 | `id`, `name`, UNIQUE `code`, `created_at` |
| `users` | 사용자 계정 | `id`, `name`, UNIQUE `email`, `phone`, `role`, `password_hash`, `created_at` |
| `company_memberships` | 사용자-회사 소속 | FK `company_id`, `user_id`, `role`, `status`, UNIQUE `(company_id,user_id)` |
| `refresh_tokens` | 서버 측 Refresh Token | FK `user_id`, UNIQUE `token_hash`, `expires_at`, `revoked_at`, `created_at` |
| `device_tokens` | 푸시 기기 토큰 | FK `user_id`, UNIQUE `token`, `updated_at` |
| `sites` | 현장 | FK `owner_id`, 선택 FK `company_id`, `work_type`, 위치, `progress_calculation_mode`, UNIQUE `code` |
| `site_members` | 현장 구성원 | FK `site_id`, `user_id`, `member_role`, `status`, UNIQUE `(site_id,user_id)` |
| `site_processes` | 현장별 공정 | FK `site_id`, `process_key`, `name`, `weight`, `progress`, 일정, UNIQUE `(site_id,process_key)` |
| `notifications` | 사용자 알림 | FK `user_id`, 선택 FK `site_id`, `type`, 내용, 참조 대상, `read_at` |
| `reports` | 작업 보고서 | FK `site_id`, `author_id`, 선택 공정 스냅샷, 필수 `work`, 진행률, 검토 상태, 제출 위치 |
| `report_photos` | S3 사진 메타데이터 | FK `report_id`, UNIQUE `s3_key`, `original_name`, MIME, 크기, 촬영 시각·위치 |
| `report_files` | S3 일반 첨부 메타데이터 | FK `report_id`, `path` 또는 `s3_key`, 원본명, MIME, 크기 |
| `report_review_events` | 보고서 검토 이력 | FK `report_id`, `reviewer_id`, `status`, `comment`, `created_at` |
| `report_checks` | 보고서·사진 검사 결과 | FK `report_id`, 선택 FK `photo_id`, `check_type`, `message`, UNIQUE `(report_id,position)` |
| `material_requests` | 자재 요청 | FK `site_id`, `author_id`, 선택 공정 스냅샷, 필요일, 긴급 여부, 소문자 `status`, 반려 사유 |
| `material_request_items` | 요청 품목 | FK `request_id`, 양수 `quantity`, UNIQUE `(request_id,position)` |
| `material_request_events` | 요청 상태 이력 | FK `request_id`, 필수 FK `actor_user_id`, 소문자 `status`, UNIQUE `(request_id,position)` |

## 주요 값 규칙

- 현장 진행률 방식: `PROCESS_WEIGHTED`, `MANUAL_INPUT`
- 보고서 검토 상태(DB): `PENDING`, `APPROVED`, `REVISION`
- 자재 요청 상태(DB/API): `requested`, `approved`, `rejected`, `ordered`, `delivered`
- 공정 스냅샷: `process_key`와 `process_name`은 함께 존재하거나 함께 비웁니다.
- 위치: 위도·경도는 함께 존재해야 하며 각각 `-90~90`, `-180~180` 범위입니다.
- 진행률·가중치·파일 크기·품목 수량은 V11의 최소 범위 `CHECK`를 적용합니다.

## 삭제 및 저장 원칙

- 회사 소속은 `company_memberships`만 사용합니다.
- 업무 데이터 외래키는 기본적으로 삭제를 제한하고, 보고서 검사처럼 완전한 종속 데이터만 연쇄 삭제합니다.
- S3 객체 삭제는 DB 연쇄 삭제가 아니라 애플리케이션 서비스가 처리합니다.
- DB에는 Presigned URL이나 AWS 인증정보를 저장하지 않고 S3 객체 키만 저장합니다.
