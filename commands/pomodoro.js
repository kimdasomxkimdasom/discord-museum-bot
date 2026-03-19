// commands/pomodoro.js
// 뽀모도로 타이머 기능

// 사용자별 타이머 저장
const pomodoroTimers = new Map();

// 타이머 시작
async function startPomodoro(interaction, client) {
  const userId = interaction.user.id;
  const minutes = interaction.options.getInteger('시간') || 25;

  // 기존 타이머 확인
  if (pomodoroTimers.has(userId)) {
    await interaction.reply({
      content: '⚠️ 이미 진행 중인 뽀모도로가 있어요!\n중지하려면 `/뽀모도로중지`를 사용하세요.',
      ephemeral: true
    });
    return;
  }

  const endTime = Date.now() + (minutes * 60 * 1000);

  const timeout = setTimeout(async () => {
    pomodoroTimers.delete(userId);

    try {
      const user = await client.users.fetch(userId);
      await user.send(`🍅 **뽀모도로 완료!**\n\n${minutes}분 집중 시간이 끝났어요.\n휴식하려면 \`/휴식\`을 사용하세요!`);
    } catch (error) {
      console.error('뽀모도로 알림 실패:', error);
    }
  }, minutes * 60 * 1000);

  pomodoroTimers.set(userId, {
    timeout,
    endTime,
    type: 'work',
    minutes
  });

  await interaction.reply({ content: `🍅 **뽀모도로 시작!**\n\n⏱️ ${minutes}분 집중 타이머가 시작되었어요.\n끝나면 DM으로 알려드릴게요!\n\n중지: \`/뽀모도로중지\``, ephemeral: true });
}

// 휴식 타이머
async function startBreak(interaction, client) {
  const userId = interaction.user.id;
  const isLong = interaction.options.getBoolean('긴휴식') || false;
  const minutes = isLong ? 15 : 5;

  // 기존 타이머 확인
  if (pomodoroTimers.has(userId)) {
    await interaction.reply({
      content: '⚠️ 이미 진행 중인 타이머가 있어요!\n중지하려면 `/뽀모도로중지`를 사용하세요.',
      ephemeral: true
    });
    return;
  }

  const endTime = Date.now() + (minutes * 60 * 1000);

  const timeout = setTimeout(async () => {
    pomodoroTimers.delete(userId);

    try {
      const user = await client.users.fetch(userId);
      await user.send(`☕ **휴식 끝!**\n\n${minutes}분 휴식이 끝났어요.\n다시 집중하려면 \`/뽀모도로\`를 사용하세요!`);
    } catch (error) {
      console.error('휴식 알림 실패:', error);
    }
  }, minutes * 60 * 1000);

  pomodoroTimers.set(userId, {
    timeout,
    endTime,
    type: 'break',
    minutes
  });

  const emoji = isLong ? '🛋️' : '☕';
  await interaction.reply({ content: `${emoji} **휴식 시작!**\n\n⏱️ ${minutes}분 휴식 타이머가 시작되었어요.\n끝나면 DM으로 알려드릴게요!`, ephemeral: true });
}

// 타이머 중지
async function stopPomodoro(interaction) {
  const userId = interaction.user.id;
  const timer = pomodoroTimers.get(userId);

  if (!timer) {
    await interaction.reply({ content: '진행 중인 타이머가 없어요.', ephemeral: true });
    return;
  }

  clearTimeout(timer.timeout);
  pomodoroTimers.delete(userId);

  const typeText = timer.type === 'work' ? '뽀모도로' : '휴식';
  await interaction.reply({ content: `⏹️ ${typeText} 타이머가 중지되었어요.`, ephemeral: true });
}

// 타이머 상태 확인
async function checkStatus(interaction) {
  const userId = interaction.user.id;
  const timer = pomodoroTimers.get(userId);

  if (!timer) {
    await interaction.reply({ content: '진행 중인 타이머가 없어요.\n`/뽀모도로`로 시작하세요!', ephemeral: true });
    return;
  }

  const remaining = Math.max(0, timer.endTime - Date.now());
  const remainingMin = Math.floor(remaining / 60000);
  const remainingSec = Math.floor((remaining % 60000) / 1000);

  const typeText = timer.type === 'work' ? '🍅 집중' : '☕ 휴식';
  await interaction.reply({
    content: `${typeText} 중\n⏱️ 남은 시간: **${remainingMin}분 ${remainingSec}초**`,
    ephemeral: true
  });
}

module.exports = {
  name: '뽀모도로',
  startPomodoro,
  startBreak,
  stopPomodoro,
  checkStatus,
};
