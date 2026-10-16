ESCAPE PASS v2.3 — BRANCH + THEME LINKED SELECT
================================================

핵심 변경
- 테마 직접 입력 제거
- 사이트 선택 → 지점 드롭다운
- 지점 선택 → 해당 지점의 테마 드롭다운 자동 갱신
- FAST 자동예약 화면과 예약 플랜 추가/수정 화면 모두 동일 적용
- 기존 v2.2의 CAPTCHA 흐름 유지
  · KEYESCAPE: STEP2 reCAPTCHA 직접 체크 후 자동 시작
  · ZEROWORLD: 자동등록방지 숫자 직접 입력 후 자동 시작

테마 목록 기준
- 2026-10-16 현재 확인 가능한 사이트/기존 검증 자료 기준으로 구성
- 사이트에서 테마가 추가/종료되면 이 목록도 업데이트가 필요할 수 있음
- 실제 예약사이트에 진입하면 통합 엔진이 해당 사이트의 실제 선택 항목과 다시 매칭

업데이트 방법
1. ESCAPE_PASS_v2.3_BRANCH_THEME.zip 압축 해제
2. GitHub escape-pass 저장소 루트에 전체 파일 덮어쓰기
3. Pages 설정(main / root)은 그대로
4. 아이폰 Userscripts / PC Tampermonkey 엔진도 v2.3으로 교체
5. 기존 v2.2 엔진 및 개별 사이트 스크립트는 OFF 권장
