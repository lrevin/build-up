-- 발표용 데모 계정 이름을 팀원 이름으로 바꾼다(최종 발표 시연용). 데모 계정이 없는 DB에서는 아무 일도 하지 않는다.
-- 본사 hq@ → 강건우, 현장 관리자 admin@ → 이재빈, 일반 작업자 worker@ → 김창원

UPDATE users SET name = '강건우' WHERE email = 'hq@buildup.kr';
UPDATE users SET name = '이재빈' WHERE email = 'admin@buildup.kr';
UPDATE users SET name = '김창원' WHERE email = 'worker@buildup.kr';
