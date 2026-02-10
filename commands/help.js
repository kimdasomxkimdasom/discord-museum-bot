const { EmbedBuilder } = require("discord.js");

async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📖 봇 사용 설명서")
    .setDescription("안녕하세요! 저는 Claude AI 기반 Discord 봇입니다.")
    .addFields(
      {
        name: "💬 질문하기",
        value:
          "`/질문 메시지` - 봇과 대화\n봇을 @멘션해도 대화/질문할 수 있어요!",
        inline: false,
      },
      {
        name: "📋 주간보고 작성",
        value:
          "`/주간보고 사용자ID` - Redmine 주간보고 생성\n• 시작일/종료일 생략 시 이번 주 월~금 자동 적용\n• 사용자ID: 프로필 URL에서 확인 (`users/123` → `123`)",
        inline: false,
      },
      {
        name: "⏰ 알림 설정",
        value:
          "`/알림 시간 메시지` - 지정한 시간 후 DM으로 알림 받기\n`/알림목록` - 내가 설정한 알림 목록 보기\n`/알림삭제 ID` - 설정한 알림 취소하기\n(예: `/알림 30분 회의 시작 5분 전 알림`)",
        inline: false,
      },
      {
        name: "🍅 뽀모도로",
        value:
          "`/뽀모도로` - 25분 집중 타이머\n`/휴식` - 5분 휴식 (긴휴식: 15분)\n`/뽀모도로중지` - 타이머 중지\n`/타이머상태` - 남은 시간 확인",
        inline: false,
      },
      {
        name: "💌 익명 메시지",
        value:
          "`/익명 @대상 메시지` - 특정 사용자에게 익명 DM 전송\n`/익명전체 메시지` - 서버 전체 멤버에게 익명 DM 전송",
        inline: false,
      },
      {
        name: "🔧 기타",
        value: "`/초기화` - 대화 기록 삭제\n`/도움말` - 이 도움말 표시",
        inline: false,
      },
    )
    .setFooter({ text: "Claude AI Discord Bot" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = {
  name: "help",
  nameKo: "도움말",
  execute,
};
