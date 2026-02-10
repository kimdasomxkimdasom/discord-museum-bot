// commands/weeklyReport.js
// 주간보고 슬래시 명령어

const { setApiKey, fetchTimeEntries, createWeeklyReport, getThisWeekDates } = require('../services/redmine');

async function execute(interaction) {
  const apiKey = process.env.REDMINE_API_KEY;
  const userId = interaction.options.getInteger('사용자id');
  const startDate = interaction.options.getString('시작일');
  const endDate = interaction.options.getString('종료일');

  // API 키 확인
  if (!apiKey) {
    await interaction.reply({
      content: '❌ REDMINE_API_KEY가 설정되지 않았습니다.\n.env 파일에 REDMINE_API_KEY를 추가해주세요.',
      ephemeral: true,
    });
    return;
  }

  // 날짜가 없으면 이번 주 월~금 사용
  const weekDates = getThisWeekDates();
  const from = startDate || weekDates.start;
  const to = endDate || weekDates.end;

  await interaction.deferReply({ ephemeral: true });

  try {
    // API 키 설정
    setApiKey(apiKey);

    // 시간 기록 조회
    const timeEntries = await fetchTimeEntries(userId, from, to);

    // 주간보고 생성
    const report = await createWeeklyReport(timeEntries);

    // Discord 메시지 길이 제한 (2000자)
    if (report.length > 1900) {
      // 여러 메시지로 분할
      const chunks = report.match(/[\s\S]{1,1900}/g) || [report];

      await interaction.editReply(`📋 **주간보고** (${from} ~ ${to})\n\`\`\`\n${chunks[0]}\n\`\`\``);

      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: `\`\`\`\n${chunks[i]}\n\`\`\``, ephemeral: true });
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
