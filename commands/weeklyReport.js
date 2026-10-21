// commands/weeklyReport.js
// 주간보고 슬래시 명령어

const { MessageFlags } = require('discord.js');
const { fetchTimeEntries, createWeeklyReport, getThisWeekDates, isValidDate } = require('../services/redmine');
const { getRedmineId } = require('../utils/access');

async function execute(interaction) {
  const apiKey = process.env.REDMINE_API_KEY;
  const startDate = interaction.options.getString('시작일');
  const endDate = interaction.options.getString('종료일');

  // API 키 확인
  if (!apiKey) {
    await interaction.reply({
      content: '❌ REDMINE_API_KEY가 설정되지 않았습니다.\n.env 파일에 REDMINE_API_KEY를 추가해주세요.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 본인 Redmine ID 조회 (본인 기록만 조회 가능)
  const userId = getRedmineId(interaction.user.id);
  if (!userId) {
    await interaction.reply({
      content: '❌ Redmine 계정이 연결되지 않았습니다.\n관리자에게 문의하세요. (REDMINE_USER_MAP)',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 날짜가 없으면 이번 주 월~금 사용
  const weekDates = getThisWeekDates();
  const from = startDate || weekDates.start;
  const to = endDate || weekDates.end;

  if (!isValidDate(from) || !isValidDate(to) || from > to) {
    await interaction.reply({
      content: '❌ 날짜는 `YYYY-MM-DD` 형식이어야 하고, 시작일이 종료일보다 늦을 수 없습니다.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // 시간 기록 조회
    const timeEntries = await fetchTimeEntries(apiKey, userId, from, to);

    // 주간보고 생성
    const report = await createWeeklyReport(apiKey, timeEntries);

    // Discord 메시지 길이 제한 (2000자)
    if (report.length > 1900) {
      // 여러 메시지로 분할
      const chunks = report.match(/[\s\S]{1,1900}/g) || [report];

      await interaction.editReply(`📋 **주간보고** (${from} ~ ${to})\n\`\`\`\n${chunks[0]}\n\`\`\``);

      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: `\`\`\`\n${chunks[i]}\n\`\`\``, flags: MessageFlags.Ephemeral });
      }
    } else {
      await interaction.editReply(`📋 **주간보고** (${from} ~ ${to})\n\`\`\`\n${report}\n\`\`\``);
    }
  } catch (error) {
    console.error(`[주간보고] 오류:`, error.message);
    await interaction.editReply(`❌ 주간보고 생성 중 오류가 발생했습니다.\n${error.message}`);
  }
}

module.exports = {
  name: '주간보고',
  execute,
};
