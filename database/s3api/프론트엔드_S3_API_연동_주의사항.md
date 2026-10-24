# 프론트엔드-S3 API 연동 및 기능 안내

## 1. 공통 구조와 원칙

### 저장 구조

- S3 버킷은 비공개이며 프론트엔드는 S3에 직접 접근하지 않습니다.
- 프론트엔드는 JWT로 인증된 백엔드 API를 통해 파일을 업로드·조회·삭제합니다.
- 실제 파일은 S3에 저장하고 DB에는 원본 파일명, 형식, 크기, 순서, S3 Key 등의 메타데이터를 저장합니다.

### 프론트엔드의 역할

- 백엔드 엔티티와 화면 모델을 동일하게 만들 필요는 없습니다.
- 앱과 웹은 각자의 API 연결 계층에서 백엔드 응답을 화면에 필요한 형태로 변환합니다.
- 실제 URL, HTTP 메서드, 요청 형식, 응답 필드의 의미와 인증 방식은 백엔드 계약과 일치해야 합니다.
- 웹 주소는 서버의 CORS 허용 목록에 등록해야 합니다. 네이티브 모바일 앱은 브라우저 CORS의 직접적인 적용 대상이 아닙니다.
- 프론트엔드는 API 기본 주소와 사용자 Access Token만 사용합니다. AWS 자격 증명, DB 비밀번호, JWT 서명 비밀키를 코드나 환경 파일에 넣으면 안 됩니다.

## 2. 보고서 제출과 파일 업로드 흐름

사용자는 한 화면에서 보고서 내용, 사진, 첨부파일을 모두 준비하고 제출 버튼을 한 번 누릅니다. 프론트엔드는 하나의 로딩 상태를 유지하면서 다음 요청을 순서대로 실행합니다.

1. `POST /api/sites/{siteId}/reports`로 보고서 JSON 생성
2. 응답의 `id`를 `reportId`로 저장
3. 사진은 단일 또는 다중 업로드 API로 전송
4. 첨부파일은 단일 또는 다중 업로드 API로 전송
5. `GET /api/reports/{reportId}`로 완성된 보고서 조회

API가 여러 개여도 중간에 화면을 이동할 필요는 없습니다. 제출 중에는 버튼을 비활성화하고 전체 파일 수와 완료 개수를 하나의 로딩 화면에 표시할 수 있습니다.

여러 파일을 한 번에 전송하려면 `photos/batch`, `files/batch` API를 사용합니다. 파일별 성공·실패와 개별 재시도가 더 중요하면 기존 단일 업로드 API를 반복 호출할 수 있습니다.

## 3. 보고서 API

### API 목록

| 기능 | API | 주요 결과 |
|---|---|---|
| 보고서 생성 | `POST /api/sites/{siteId}/reports` | `201 Created`, 생성된 보고서 |
| 보고서 전체 목록 | `GET /api/sites/{siteId}/reports` | 보고서 목록 |
| 보고서 커서 목록 | `GET /api/sites/{siteId}/reports/page` | `{ items, nextCursor, total }` |
| 보고서 상세 | `GET /api/reports/{reportId}` | 사진·파일을 포함한 보고서 상세 |
| 보고서 메모 수정 | `PATCH /api/reports/{reportId}` | 수정된 보고서 상세 |
| 보고서 삭제 | `DELETE /api/reports/{reportId}` | `204 No Content` |

### 보고서 생성 요청

보고서 생성 요청은 사진과 첨부파일이 없는 JSON입니다.

| 필드 | 사용 기준 |
|---|---|
| `work` | 진행한 작업. 직접 입력 방식에서는 필수 |
| `processKey` | 자동 계산 현장에서 선택한 공정 키 |
| `to` | 직접 입력 현장의 전체 목표 진행률 |
| `processTo` | 자동 계산 현장의 선택 공정 목표 진행률 |
| `memo` | 보고서 메모 |
| `workLog` | `weather`, `workers`, `equipment` 객체 |
| `location` | `latitude`, `longitude`, `accuracy` 객체 |

화면에서 선택한 사진과 첨부파일은 보고서 JSON에 넣지 않고 보고서 생성 후 각 업로드 API로 전송합니다.

### 보고서 응답 활용

| 백엔드 응답 | 기능 및 화면 사용 기준 |
|---|---|
| `fromProgress`, `toProgress` | 보고 대상의 이전·목표 진행률 |
| `authorName`, `authorId` | 작성자 표시와 식별 |
| `weather`, `workers`, `equipment` | 보고서의 당일 작업 정보로 묶어 표시 가능 |
| `submitLatitude`, `submitLongitude`, `submitAccuracy` | 제출 위치 표시 |
| `photos`, `files` | 파일 목록과 인증된 `contentUrl` 제공 |
| `reviewStatus`, `reviewEvents` | 현재 검토 상태와 검토 이력 |
| `checks` | 사진·위치 관련 경고 표시 |
| `canEdit`, `canDelete`, `canReview` | 수정·삭제·검토 버튼 표시 기준 |

직접 입력 현장의 `fromProgress/toProgress`는 전체 진행률이고 자동 계산 현장에서는 선택 공정의 진행률입니다. 현장의 현재 전체 진행률은 현장 응답의 `overallProgress`를 사용합니다.

### 커서 목록

첫 요청은 `cursor` 없이 호출합니다.

```http
GET /api/sites/{siteId}/reports/page?size=30
```

응답의 `items`는 이번 보고서 목록, `nextCursor`는 다음 조회 위치, `total`은 첫 요청의 전체 보고서 수입니다. 다음 요청에는 받은 값을 해석하지 않고 그대로 전달합니다.

```http
GET /api/sites/{siteId}/reports/page?cursor={nextCursor}&size=30
```

`nextCursor`가 `null`이면 더 가져올 보고서가 없습니다.

### 메모 수정과 보고서 삭제

- 메모 수정 요청: `{ "memo": "수정 내용" }`
- 작성자만 `pending` 또는 `revision` 상태에서 메모를 수정할 수 있습니다.
- `revision` 상태에서 수정하면 보고서는 다시 `pending` 상태가 됩니다.
- 보고서 전체를 삭제하면 연결된 사진과 첨부파일의 S3 객체도 함께 정리됩니다.

## 4. 사진 API

### API 목록

| 기능 | API | 성공 결과 |
|---|---|---|
| 사진 업로드 | `POST /api/reports/{reportId}/photos` | `201 Created`, 사진 정보 |
| 사진 다중 업로드 | `POST /api/reports/{reportId}/photos/batch` | `201 Created`, 사진 정보 배열 |
| 사진 교체 | `PUT /api/reports/{reportId}/photos/{photoId}` | 교체된 사진 정보 |
| 사진 목록 | `GET /api/reports/{reportId}/photos` | 사진 배열 |
| 사진 내용 조회 | `GET /api/reports/{reportId}/photos/{photoId}/content` | 이미지 바이트 |
| 사진 삭제 | `DELETE /api/reports/{reportId}/photos/{photoId}` | `204 No Content` |

### 업로드 요청

- 요청 형식: `multipart/form-data`
- 파일 파트 이름: `file`
- 선택값: `takenAt`, `latitude`, `longitude`
- 촬영 위치는 위도와 경도를 함께 보내야 합니다.
- 앱의 파일 URI와 웹의 `File` 객체를 FormData로 만드는 방식만 다릅니다.

### 다중 업로드

- 요청 형식: `multipart/form-data`
- 파일 파트 이름: `files`를 파일 수만큼 반복
- 전체 요청 최대 크기 기본값: 50MB
- 기존 사진과 새 사진의 합이 20장을 넘으면 `409 Conflict`가 반환됩니다.
- 한 파일이라도 검증·업로드에 실패하면 요청 전체가 실패하고, 앞에서 업로드된 객체도 정리됩니다.

사진별 촬영 정보가 필요하면 `metadata` JSON 파트를 선택적으로 추가합니다. `items`의 개수와 순서는 `files`와 일치해야 합니다.

```json
{
  "items": [
    {
      "takenAt": "2026-10-09T05:30:00Z",
      "latitude": 37.5665,
      "longitude": 126.9780
    },
    {
      "takenAt": null,
      "latitude": null,
      "longitude": null
    }
  ]
}
```

`metadata`를 보내지 않으면 모든 사진의 촬영 시각과 위치는 비어 있는 상태로 등록됩니다.

### 사진 교체

- 요청 형식: `multipart/form-data`
- 새 사진 파트 이름: `file`
- 선택값: `takenAt`, `latitude`, `longitude`
- 기존 사진의 DB ID와 표시 순서는 유지되고 S3 Key와 파일 정보만 새 값으로 변경됩니다.
- 새 사진 저장과 DB 반영이 성공한 뒤 기존 S3 객체를 삭제합니다.
- 교체에 실패하면 새 객체를 정리하고 기존 사진을 유지합니다.
- 사진과 연결된 위치·촬영 시각 경고는 새 정보로 다시 계산합니다.

### 제한과 검증

- 허용 형식: JPEG, PNG
- 기본 최대 크기: 사진 1장당 10MB
- 보고서당 최대 개수: 20장
- 확장자나 MIME 값뿐 아니라 JPEG·PNG 실제 파일 시그니처를 검사합니다.
- 클라이언트가 보낸 경로와 제어문자는 원본 파일명에서 제거합니다.
- S3 Key는 `reports/{reportId}/photos/{UUID}.jpg|png` 형식입니다.

### 사진 응답

주요 필드는 `id`, `originalName`, `contentType`, `sizeBytes`, `takenAt`, `latitude`, `longitude`, `contentUrl`, `createdAt`입니다. `contentUrl`은 공개 주소가 아니라 JWT가 필요한 백엔드 조회 API입니다.

## 5. 일반 첨부파일 API

### API 목록

| 기능 | API | 성공 결과 |
|---|---|---|
| 파일 업로드 | `POST /api/reports/{reportId}/files` | `201 Created`, 파일 정보 |
| 파일 다중 업로드 | `POST /api/reports/{reportId}/files/batch` | `201 Created`, 파일 정보 배열 |
| 파일 교체 | `PUT /api/reports/{reportId}/files/{fileId}` | 교체된 파일 정보 |
| 파일 목록 | `GET /api/reports/{reportId}/files` | 파일 배열 |
| 파일 다운로드 | `GET /api/reports/{reportId}/files/{fileId}/content` | 첨부파일 바이트 |
| 파일 삭제 | `DELETE /api/reports/{reportId}/files/{fileId}` | `204 No Content` |

### 업로드 요청

- 요청 형식: `multipart/form-data`
- 파일 파트 이름: `file`
- 원본 파일명에는 확장자가 있어야 합니다.

### 다중 업로드

- 요청 형식: `multipart/form-data`
- 파일 파트 이름: `files`를 파일 수만큼 반복
- 전체 요청 최대 크기 기본값: 50MB
- 기존 첨부파일과 새 파일의 합이 20개를 넘으면 `409 Conflict`가 반환됩니다.
- 한 파일이라도 실패하면 요청 전체가 실패하고 앞에서 업로드된 객체도 정리됩니다.

### 첨부파일 교체

- 요청 형식: `multipart/form-data`
- 새 파일 파트 이름: `file`
- 기존 첨부파일의 DB ID와 표시 순서는 유지됩니다.
- 새 파일과 DB 정보가 정상 반영된 후 기존 S3 객체를 삭제합니다.
- 교체가 실패하면 기존 첨부파일은 그대로 유지됩니다.

### 제한과 검증

- 허용 형식: PDF, CSV, DOC, DOCX, XLS, XLSX
- 기본 최대 크기: 파일 1개당 20MB
- 보고서당 최대 개수: 20개
- PDF는 헤더, DOC·XLS는 OLE 시그니처를 검사합니다.
- DOCX는 `word/document.xml`, XLSX는 `xl/workbook.xml`이 포함된 정상 OOXML 구조인지 확인합니다.
- CSV는 빈 파일과 null byte가 포함된 파일을 거부합니다.
- 단순 ZIP 파일의 확장자만 DOCX·XLSX로 바꾼 경우 업로드할 수 없습니다.
- S3 Key는 `reports/{reportId}/files/{UUID}.{extension}` 형식입니다.

### 첨부파일 응답

주요 필드는 `id`, `originalName`, `contentType`, `sizeBytes`, `contentUrl`, `createdAt`입니다. 다운로드 응답은 원본 파일명을 포함한 `attachment` 방식입니다.

## 6. 인증과 권한

### 공통 인증

모든 사진·첨부파일 요청에는 다음 헤더가 필요합니다.

```http
Authorization: Bearer {accessToken}
```

Access Token을 URL 쿼리 문자열에 넣으면 로그·방문 기록 등에 노출될 수 있으므로 사용하지 않습니다.

### 조회 권한

- 해당 현장에 접근할 수 있는 사용자만 사진·첨부파일 목록과 내용을 조회할 수 있습니다.
- 현장 외부 사용자에게는 보고서 존재 여부가 노출되지 않도록 `404`가 반환될 수 있습니다.

### 업로드·교체·삭제 권한

- 보고서 작성자, 현장 관리자 또는 시스템 관리자만 파일을 변경할 수 있습니다.
- 사진·첨부파일의 업로드·교체·삭제는 보고서가 `pending` 상태일 때만 가능합니다.
- 승인되거나 보완 요청된 보고서의 파일 변경 요청에는 `409 Conflict`가 반환됩니다.
- 화면의 버튼 노출 여부와 관계없이 백엔드가 최종 권한을 다시 검사합니다.

### 앱과 웹의 파일 표시

- 모바일 앱: 이미지 요청에 인증 헤더를 직접 지정하거나 인증 요청으로 내려받아 로컬 캐시 파일을 표시합니다.
- 웹: 일반 `<img src>`에는 인증 헤더를 넣을 수 없으므로 Fetch/Axios로 Blob을 받은 뒤 Object URL로 표시합니다. 사용 후 `URL.revokeObjectURL()`로 해제합니다.
- 첨부파일: 앱은 인증 요청으로 로컬 파일을 만든 뒤 열고, 웹은 인증 요청으로 Blob을 받아 다운로드합니다.

`contentUrl`은 `/api/...`로 시작하는 상대 경로입니다. 프론트엔드 기본 주소에 이미 `/api`가 포함되어 있다면 `/api/api/...`가 되지 않도록 서버 원본 주소와 결합합니다.

## 7. 실패 처리와 DB-S3 정합성

### 백엔드 처리

- S3 객체를 저장한 뒤 DB 메타데이터를 저장합니다.
- S3 업로드가 실패하면 DB 파일 데이터는 생성하지 않습니다.
- S3 업로드 후 DB 트랜잭션이 롤백되면 방금 업로드한 S3 객체를 삭제합니다.
- 파일 삭제는 DB 트랜잭션이 커밋된 뒤 S3 객체를 삭제합니다.
- 다른 보고서 경로의 S3 Key로 조회·삭제하지 못하도록 `reportId` 경로를 확인합니다.
- 교체는 새 객체와 DB 정보가 정상 반영된 뒤 기존 S3 객체를 삭제합니다.
- S3 삭제 실패 등으로 남은 고아 객체는 활성화된 예약 작업이 주기적으로 정리합니다.

### 고아 객체 정리 작업

고아 객체는 S3에는 존재하지만 `report_photos` 또는 `report_files`에서 더 이상 참조하지 않는 파일입니다.

1. 기본 매일 한국 시간 04시에 실행됩니다.
2. DB에 저장된 사진·첨부파일 S3 Key를 수집합니다.
3. S3의 `reports/` 경로를 페이지 단위로 조회합니다.
4. DB에서 참조하지 않고 생성 후 24시간 이상 지난 객체만 삭제합니다.
5. `reports/{reportId}/photos/...`, `reports/{reportId}/files/...` 형식 이외의 객체는 건드리지 않습니다.

기본값은 비활성화이며 운영 서버에서 다음 환경변수로 활성화합니다.

예약 정리가 실행되려면 Spring Boot 애플리케이션 설정에 `@EnableScheduling`이 적용되어 있어야 합니다.

```ini
BUILDUP_S3_ORPHAN_CLEANUP_ENABLED=true
BUILDUP_S3_ORPHAN_CLEANUP_GRACE_PERIOD=24h
BUILDUP_S3_ORPHAN_CLEANUP_CRON="0 0 4 * * *"
BUILDUP_S3_ORPHAN_CLEANUP_ZONE=Asia/Seoul
```

EC2 IAM Role에는 S3 목록 조회와 객체 삭제 권한이 필요합니다.

### 프론트엔드 처리

- 보고서 생성 전에 실패하면 일반 제출 오류로 처리합니다.
- 단일 업로드를 반복 호출한 경우 성공한 파일은 유지하고 실패한 파일만 재시도합니다.
- 다중 업로드는 요청 전체가 하나의 작업이므로 한 파일이 실패하면 전체 요청을 다시 시도합니다.
- 사용자가 제출 전체를 취소하면 대기 중인 보고서에 `DELETE /api/reports/{reportId}`를 호출합니다.
- 모든 파일 업로드가 끝나기 전에는 최종 성공 처리나 상세 화면 이동을 하지 않습니다.

## 8. 사진·위치 자동 검사

사진 업로드와 보고서 생성 시 다음 검사 결과가 `checks`에 기록될 수 있습니다.

| 검사 값 | 의미 |
|---|---|
| `old_photo` | 촬영 후 24시간이 지난 사진 |
| `far_photo` | 사진 위치가 현장에서 500m보다 멂 |
| `far_submit` | 보고서 제출 위치가 현장에서 500m보다 멂 |
| `no_location` | 사진 또는 보고서 위치가 없음 |

검사 결과는 경고 정보를 제공하며 자동으로 보고서를 차단하거나 반려하지 않습니다.

## 9. 오류 처리 기준

API 연결 계층은 HTTP 상태 코드로 오류 종류를 구분하고, 응답의 `message`를 사용자에게 표시합니다.

```json
{ "message": "허용되지 않은 파일 형식입니다." }
```

백엔드가 진단용 필드를 추가로 내려주더라도 프론트엔드는 공통 계약인 `message`에만 의존합니다.

| 상태 | 의미 |
|---|---|
| `400` | 누락되거나 잘못된 위치·파일명 등 요청 오류 |
| `401` | 인증 만료 또는 실패 |
| `403` | 업로드·삭제 권한 없음 |
| `404` | 보고서, 파일 또는 실제 S3 객체를 찾을 수 없음 |
| `409` | 파일 개수 초과 또는 변경할 수 없는 보고서 상태 |
| `413` | 파일 크기 초과 |
| `415` | 허용되지 않은 파일 형식 또는 실제 내용 불일치 |
| `502` | S3 업로드·다운로드 실패 |

`401`은 토큰 갱신을 한 번 실행하고 실패하면 로그인 화면으로 이동합니다. 파일 업로드 오류는 보고서 생성 오류와 구분해 재시도할 수 있도록 처리합니다.

## 10. S3 연결 확인 API

```http
GET /api/test/s3
```

- 버킷에 `HeadBucket` 요청을 보내 EC2 IAM Role과 버킷 연결 상태를 확인합니다.
- `BUILDUP_S3_CONNECTION_CHECK_ENABLED=true`일 때만 API가 생성됩니다.
- 성공 응답은 `{ "status": "ok", "message": "S3 connection is available" }`입니다.
- 운영 화면에서 사용하는 API가 아니라 배포 후 연결 상태를 점검하는 용도입니다.
