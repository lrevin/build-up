# Security

백엔드 인증·보안 구현을 이해하기 위한 참고용 코드 모음입니다.

- `password/`: BCrypt 비밀번호 암호화·검증 코드 (72바이트 길이 검사도 여기 한 곳에서)
- `jwt/`: JWT 생성·검증과 Spring Security 설정
- `refresh-token/`: Refresh Token 발급·검증·폐기 흐름 (`RefreshToken` 엔티티와 `RefreshTokenRepository`는 `../jpa/` 폴더에 있는 것을 같이 씀)
- 실제 비밀번호, JWT 비밀키, DB·AWS 인증정보와 `.env` 파일은 이 폴더에 올리지 않습니다.

