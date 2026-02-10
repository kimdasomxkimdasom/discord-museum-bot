const config = require('../config');

// 이벤트 알림 저장소 (이벤트ID_알림타입 형태로 저장)
const notifiedEvents = new Set();

// 오늘 날짜인지 확인 (한국 시간 기준)
function isToday(timestamp) {
  const eventDate = new Date(new Date(timestamp).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return eventDate.getFullYear() === today.getFullYear() &&
         eventDate.getMonth() === today.getMonth() &&
         eventDate.getDate() === today.getDate();
}

// 한국 시간 가져오기
function getKoreanTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

// 현재 시간이 아침 알림 시간대인지 확인 (설정된 시간 ~ +10분)
function isMorningNotifyTime() {
  const now = getKoreanTime();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const targetHour = config.events.morningNotifyHour;

  return hour === targetHour && minutes < 10;
}

// 알림 메시지 전송
async function sendEventNotification(event, guild, subscribers, notifyType, minutesLeft) {
  const startTime = new Date(event.scheduledStartTimestamp);
  const timeStr = startTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  let message;
  if (notifyType === 'morning') {
    message = `🔔 **오늘의 이벤트 알림!**\n\n` +
              `**${event.name}**\n` +
              `📍 ${event.channel?.name || '음성 채널'}\n` +
              `⏰ 오늘 **${timeStr}** 시작!\n\n` +
              `서버: ${guild.name}`;
  } else {
    message = `🔔 **이벤트 곧 시작!**\n\n` +
              `**${event.name}**\n` +
              `📍 ${event.channel?.name || '음성 채널'}\n` +
              `⏰ **약 ${minutesLeft}분 후** 시작!\n\n` +
              `서버: ${guild.name}`;
  }

  for (const subscriber of subscribers.values()) {
    try {
      await subscriber.user.send(message);
    } catch (dmError) {
      console.error(`[이벤트] DM 전송 실패: ${subscriber.user.tag} - ${dmError.message}`);
    }
  }
}

// 이벤트 알림 체크 함수
async function checkScheduledEvents(client) {
  const now = Date.now();
  const notifyMinutes = config.events.notifyMinutesBefore;
  const notifyBeforeMs = notifyMinutes * 60 * 1000;

  for (const guild of client.guilds.cache.values()) {
    try {
      const events = await guild.scheduledEvents.fetch();

      for (const event of events.values()) {
        const startTime = event.scheduledStartTimestamp;
        if (!startTime) continue;

        const timeUntilStart = startTime - now;
        const minutesUntil = Math.round(timeUntilStart / 60000);

        // 이미 지난 이벤트는 스킵
        if (timeUntilStart <= 0) continue;

        // 1. 당일 아침 알림 (오늘 이벤트 + 아침 시간대)
        const morningKey = `${event.id}_morning`;
        const isTodayEvent = isToday(startTime);
        const isMorning = isMorningNotifyTime();

        if (isTodayEvent && isMorning && !notifiedEvents.has(morningKey)) {
          try {
            const subscribers = await event.fetchSubscribers();
            if (subscribers.size > 0) {
              await sendEventNotification(event, guild, subscribers, 'morning', 0);
            }
            notifiedEvents.add(morningKey);
            setTimeout(() => notifiedEvents.delete(morningKey), 24 * 60 * 60 * 1000);
          } catch (subError) {
            console.error('[이벤트] 구독자 조회 실패:', subError.message);
          }
        }

        // 2. 시작 전 알림 (N분 전 이내면 알림)
        const beforeKey = `${event.id}_before`;

        if (timeUntilStart <= notifyBeforeMs && timeUntilStart > 0 && !notifiedEvents.has(beforeKey)) {
          try {
            const subscribers = await event.fetchSubscribers();
            if (subscribers.size > 0) {
              await sendEventNotification(event, guild, subscribers, 'before', minutesUntil);
            }
            notifiedEvents.add(beforeKey);
            setTimeout(() => notifiedEvents.delete(beforeKey), 60 * 60 * 1000);
          } catch (subError) {
            console.error('[이벤트] 구독자 조회 실패:', subError.message);
          }
        }
      }
    } catch (error) {
      console.error(`[이벤트] 체크 오류 (${guild.name}):`, error.message);
    }
  }
}

// 이벤트 모니터링 시작
function startEventMonitoring(client) {
  // 시작하자마자 한 번 체크
  checkScheduledEvents(client);

  // 이후 주기적으로 체크
  setInterval(() => checkScheduledEvents(client), config.events.checkInterval);
}

module.exports = {
  checkScheduledEvents,
  startEventMonitoring,
};
