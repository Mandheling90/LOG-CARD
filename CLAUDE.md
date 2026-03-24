# LOG-CARD (무당검협전)

무협 테마의 로그라이크 덱빌딩 카드 게임. Slay the Spire 스타일의 턴제 전투 + 태극 시스템.

## 기술 스택

- **프레임워크:** React 19 + Vite 6
- **스타일링:** Tailwind CSS 4
- **언어:** JavaScript (JSX), TypeScript 미사용
- **린팅:** ESLint 9
- **배포:** 정적 SPA (클라이언트 전용, 백엔드 없음)

## 프로젝트 구조

```
src/
├── components/        # UI 컴포넌트 (Card, PlayerStatus, EnemyDisplay 등)
├── data/              # 게임 데이터
│   ├── cards.js       # 카드 정의 (44+장, 4등급)
│   ├── enemies.js     # 적 템플릿 (5종)
│   └── mapGenerator.js # 절차적 맵 생성 (10층)
├── hooks/
│   └── useGameState.js # 중앙 게임 상태 관리 (핵심 훅)
├── utils/
│   └── gameLogic.js   # 카드 효과 처리, 데미지 계산, 버프 로직
├── App.jsx            # 게임 페이즈별 라우팅
├── main.jsx           # React 진입점
└── index.css          # 글로벌 스타일 + 커스텀 애니메이션
```

## 핵심 게임 메카닉

### 게임 플로우
TITLE → MAP → BATTLE → REWARD → REST/EVENT → ... → VICTORY/GAME_OVER

### 카드 분류
- **초식(CHOSIK):** 공격/방어 기술 (공/수/공수 속성)
- **심법(SIMBEOP):** 내공/버프 계열
- **보법(BOBEOP):** 이동/유틸리티

### 등급
COMMON(3) → UNCOMMON(11) → RARE(11) → LEGENDARY(9)

### 핵심 시스템
- **태극(Taeguk):** 카드 효과로 축적, 필살기/드로우/에너지 변환에 소비
- **자세 전환(Stance):** 공↔수 전환 시 카드 보너스 발동
- **버프:** 지속시간 기반, 턴당/전환당 효과 트리거

### 플레이어 기본값
- HP: 80, 에너지: 3/턴, 핸드: 5장, 초기 덱: 8장

### 맵 구성
- 10층 + 시작층, 층당 1-3노드
- 노드: BATTLE(50%), ELITE(20%), REST(15%), EVENT(15%), BOSS(5층/10층)

## 아키텍처 패턴

- **상태 관리:** `useGameState()` 커스텀 훅에 모든 게임 로직 집중
- **효과 처리:** `gameLogic.js`에서 카드 효과를 타입별로 분기 처리
- **컴포넌트:** 프레젠테이셔널 컴포넌트가 훅으로부터 데이터/콜백 수신
- **스타일:** Tailwind 유틸리티 클래스 + index.css 커스텀 애니메이션
- **반응형:** 모바일 퍼스트, `md:` 브레이크포인트

## 디버그 모드

URL 파라미터 `?isdebug=true` 또는 `.env`의 `VITE_DEBUG_MODE=true`로 활성화.
랜덤 적 3마리 스폰, 전체 카드 핸드, 즉사 디버그 카드 포함.

## 스크립트

```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드 → /dist
npm run lint     # ESLint
npm run preview  # 빌드 미리보기
```
