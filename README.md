# Brick Breaker 🧱

클래식 벽돌깨기(Breakout)의 현대적 리메이크입니다. 2026년 UI/UX 트렌드를 적용하여 네온 스타일, 부드러운 애니메이션, 모바일 최적화를 제공합니다.

## 기능

### 게임 플레이
- **Canvas 기반 렌더링**: 60fps 부드러운 애니메이션
- **10+ 스테이지**: 난이도가 점진적으로 상승
- **다양한 벽돌 타입**:
  - 일반 (1히트) - 빨강
  - 강화 (2히트) - 어두운 빨강
  - 특수 (3히트) - 주황색
  - 파괴불가 - 회색
- **파워업 아이템**:
  - 패들 확장 (파란색)
  - 공 속도 감소 (보라색)
  - 멀티볼 (분홍색)
  - 레이저 (초록색)
  - 추가 생명 (빨강)

### 조작 방법
- **데스크톱**: 마우스로 패들 이동
- **모바일**: 터치로 패들 이동
- **게임 시작**: 화면 클릭/탭
- **일시정지**: 버튼 클릭

### 시각 효과
- 네온 그라데이션 벽돌
- 파티클 이펙트 (벽돌 파괴 시)
- 빛나는 공과 패들
- 그리드 배경 패턴
- 네온 글로우 효과
- 부드러운 애니메이션

### 오디오
- Web Audio API 기반 사운드 효과
- 패들 충돌음
- 벽돌 파괴음 (타입별 다른 음)
- 벽 충돌음
- 파워업 수집음
- 게임오버/성공음
- 음향 토글 버튼

### 다국어 지원
12개 언어 완벽 지원:
- 한국어 (기본)
- English, 中文, हिन्दी, Русский
- 日本語, Español, Português
- Bahasa Indonesia, Türkçe, Deutsch, Français

### 데이터 저장
- localStorage를 통한 최고 기록 저장
- 게임 통계 (총 점수, 플레이 횟수, 최고 스테이지, 파괴한 벽돌)

### PWA 기능
- Service Worker 오프라인 지원
- 앱으로 설치 가능
- 홈 화면 추가 가능
- 네이티브 앱처럼 동작

### SEO & 소셜 공유
- Open Graph 메타태그
- Twitter Card 설정
- Schema.org 구조화된 데이터
- 결과 공유 기능

### 광고 통합
- AdSense 배너 광고 영역
- AdMob 전면 광고 플레이스홀더
- 보상형 광고 (부활 기능)

## 파일 구조

```
brick-breaker/
├── index.html          # 메인 HTML (GA4, AdSense, PWA 설정 포함)
├── manifest.json       # PWA 설정
├── sw.js               # Service Worker (오프라인 지원)
├── css/
│   └── style.css       # 다크모드 우선, 반응형 스타일
├── js/
│   ├── app.js          # 게임 엔진 (Canvas, 로직, 렌더링)
│   ├── i18n.js         # 다국어 지원 모듈
│   ├── sound-engine.js # Web Audio API 사운드 엔진
│   └── locales/        # 12개 언어 JSON
│       ├── ko.json
│       ├── en.json
│       ├── zh.json
│       ├── hi.json
│       ├── ru.json
│       ├── ja.json
│       ├── es.json
│       ├── pt.json
│       ├── id.json
│       ├── tr.json
│       ├── de.json
│       └── fr.json
├── icon-192.svg        # PWA 아이콘 (192x192)
├── icon-512.svg        # PWA 아이콘 (512x512)
└── README.md           # 이 파일
```

## 기술 스택

- **HTML5**: 시맨틱 마크업, PWA 메타태그
- **CSS3**: Glassmorphism, 그라데이션, 애니메이션, 반응형 디자인
- **Vanilla JavaScript**: Canvas API, Web Audio API, LocalStorage
- **Canvas**: 게임 렌더링 (부드러운 60fps)
- **Service Worker**: 오프라인 지원, 캐싱 전략

## 설치 및 실행

### 로컬 테스트
```bash
cd projects/brick-breaker
python -m http.server 8000
# http://localhost:8000 에서 접속
```

### 배포
1. `/brick-breaker/` 디렉토리 전체를 웹 서버에 업로드
2. HTTPS 필수 (Service Worker, PWA 설치 기능 사용)
3. AdSense/AdMob 설정 확인

## 설계 원칙

### 2026 UI/UX 트렌드
1. **Glassmorphism 2.0** - 함수형 블러 효과
2. **Microinteractions** - 부드러운 호버, 탭 애니메이션
3. **Dark Mode First** - 어두운 배경이 기본
4. **Minimalist Flow** - 화면당 하나의 액션
5. **Progress & Statistics** - 데이터 시각화

### 디자인 색상
- **Primary (Main)**: #e74c3c (네온 빨강)
- **Primary Light**: #ec6554 (밝은 빨강)
- **Secondary**: #c0392b (짙은 빨강)
- **Accent**: #f39c12 (주황색)
- **Success**: #2ecc71 (초록색)
- **Background**: #0f0f23 (매우 어두운 파란색)

### 접근성
- 44px+ 터치 타겟 크기
- 충분한 색상 대비
- 키보드 네비게이션 지원
- ARIA 라벨 포함

## 성능 최적화

- Canvas 렌더링으로 DOM 최소화
- requestAnimationFrame으로 부드러운 60fps
- 캐시 전략으로 로딩 시간 단축
- 이미지 대신 SVG 아이콘 사용 (가볍고 확장 가능)

## 브라우저 지원

- Chrome/Edge 60+
- Firefox 55+
- Safari 12+
- iOS Safari 12+
- 안드로이드 Chrome 60+

## 게임 플로우

1. **메뉴 화면**: 최고 점수 표시, 게임 시작/통계 버튼
2. **게임 시작**: 초기 볼과 패들 위치 설정
3. **게임 플레이**:
   - 볼이 벽돌과 충돌하면 파괴 및 점수 획득
   - 파워업 드롭으로 특수 기능 활성화
   - 패들로 볼을 놓치면 생명 감소
4. **스테이지 클리어**: 모든 벽돌 파괴 시 다음 스테이지로 진행
5. **게임 오버**: 생명 0일 때, 점수와 통계 표시
6. **부활 기능**: 광고 시청으로 게임 계속 진행

## 수익화 전략

### AdSense/AdMob 배치
1. 상단 배너 (메뉴, 게임오버)
2. 하단 배너 (게임오버)
3. 전면 광고 (부활 기능)
4. 보상형 광고 (향후 확장)

### 인앱 결제 (향후)
- 광고 제거 (₩3,900)
- 특수 파워업 언락
- 커스텀 스킨/테마

## 향후 계획

- [ ] 스킨/색상 커스터마이징
- [ ] 리더보드 시스템
- [ ] 일일 챌린지
- [ ] 업적/배지 시스템
- [ ] 소셜 공유 확대
- [ ] 사운드 트랙 추가
- [ ] 보스 스테이지

## 라이선스

Copyright © 2026 DopaBrain. All rights reserved.

## 문의

- 웹사이트: https://dopabrain.com/
- 이메일: support@dopabrain.com
