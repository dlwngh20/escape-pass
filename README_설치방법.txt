ESCAPE PASS v2.1 CROSS-PLATFORM
================================

같은 GitHub Pages 주소를 iPhone과 Windows PC에서 모두 사용할 수 있습니다.

[아이폰]
- Safari에서 ESCAPE PASS 실행
- 홈 화면 PWA 설치 가능
- Safari Userscripts에 ESCAPE_PASS_ENGINE.user.js 1개 설치
- FAST 자동예약 → 대상 예약사이트 → 통합 엔진 자동 시작
- KEYESCAPE reCAPTCHA / ZEROWORLD 자동등록방지 숫자는 직접 처리

[Windows PC]
- 같은 ESCAPE PASS 주소를 Chrome 또는 Edge로 실행
- PC 와이드 대시보드 자동 적용
- Tampermonkey에 ESCAPE_PASS_ENGINE.user.js 1개 설치
- 단일 FAST 예약 실행 가능
- 예약 플랜 여러 개 저장 후 체크 → '선택 동시 실행'
- 각 플랜은 새 탭에서 독립적으로 열림
- 여러 탭이 차단되면 GitHub Pages ESCAPE PASS 주소의 팝업 허용 필요

[중요]
- 아이폰과 PC의 프로필/플랜은 각각 브라우저 로컬 저장소에 저장됩니다.
  현재 버전은 서버 동기화를 하지 않습니다.
- CAPTCHA, 대기열, 서버 접근제어를 우회하지 않습니다.
- 기존 개별 Userscript는 중복 실행을 피하기 위해 OFF 권장.
- 실제 예약 성공은 사이트 서버 상태 및 경쟁 상황에 따라 달라집니다.

[GitHub Pages 업데이트]
1. ESCAPE_PASS_v2.1_CROSS_PLATFORM.zip 압축 해제
2. escape-pass 저장소 루트에서 기존 파일을 v2.1 파일로 교체/업로드
3. 루트에 다음이 보여야 함:
   index.html
   app.js
   styles.css
   sw.js
   manifest.webmanifest
   icons/
   userscript/
4. Settings → Pages는 기존 main / (root) 그대로
5. 배포 후 페이지 강력 새로고침 또는 홈 화면 앱 완전 종료 후 재실행

[PC 통합 엔진 설치]
1. Chrome 또는 Edge에 Tampermonkey 설치
2. GitHub Pages에서:
   /userscript/ESCAPE_PASS_ENGINE.user.js
   를 열어 Tampermonkey에 설치
3. 엔진을 ON
4. 기존 사이트별 스크립트는 OFF
5. ESCAPE PASS 페이지에서 FAST 자동예약 실행

[아이폰 통합 엔진 설치]
1. Userscripts 앱 사용
2. ESCAPE_PASS_ENGINE.user.js를 Userscripts 폴더에 저장
3. 스크립트 ON
4. Safari의 Userscripts 확장 권한 허용
