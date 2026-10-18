# Flyway 마이그레이션

이 폴더는 DB 변경 이력을 코드로 남기고, 로컬·RDS 등 여러 환경에 같은 구조를 순서대로 적용하기 위해 사용합니다.

## 갱신 방식

Flyway는 `flyway_schema_history` 테이블을 확인한 뒤 아직 적용되지 않은 SQL 파일만 버전 순서대로 한 번씩 실행합니다.

```text
V1__create_initial_schema.sql
V2__replace_auth_tokens_with_refresh_tokens.sql
...
V9__align_schema_with_mobile_app.sql
V10__rename_review_rejected_to_revision.sql
V11__next_change.sql
```

- 파일명은 `V버전__설명.sql` 형식을 사용합니다.
- `V1`은 최초 스키마이며, 이후 변경은 `V2`, `V3`처럼 새 파일로 누적합니다.
- 이미 적용된 마이그레이션은 수정하거나 삭제하지 않습니다.
- 새로운 DB 변경이 필요하면 마지막 버전 다음 번호로 파일을 추가합니다.
- 현재 V10까지 있으므로 다음 변경은 `V11__설명.sql`로 작성합니다.

적용 결과는 다음 쿼리로 확인할 수 있습니다.

```sql
SELECT version, description, success, installed_on
FROM flyway_schema_history
ORDER BY installed_rank;
```
