module.exports = {
  // Claude CLI 설정
  claude: {
    timeout: 120000, // 2분
  },

  // 알림 설정
  reminder: {
    maxDays: 30,
    maxPerUser: 10,
  },

  // 이벤트 알림 설정
  events: {
    checkInterval: 10 * 60 * 1000, // 10분마다 체크
    morningNotifyHour: 9, // 당일 아침 알림 시간 (9시)
    notifyMinutesBefore: 10, // 이벤트 시작 N분 전 알림
  },

  // 대화 히스토리 설정
  conversation: {
    maxHistory: 10,
  },
};
