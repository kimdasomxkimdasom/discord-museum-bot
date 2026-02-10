# Discord Bot (머슴봇)

Claude AI 기반 Discord 봇입니다.

## 기능

| 명령어 | 설명 |
|--------|------|
| `/대화 메시지` | Claude AI와 대화 |
| `/초기화` | 대화 기록 삭제 |
| `/알림 시간 메시지` | 알림 설정 (예: 30분, 1시간) |
| `/알림목록` | 설정된 알림 확인 |
| `/알림삭제 ID` | 알림 삭제 |
| `/주간보고 사용자ID` | Redmine 주간보고 생성 |
| `/뽀모도로` | 25분 집중 타이머 |
| `/휴식` | 5분 휴식 타이머 |
| `/뽀모도로중지` | 타이머 중지 |
| `/타이머상태` | 남은 시간 확인 |
| `/익명 @대상 메시지` | 익명 DM 전송 |
| `/익명전체 메시지` | 서버 전체 익명 DM |
| `/도움말` | 도움말 표시 |

- 봇을 @멘션해도 대화할 수 있습니다
- 디스코드 이벤트 10분 전 자동 알림 (관심있음 표시한 사용자에게 DM)

## 설치

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일 내용:

```env
# Discord 설정
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id

# Redmine 설정 (주간보고 기능용)
REDMINE_BASE_URL=https://your-redmine-url.com
REDMINE_API_KEY=your_redmine_api_key
```

### 3. 슬래시 명령어 등록

```bash
node deploy-commands.js
```

### 4. 봇 실행

```bash
node index.js
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

## 요구 사항

- Node.js 18 이상
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications)에서 생성)
- Claude CLI 설치 및 인증 (`claude -p -` 명령어 사용)

## 프로젝트 구조

```
discord-bot/
├── index.js                 # 메인 진입점
├── config.js                # 설정 파일
├── deploy-commands.js       # 슬래시 명령어 등록
├── delete-guild-commands.js # 서버 전용 명령어 삭제
├── commands/
│   ├── index.js             # 명령어 모음
│   ├── help.js              # 도움말
│   ├── reminder.js          # 알림
│   ├── weeklyReport.js      # 주간보고
│   ├── pomodoro.js          # 뽀모도로 타이머
│   └── anonymous.js         # 익명 메시지
├── services/
│   ├── claude.js            # Claude CLI 호출
│   ├── events.js            # 디스코드 이벤트 알림
│   └── redmine.js           # Redmine API
└── utils/
    ├── time.js              # 시간 파싱
    └── error.js             # 에러 처리
```

## 시간 형식 예시

알림 설정 시 사용 가능한 시간 형식:
- `30분`
- `1시간`
- `2일`
- `1시간30분`
- `1일12시간`
