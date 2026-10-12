# 햄부기 HMBG — hmbg.kr

게임 개발 동아리 햄부기(How to Make the Best Game)의 공식 사이트. 빌드 도구 없는 정적 사이트이며 GitHub Pages(`CNAME` → hmbg.kr)로 배포됩니다.

| 파일 | 역할 |
| --- | --- |
| `index.html` / `style.css` / `app.js` | 메인 사이트 ("ORDER UP!" 스티커 시트 다이너 디자인) |
| `nav.js` | 헤더·모바일 메뉴 — 라이브러리 없이 동작, vendor 스크립트보다 먼저 로드 |
| `portal.html` / `portal.css` / `portal.js` | 멤버 전용 포털 (Google 로그인) — 메인과 같은 디자인 토큰, 모션 라이브러리 없이 CSS만 사용 |
| `assets/sprites/` | `hambgi.png`에서 추출한 재료·접시 픽셀 스프라이트 (1× 원본, CSS로 2× 확대) |
| `flappybird/` | Unity WebGL 빌드 (약 34MB — 사용자가 "플레이 시작"을 눌러야 로드) |
| `mayhem/` | Unity WebGL 빌드 (약 44MB, 압축 없이 빌드 — GitHub Pages는 `.br`/`.gz` 헤더를 못 줌). 첫 씬은 MainMenu이고 FMOD 사운드 뱅크는 `StreamingAssets/` |
| `assets/*-thumb.png` | 프로젝트 카드용 실제 게임플레이 캡처 (960×600 전체 화면 — 흰 여백의 점수 표시까지 게임 화면의 일부) |

## 로컬 실행

```bash
python -m http.server 8791 --bind 127.0.0.1
```

`http://127.0.0.1:8791/` 로 접속. CSS/JS를 바꿨으면 `index.html`의 `style.css?v=N`, `app.js?v=N` 버전을 올려 캐시를 깨 주세요.

## 모션 스택 (메인 사이트)

모두 CDN에서 `defer`로 로드되며, 하나가 막혀도 나머지 기능은 개별적으로 동작합니다(정적 페이지로 degrade).

| 라이브러리 | 담당 |
| --- | --- |
| [Lenis 1.3](https://lenis.dev) | 휠 스크롤 스무딩. 끄려면 콘솔에서 `localStorage.hmbgSmooth = 'off'` |
| [GSAP 3.15](https://gsap.com) + ScrollTrigger / SplitText / Flip | 스크롤에 묶인 모든 것: 히어로 인트로, 라인 마스크 타이틀, 레시피 스테이션 스크럽, 메뉴 카드 스택, 진열장 다이얼로그(Flip), 액자 스윙, 영수증 프린터 |
| [anime.js 4.5](https://animejs.com) | 포인터·물리 기반 인터랙션: `spring()` 티켓 드롭/버튼/이름표, `createAnimatable` 마그네틱 버튼·액자, `createDraggable` 완성된 버거 |
| [Spline viewer 2.0](https://viewer.spline.design) | 선택 사항 — 아래 참고 |

규칙: 한 요소의 `transform`은 항상 한 라이브러리만 건드립니다. `prefers-reduced-motion: reduce`면 JS 모션과 Lenis를 전부 끄고 최종 상태만 보여줍니다. CDN이 2.5초 안에 오지 않으면 CSS 페일세이프가 히어로를 그대로 보여주고, 늦게 도착한 JS는 인트로를 건너뜁니다(`html.intro-skipped`).

디자인 토큰: 크림 종이 위 2px 초콜릿 외곽선 + 하드 오프셋 섀도, 플랫 파스텔 채움(핑크·민트·치즈·마룬). 글라스/글로우/그라데이션/보라색 금지. 버튼 핑크는 `--pink-btn`(초콜릿 텍스트 대비 4.7:1)만 사용합니다.

## Spline 3D 씬 넣기 (선택)

`#about`의 레시피 트레이에는 비어 있는 3D 슬롯이 있습니다.

1. Spline 에디터에서 씬을 만든 뒤 **Export → Viewer** 로 `https://prod.spline.design/xxxx/scene.splinecode` URL을 복사합니다.
   권장: 파스텔 로우폴리 햄버거, 배경 투명(또는 `#6a071a`), 카메라 고정, 1.5MB 이하.
2. `index.html`에서 `<div class="spline-slot" id="spline-slot" data-spline-url="">`의 `data-spline-url`에 붙여 넣습니다.
3. 데스크톱·마우스·모션 허용·데이터 절약 꺼짐 환경에서만 뷰어(약 3.5MB)를 lazy-load 하고, 로드가 끝나면 픽셀 버거 위로 교체됩니다. 실패하면 픽셀 버거로 자동 복귀합니다.

파이프라인만 점검하려면 `index.html?spline=demo` 로 열면 Spline 공식 샘플 씬을 불러옵니다. (배포용이 아닙니다.)
