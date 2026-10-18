# BuildUp Data Dictionary

이 문서는 **BuildUp Flyway V1~V9 기준** 주요 테이블과 컬럼의 의미를 협업용으로 정리한 데이터 사전입니다.

> 정확한 타입, 제약조건, 인덱스의 최종 기준은 각 Flyway migration SQL 파일입니다.

---

## 1. companies

회사 기본 정보를 저장합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | 회사 PK |
| `name` | 회사명 |
| `code` | 회사 식별 코드, UNIQUE |
| `created_at` | 회사 생성 시각 |

### 관계
- `users.hq_company_id`
- `users.manager_company_id`
- `company_memberships.company_id`
- `sites.company_id`

---

## 2. users

사용자 계정 및 기본 프로필 정보를 저장합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | 사용자 PK |
| `name` | 사용자 이름 |
| `email` | 로그인/식별용 이메일, UNIQUE |
| `phone` | 연락처 |
| `role` | 기본 사용자 역할 |
| `company` | 기존 호환용 회사 표시값 |
| `hq_company_id` | 본사 회사 FK |
| `manager_company_id` | 관리 회사 FK |
| `password_hash` | BCrypt 해시 비밀번호 |
| `created_at` | 계정 생성 시각 |

### 관계
여러 업무 테이블에서 작성자·요청자·처리자·검토자 등으로 참조됩니다.

---

## 3. company_memberships

사용자와 회사의 소속 관계를 관리합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | PK |
| `company_id` | 소속 회사 FK |
| `user_id` | 사용자 FK |
| `role` | 회사 내 역할 |
| `status` | 소속 상태 |
| `joined_at` | 소속 시작 시각 |

### 제약
- UNIQUE: `(company_id, user_id)`

---

## 4. refresh_tokens

Access Token 재발급에 사용하는 Refresh Token의 서버 저장 정보를 관리합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | PK |
| `user_id` | 토큰 소유 사용자 FK |
| `token_hash` | Refresh Token 원문이 아닌 해시값 |
| `expires_at` | 만료 시각 |
| `revoked_at` | 폐기 시각, 미폐기 상태면 NULL |
| `created_at` | 발급 시각 |

### 제약
- `token_hash` UNIQUE
- 사용자·폐기·만료 조건 조회용 인덱스 존재

---

## 5. legacy_auth_tokens

초기 인증 구조의 토큰 테이블을 보존한 레거시 테이블입니다.

| 컬럼 | 의미 |
|---|---|
| `token` | 기존 토큰 PK |
| `user_id` | 사용자 FK |
| `created_at` | 생성 시각 |

신규 인증은 `refresh_tokens` 중심으로 사용합니다.

---

## 6. device_tokens

푸시 알림 전송을 위한 디바이스 토큰을 저장합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | PK |
| `token` | 디바이스 토큰, UNIQUE |
| `user_id` | 사용자 FK |
| `updated_at` | 마지막 갱신 시각 |

---

## 7. sites

건설/인테리어 현장의 기본 정보를 저장합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | 현장 PK |
| `name` | 현장명 |
| `address` | 현장 주소 |
| `work_type` | 공사 유형 |
| `owner_id` | 현장 생성/소유 사용자 FK |
| `code` | 현장 참여 코드, UNIQUE |
| `created_at` | 현장 생성 시각 |
| `company_id` | 연결 회사 FK, NULL 가능 |
| `latitude` | 현장 기준 위도 |
| `longitude` | 현장 기준 경도 |

### V9
- `work_type`
- `latitude`
- `longitude`

추가.

---

## 8. site_members

사용자와 현장의 참여 관계를 관리합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | PK |
| `site_id` | 현장 FK |
| `user_id` | 사용자 FK |
| `member_role` | 현장 내 역할 |
| `status` | 참여 상태 |
| `joined_at` | 참여 시각 |

### 제약
- UNIQUE: `(site_id, user_id)`
- 현장 owner는 membership에도 `OWNER`로 보장

---

## 9. site_processes

현장별 공정 정보를 관리합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | 공정 PK |
| `site_id` | 현장 FK |
| `process_key` | 현장 내 공정 식별 키 |
| `name` | 공정명 |
| `weight` | 전체 진행률 계산 시 가중치 |
| `progress` | 현재 공정 진행률 |
| `last_reported_at` | 마지막 보고 시각 |
| `plan_start` | 계획 시작일 |
| `plan_end` | 계획 종료일 |
| `sort_order` | 화면/기본 정렬 순서 |

### 제약
- UNIQUE: `(site_id, process_key)`

---

## 10. reports

현장 작업 보고서를 저장합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | 보고서 PK |
| `site_id` | 현장 FK |
| `process_key` | 관련 공정 키, V9부터 NULL 가능 |
| `process_name` | 관련 공정명, V9부터 NULL 가능 |
| `work` | 사용자가 직접 입력한 작업 내용 |
| `from_progress` | 보고 전 진행률 |
| `to_progress` | 보고 후 진행률 |
| `memo` | 작업 메모 |
| `weather` | 날씨 |
| `workers` | 작업 인원 |
| `equipment` | 사용 장비 |
| `submit_latitude` | 보고 제출 위치 위도 |
| `submit_longitude` | 보고 제출 위치 경도 |
| `submit_accuracy` | 제출 위치 정확도 |
| `author_id` | 작성 사용자 FK |
| `review_status` | 검토 상태: `PENDING`(검토 대기) / `APPROVED`(승인) / `REVISION`(보완 요청). API에서는 소문자 |
| `created_at` | 생성 시각 |
| `updated_at` | 수정 시각 |

### V9
- `work`
- `submit_latitude`
- `submit_longitude`
- `submit_accuracy`

추가.
- `process_key`, `process_name` NULL 허용

---

## 11. report_photos

보고서에 첨부된 현장 사진의 메타데이터를 저장합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | 사진 PK |
| `report_id` | 보고서 FK |
| `position` | 보고서 내 사진 순서 |
| `file_name` | 기존 API 호환용 파일명 |
| `s3_key` | S3 객체 키 |
| `original_name` | 업로드 원본 파일명 |
| `content_type` | MIME 타입 |
| `size_bytes` | 파일 크기 |
| `taken_at` | 사진 촬영 시각 |
| `latitude` | 사진 촬영 위도 |
| `longitude` | 사진 촬영 경도 |
| `created_at` | 등록 시각 |

### 제약
- UNIQUE: `(report_id, position)`
- `s3_key` UNIQUE
- `s3_key`는 기존 데이터 호환을 위해 NULL 가능

### S3 원칙
DB에는 전체 URL이나 Presigned URL이 아니라 **변하지 않는 `s3_key`**를 저장합니다.

---

## 12. report_files

보고서의 일반 첨부파일(PDF, Excel 등) 메타데이터를 저장합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | 첨부파일 PK |
| `report_id` | 보고서 FK |
| `position` | 보고서 내 파일 순서 |
| `path` | 기존 API 호환용 경로 |
| `s3_key` | S3 객체 키 |
| `original_name` | 원본 파일명 |
| `content_type` | MIME 타입 |
| `size_bytes` | 파일 크기 |
| `created_at` | 등록 시각 |

### 제약
- UNIQUE: `(report_id, position)`
- `s3_key` UNIQUE
- `s3_key`는 기존 데이터 호환을 위해 NULL 가능

---

## 13. report_review_events

보고서 승인/반려 등 검토 이력을 저장합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | 검토 이력 PK |
| `report_id` | 대상 보고서 FK |
| `reviewer_id` | 검토 사용자 FK |
| `status` | 승인/반려 등 상태 |
| `comment` | 검토 의견 |
| `created_at` | 처리 시각 |

현재 보고서 상태는 `reports.review_status`, 이력은 이 테이블에서 관리합니다.

---

## 14. report_checks

보고서 제출 당시 자동 검사에서 발견된 확인 항목을 저장합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | 검사 결과 PK |
| `report_id` | 대상 보고서 FK |
| `position` | 표시 순서 |
| `check_type` | 검사 종류 |
| `message` | 사용자/관리자에게 보여줄 설명 |
| `created_at` | 검사 결과 생성 시각 |

### 용도 예시
- 오래된 사진
- 현장과 먼 위치에서 제출
- 사진 위치가 현장과 다름
- 위치정보 누락

### 제약
- UNIQUE: `(report_id, position)`
- 보고서 삭제 시 `ON DELETE CASCADE`

---

## 15. material_requests

현장에서 요청한 자재 정보를 저장합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | 자재 요청 PK |
| `site_id` | 현장 FK |
| `process_key` | 관련 공정 키, V9부터 NULL 가능 |
| `process_name` | 관련 공정명, V9부터 NULL 가능 |
| `needed_by` | 필요 예정일 |
| `urgent` | 긴급 요청 여부 |
| `note` | 요청 메모 |
| `status` | 요청 처리 상태 |
| `reject_reason` | 반려 사유 |
| `author_id` | 요청 사용자 FK |
| `created_at` | 요청 생성 시각 |

---

## 16. material_request_items

하나의 자재 요청에 포함된 품목 목록입니다.

| 컬럼 | 의미 |
|---|---|
| `request_id` | 자재 요청 FK |
| `position` | 품목 순서 |
| `name` | 자재명 |
| `quantity` | 요청 수량 |
| `unit` | 단위 |

### 제약
- UNIQUE: `(request_id, position)`

---

## 17. material_request_events

자재 요청의 상태 변경 이력을 저장합니다.

| 컬럼 | 의미 |
|---|---|
| `request_id` | 자재 요청 FK |
| `position` | 이벤트 순서 |
| `status` | 변경된 상태 |
| `actor` | 당시 처리자 표시 문자열 |
| `actor_user_id` | 실제 사용자 FK, NULL 가능 |
| `by_hq` | 본사 처리 여부 |
| `at` | 처리 시각 |

### 제약
- UNIQUE: `(request_id, position)`

`actor`는 당시 표시값을 보존하고, `actor_user_id`는 사용자 관계를 연결하기 위해 사용합니다.

---

## 18. notifications

앱 내부 알림을 저장합니다.

| 컬럼 | 의미 |
|---|---|
| `id` | 알림 PK |
| `user_id` | 수신 사용자 FK |
| `site_id` | 관련 현장 FK, NULL 가능 |
| `type` | 알림 종류 |
| `title` | 알림 제목 |
| `message` | 알림 내용 |
| `reference_type` | 연결 대상 종류 |
| `reference_id` | 연결 대상 ID |
| `read_at` | 읽은 시각 |
| `created_at` | 생성 시각 |

---

## 주요 UNIQUE 제약 요약

| 대상 | UNIQUE |
|---|---|
| `companies` | `code` |
| `users` | `email` |
| `company_memberships` | `(company_id, user_id)` |
| `refresh_tokens` | `token_hash` |
| `sites` | `code` |
| `site_members` | `(site_id, user_id)` |
| `site_processes` | `(site_id, process_key)` |
| `report_photos` | `(report_id, position)`, `s3_key` |
| `report_files` | `(report_id, position)`, `s3_key` |
| `report_checks` | `(report_id, position)` |
| `material_request_items` | `(request_id, position)` |
| `material_request_events` | `(request_id, position)` |
| `device_tokens` | `token` |