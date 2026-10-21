# 머슴봇 (Discord Bot)

- Claude AI 기반 디스코드 봇. 대화, 리마인더, 뽀모도로, 주간보고 자동생성 등 다양한 기능을 제공합니다.
- Discord.js, Redmine API, Claude Code CLI를 활용한 업무 자동화 Bot의 외부 공개 버전 (사내 운영 버전 별도)

## 프로젝트 구조

```
├── index.js                 # 봇 엔트리포인트
├── config.js                # 설정값
├── deploy-commands.js       # 슬래시 커맨드 등록
├── delete-guild-commands.js # 서버 전용 명령어 삭제
├── commands/
│   ├── index.js             # 명령어 모음
│   ├── help.js              # 도움말
│   ├── reminder.js          # 알림/리마인더
│   ├── weeklyReport.js      # 주간보고 (Redmine 연동)
│   ├── pomodoro.js          # 뽀모도로 타이머
│   ├── anonymous.js         # 익명 메시지
│   ├── lunchVote.js         # 점심 투표
│   ├── pick.js              # 랜덤 뽑기
│   ├── calculator.js        # 계산기
│   ├── split.js             # N빵 계산
│   └── ladder.js            # 사다리타기
├── services/
│   ├── claude.js            # Claude CLI 연동
│   ├── events.js            # 디스코드 이벤트 모니터링
│   └── redmine.js           # Redmine API 클라이언트
└── utils/
    ├── access.js            # 접근 제어 / Redmine 사용자 매핑
    ├── time.js              # 시간 파싱/포맷
    └── error.js             # 에러 메시지 처리
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 `.env`로 복사 후 값을 채워주세요.

```bash
cp .env.example .env
```

```env
# Discord 설정
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id          # 테스트용 서버 전용 명령어 (선택)

# 접근 제어 (쉼표 구분, 비워두면 모두 허용)
ALLOWED_GUILD_IDS=123456789012345678
ALLOWED_USER_IDS=111111111111111111,222222222222222222

# Redmine 설정 (주간보고 기능용)
REDMINE_BASE_URL=https://your-redmine-url.com
REDMINE_API_KEY=your_redmine_api_key
REDMINE_USER_MAP=111111111111111111:17,222222222222222222:12   # discordId:redmineId
```

### 3. 슬래시 커맨드 등록

```bash
node deploy-commands.js
```

### 4. 봇 실행

```bash
npm start
```

### 5. (선택) PM2로 백그라운드 실행

```bash
# PM2 설치
npm install -g pm2

# 봇 실행
pm2 start index.js --name "discord-bot"

# 서버 재부팅 시 자동 시작
pm2 startup
pm2 save
```

## 명령어 목록

### AI 대화

| 명령어 | 설명 |
|--------|------|
| `/질문 메시지` | Claude AI와 대화 |
| `/초기화` | 대화 내역 초기화 |
| `@봇 멘션` | 멘션으로도 대화 가능 |

### 리마인더

| 명령어 | 설명 |
|--------|------|
| `/알림 시간 메시지` | 알림 설정 (예: "30분", "1시간", "2일") |
| `/알림목록` | 활성 알림 목록 |
| `/알림삭제 ID` | 알림 삭제 |

### 뽀모도로

| 명령어 | 설명 |
|--------|------|
| `/뽀모도로` | 25분 집중 타이머 시작 (시간 커스텀 가능) |
| `/휴식` | 5분 휴식 (또는 15분 긴 휴식) |
| `/뽀모도로중지` | 타이머 중지 |
| `/타이머상태` | 남은 시간 확인 |

### 업무

| 명령어 | 설명 |
|--------|------|
| `/주간보고 [시작일] [종료일]` | Redmine 기반 본인 주간보고 자동 생성 |

### 익명 메시지

| 명령어 | 설명 |
|--------|------|
| `/익명 @대상 메시지` | 특정 유저에게 익명 DM |
| `/익명전체 메시지` | 전체 멤버에게 익명 DM |

### 유틸리티 / 게임

| 명령어 | 설명 |
|--------|------|
| `/뽑기 참가자 인원` | 참가자 중 랜덤 선택 |
| `/사다리타기 참가자 결과` | 사다리 게임 (ASCII 애니메이션) |
| `/계산기 수식` | 수학 계산기 |
| `/n빵 총액 인원` | 금액 균등 분할 |
| `/점심투표 메뉴1 메뉴2` | 점심 메뉴 투표 (최대 5개) |
| `/점심마감` | 투표 마감 및 결과 발표 |
| `/도움말` | 전체 도움말 |

## 주요 기능 상세

- **Claude AI 대화**: Claude CLI를 통한 AI 응답, 채널별 대화 기록 유지 (최대 10개), 1시간 미사용 시 자동 정리
- **이벤트 알림**: 디스코드 예정 이벤트를 10분마다 확인, 오전 9시 당일 일정 알림 + 시작 10분 전 DM 알림
- **주간보고**: Redmine 시간 기록 기반으로 주간보고 양식 자동 작성 (한국 시간 기준 이번 주 월~금). `REDMINE_USER_MAP`에 연결된 본인 기록만 조회
- **사다리타기**: 2~8명 지원, ASCII 사다리 렌더링 + 프레임 애니메이션

## 보안 / 운영 참고

- **Claude CLI 격리**: 봇 디렉토리와 분리된 빈 임시 디렉토리에서 `--tools ""`(도구 비활성화), `--strict-mcp-config`로 실행해 대화로 `.env` 등 로컬 파일을 읽을 수 없도록 함
- **멘션 차단**: 봇 메시지에서 `@everyone`/`@here`/역할 멘션이 울리지 않도록 `allowedMentions` 제한. `@everyone` 공지에는 봇이 반응하지 않음
- **접근 제어**: `ALLOWED_GUILD_IDS`/`ALLOWED_USER_IDS`로 슬래시 명령어·버튼·멘션 모두 제한
- **상태는 메모리 저장**: 알림·뽀모도로·투표·대화 기록은 봇 재시작 시 초기화됨

## 시간 형식 예시

알림 설정 시 사용 가능한 시간 형식:

- `30분`
- `1시간`
- `2일`
- `1시간30분`
- `1일12시간`

## 요구 사항

- Node.js 18 이상
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications)에서 생성)
- Claude CLI 설치 및 인증 (`claude -p -` 명령어 사용)

## 기술 스택

- **Node.js** + **discord.js** v14
- **Claude CLI** (AI 응답 처리)
- **Redmine API** (주간보고 데이터)
