const { MessageFlags } = require("discord.js");
const {
  parseTime,
  formatTime,
  setLongTimeout,
  clearLongTimeout,
} = require("../utils/time");
const config = require("../config");

// 알림 저장소 (사용자별)
const reminders = new Map();
let reminderIdCounter = 1;

// 알림 설정 내부 함수
function setReminder(userId, channelId, reminderMessage, delayMs, client) {
  const id = reminderIdCounter++;
  const executeAt = Date.now() + delayMs;

  const timeout = setLongTimeout(async () => {
    try {
      const user = await client.users.fetch(userId);
      await user.send(`⏰ **알림!**\n${reminderMessage}`);
    } catch (error) {
      // DM 실패 시 채널에 전송 시도
      try {
        const channel = await client.channels.fetch(channelId);
        await channel.send(`⏰ <@${userId}> **알림!**\n${reminderMessage}`);
      } catch (e) {
        console.error(`[알림] 전송 실패:`, e.message);
      }
    }

    // 알림 삭제
    const userReminders = reminders.get(userId);
    if (userReminders) {
      const index = userReminders.findIndex((r) => r.id === id);
      if (index !== -1) userReminders.splice(index, 1);
    }
  }, delayMs);

  // 저장
  if (!reminders.has(userId)) {
    reminders.set(userId, []);
  }
  reminders.get(userId).push({
    id,
    message: reminderMessage,
    executeAt,
    timeout,
    channelId,
  });

  return id;
}

// 알림 설정 명령어 (슬래시)
async function executeSet(interaction, client) {
  const timeStr = interaction.options.getString("시간");
  const reminderMessage = interaction.options.getString("메시지") || "알림!";

  const delayMs = parseTime(timeStr);

  if (delayMs <= 0) {
    await interaction.reply({
      content:
        "올바른 시간 형식을 입력해주세요.\n예: `30분`, `1시간`, `2일`, `1시간30분`",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 최대 30일
  const maxMs = config.reminder.maxDays * 24 * 60 * 60 * 1000;
  if (delayMs > maxMs) {
    await interaction.reply({
      content: `알림은 최대 ${config.reminder.maxDays}일까지 설정할 수 있습니다.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 사용자별 최대 개수
  const userReminders = reminders.get(interaction.user.id) || [];
  if (userReminders.length >= config.reminder.maxPerUser) {
    await interaction.reply({
      content: `알림은 최대 ${config.reminder.maxPerUser}개까지 설정할 수 있습니다. \`/알림삭제\`로 정리해주세요.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const id = setReminder(
    interaction.user.id,
    interaction.channelId,
    reminderMessage,
    delayMs,
    client,
  );
  const timeFormatted = formatTime(delayMs);

  await interaction.reply({
    content: `⏰ **알림 설정 완료!**\n\n• ID: \`${id}\`\n• 시간: ${timeFormatted} 후\n• 메시지: ${reminderMessage}\n\nDM으로 알림을 보내드릴게요!\n\n⚠️ *서버 재시작 시 알림이 초기화될 수 있습니다.*`,
    flags: MessageFlags.Ephemeral,
  });
}

// 알림 목록 명령어 (슬래시)
async function executeList(interaction) {
  const userReminders = reminders.get(interaction.user.id);

  if (!userReminders || userReminders.length === 0) {
    await interaction.reply({
      content: "설정된 알림이 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const now = Date.now();
  const list = userReminders
    .map((r) => {
      const remaining = formatTime(r.executeAt - now);
      return `• ID \`${r.id}\`: ${remaining} 후 - "${r.message}"`;
    })
    .join("\n");

  await interaction.reply({
    content: `**설정된 알림 목록**\n\n${list}\n\n삭제: \`/알림삭제 ID\``,
    flags: MessageFlags.Ephemeral,
  });
}

// 알림 삭제 명령어 (슬래시)
async function executeDelete(interaction) {
  const id = interaction.options.getInteger("id");

  const userReminders = reminders.get(interaction.user.id);
  if (!userReminders) {
    await interaction.reply({
      content: "설정된 알림이 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const index = userReminders.findIndex((r) => r.id === id);
  if (index === -1) {
    await interaction.reply({
      content: `ID \`${id}\` 알림을 찾을 수 없습니다.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  clearLongTimeout(userReminders[index].timeout);
  userReminders.splice(index, 1);

  await interaction.reply({ content: `✅ 알림 ID \`${id}\`가 삭제되었습니다.`, flags: MessageFlags.Ephemeral });
}

module.exports = {
  name: "알림",
  executeSet,
  executeList,
  executeDelete,
};
