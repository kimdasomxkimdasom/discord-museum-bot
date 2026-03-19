const { EmbedBuilder } = require("discord.js");

async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📖 봇 사용 설명서")
    .setDescription(
      "안녕하세요! 저는 Claude AI 기반 Discord봇 꼬붕이입니다 🤓\n 로컬서버로 운영중이라 갑자기 맛이 갈 확률이 높아요..... \n 문제가 발생하면 관리자에게 문의해주세요!",
    )
    .addFields(
      {
        name: "💬 질문하기",
        value:
          "`/질문 메시지` - 봇과 대화\n봇을 @멘션해도 대화/질문할 수 있어요!",
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
        name: "📋 주간보고 작성",
        value:
          "`/주간보고 API키 사용자ID` - Redmine 주간보고 생성\n• API키: Redmine 개인 API 키\n• 시작일/종료일 생략 시 이번 주 월~금 자동 적용\n• 사용자ID: 프로필 URL에서 확인 (`users/123` → `123`)",
        inline: false,
      },
      {
        name: "🎲 뽑기",
        value:
          "`/뽑기 참가자` - 참가자 중 랜덤 뽑기\n• 쉼표 또는 공백으로 구분 (예: 철수 영희 민수)\n• `/뽑기 참가자 인원:2` - 여러 명 뽑기 가능",
        inline: false,
      },
      {
        name: "🪜 사다리타기",
        value:
          "`/사다리타기 참가자:철수 영희 민수` - 사다리타기 게임 시작\n• `결과:당첨 꽝 꽝` 직접 입력 가능 (쉼표 또는 공백)\n• 결과 미입력시 당첨 1명 + 꽝 자동 생성\n• 버튼 클릭으로 결과 공개 (최대 8명)",
        inline: false,
      },
      {
        name: "🍽️ 점심 투표",
        value:
          "`/점심투표 메뉴1 메뉴2 [메뉴3~5]` - 점심 메뉴 투표 시작\n• 버튼 클릭으로 투표 (다시 클릭하면 취소)\n`/점심마감` - 투표 마감 및 최종 결과 확인",
        inline: false,
      },
      {
        name: "🧮 계산기 & N빵",
        value:
          "`/계산기 수식` - 사칙연산 계산 (예: `(1000+2000)*3`)\n`/n빵 총액 인원` - 총액을 인원수로 균등 분할",
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
