// commands/pick.js
// 랜덤 뽑기
const { MessageFlags } = require("discord.js");

async function execute(interaction) {
  const input = interaction.options.getString("참가자");
  const count = interaction.options.getInteger("인원") || 1;

  // 쉼표 또는 공백으로 구분
  const participants = input
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (participants.length < 2) {
    await interaction.reply({
      content: "⚠️ 참가자를 2명 이상 입력해주세요!\n예: `/뽑기 철수 영희 민수`",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (count < 1 || count >= participants.length) {
    await interaction.reply({
      content: `⚠️ 뽑을 인원(${count}명)이 참가자 수(${participants.length}명)보다 적어야 합니다!`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Fisher-Yates 셔플 후 앞에서 count명 선택
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const winners = shuffled.slice(0, count);

  const participantList = participants.map((p) => `\`${p}\``).join(", ");
  const winnerList = winners.map((p) => `**${p}**`).join(", ");

  await interaction.reply(
    `🎲 **뽑기 결과!**\n\n👥 참가자: ${participantList}\n🎯 당첨: ${winnerList}`,
  );
}

module.exports = {
  name: "뽑기",
  execute,
};
