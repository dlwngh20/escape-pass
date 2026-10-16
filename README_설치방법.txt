ESCAPE PASS PWA v1.0
====================

아이폰 홈 화면에 설치해서 사용하는 개인용 방탈출 예약 허브입니다.

포함 기능
- 아이폰 PWA / 홈 화면 설치
- 다크 글래스 UI
- 첫 실행 PIN 설정 및 앱 잠금
- 예약자 프로필 로컬 저장
- 예약 플랜(사이트/날짜/시간/지점/테마/메모) 저장
- KEYESCAPE / ZEROWORLD / DOOMESCAPE / PLAY33 / 단편선 / LEDASQUARE / OASIS MUSEUM 바로가기
- Userscript 설치 체크리스트
- 데이터 JSON 백업 / 복원
- 오프라인 앱 셸 캐시

중요
- 이 앱은 예약 엔진 자체를 PWA 안에서 실행하지 않습니다.
- '예약페이지 열기'를 누르면 Safari의 해당 사이트가 열리고,
  Safari Userscripts에 설치한 기존 사이트별 예약 스크립트가 이어서 동작합니다.
- iOS 보안 구조상 PWA가 다른 사이트의 DOM이나 Userscripts 앱의 설치 상태를 직접 읽을 수 없습니다.
- PIN은 이 아이폰의 로컬 저장소를 잠그는 개인용 편의 기능입니다.
  서버 계정/원격 차단 수준의 인증은 아닙니다.

아이폰 설치 방법
1. 이 폴더를 HTTPS 웹호스팅에 올립니다.
   - GitHub Pages / Cloudflare Pages / Netlify 등의 정적 호스팅 사용 가능
2. Safari에서 배포 주소를 엽니다.
3. 공유 버튼 → '홈 화면에 추가'
4. 홈 화면의 ESCAPE PASS 아이콘으로 실행합니다.
5. 첫 실행 때 4자리 PIN을 만듭니다.

로컬 테스트
- PC에서 이 폴더에서:
  python -m http.server 8080
- 같은 PC에서 http://localhost:8080 로 테스트할 수 있습니다.
- iPhone 홈 화면 설치/Service Worker는 HTTPS 배포 주소에서 테스트하는 것을 권장합니다.

사이트 URL
- KEYESCAPE: https://www.keyescape.com/reservation1.php
- ZEROWORLD: https://zeroworldkorea.com/layout/res/home.php?go=rev.make&s_subj=A
- DOOMESCAPE: https://doomescape.com/layout/res/home.php?go=rev.make
- PLAY33: https://play33.kr/reservation
- 단편선: https://dpsnnn.com/reserve_g
- LEDASQUARE: https://ledasquare.com/layout/res/home.php?go=rev.make
- OASIS MUSEUM: https://oasismuseum.com/ticket

추천 사용 방식
- ESCAPE PASS = 홈 화면의 통합 허브/예약 플랜 관리
- Safari Userscripts = 실제 사이트별 자동예약 엔진
- 경쟁 예약 때는 Safari가 백그라운드로 내려가지 않도록 해당 예약 탭을 전면에 두는 것이 좋습니다.
