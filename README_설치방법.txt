ESCAPE PASS v2.2 — BRANCH SELECT + CAPTCHA FLOW
================================================

변경사항
1. 지점/매장 직접 입력 제거
   - 모든 지원 사이트에서 ESCAPE PASS 안의 드롭다운 목록으로 선택
   - KEYESCAPE: 더오름 / 우주라이크 / LOG_IN1 / LOG_IN2 / 메모리컴퍼니 /
     후즈데어 / STATION / 무비무드 / 강남점 / 부산점 / 전주점 / 홍대점
   - ZEROWORLD: 김포본점 / 강남점 / 홍대점 / 다이브 건대점
   - DOOMESCAPE: 1호점 / 2호점 / DTH점(부평) / FEAR점(수원)
   - PLAY33: 건대점 / 홍대점 / 대전점 / 수원점
   - 단편선: 강남점
   - LEDASQUARE: 홍대점
   - OASIS MUSEUM: 홍대점

2. CAPTCHA 흐름 개선
   ZEROWORLD
   - ESCAPE PASS에서 FAST 자동예약 시작
   - 예약페이지 자동 오픈
   - ZEROWORLD 자동예약 패널 자동 오픈
   - CAPTCHA 이미지/입력칸 표시
   - 사용자가 숫자 직접 입력
   - 입력 확인 즉시 FAST 예약 대기 자동 시작

   KEYESCAPE
   - ESCAPE PASS에서 FAST 자동예약 시작
   - KEYESCAPE 설정 자동 전달 및 패널 자동 오픈
   - KEYESCAPE의 reCAPTCHA는 사이트 구조상 STEP2에서만 실제 생성됨
   - STEP2에 진입하면 CAPTCHA 대기 안내 자동 표시
   - 사용자가 reCAPTCHA 직접 체크
   - 토큰 확인 즉시 FAST 예약 대기 자동 시작

중요
- CAPTCHA는 자동 해독하거나 우회하지 않습니다.
- KEYESCAPE STEP1에서 가짜 reCAPTCHA를 생성하지 않습니다.
- 대기열/접근제어/요청제한을 우회하지 않습니다.
- 실제 예약 성공은 서버 상태/경쟁 상황에 따라 달라질 수 있습니다.

업데이트
- GitHub escape-pass 저장소에 v2.2 파일 전체를 덮어올립니다.
- Pages 설정은 main / (root) 그대로 유지합니다.
- iPhone Userscripts / PC Tampermonkey의 기존 v2.1 엔진은
  userscript/ESCAPE_PASS_ENGINE.user.js v2.2로 교체합니다.
- 기존 사이트별 개별 스크립트는 OFF 권장.
