// commands/anonymous.js
// 익명 메시지 전송 기능
const { MessageFlags } = require("discord.js");

// 개인에게 익명 메시지 전송
async function execute(interaction) {
  const targetUser = interaction.options.getUser("대상");
  const message = interaction.options.getString("메시지");
  const guild = interaction.guild;

  // 자기 자신에게 보내는 것 방지
  if (targetUser.id === interaction.user.id) {
    await interaction.reply({
      content: "자기 자신에게는 보낼 수 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 봇에게 보내는 것 방지
  if (targetUser.bot) {
    await interaction.reply({
      content: "봇에게는 보낼 수 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 같은 서버에 있는 멤버인지 확인
  try {
    const member = await guild.members.fetch(targetUser.id);
    if (!member) {
      await interaction.reply({
        content: "해당 사용자는 이 서버에 없습니다.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  } catch (error) {
    await interaction.reply({
      content: "해당 사용자는 이 서버에 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // DM 전송 시도
  try {
    await targetUser.send(
      `💌 **익명 메시지가 도착했습니다!**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `${message}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n`,
    );

    await interaction.reply({
      content: `✅ **${targetUser.displayName}**님에게 익명 메시지를 전송했습니다!`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    if (error.code === 50007) {
      await interaction.reply({
        content:
          "해당 사용자에게 DM을 보낼 수 없습니다.\n(DM이 차단되어 있거나 봇의 DM을 받지 않는 설정일 수 있습니다)",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `메시지 전송 중 오류가 발생했습니다: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

// 서버 전체에게 익명 메시지 전송
async function executeAll(interaction) {
  const message = interaction.options.getString("메시지");
  const guild = interaction.guild;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // 서버의 모든 멤버 가져오기
    const members = await guild.members.fetch({ time: 60000 });

    let successCount = 0;
    let failCount = 0;

    // 딜레이 함수 (Discord API 레이트 제한 방지)
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const member of members.values()) {
      // 봇과 발신자 제외
      if (member.user.bot || member.user.id === interaction.user.id) {
        continue;
      }

      try {
        await member.user.send(
          `💌 **익명 메시지가 도착했습니다!**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `${message}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n`,
        );
        successCount++;
      } catch (error) {
        failCount++;
      }

      // 레이트 제한 방지를 위한 딜레이 (500ms)
      await delay(500);
    }

    await interaction.editReply({
      content:
        `✅ 익명 메시지 전송 완료!\n\n` +
        `📬 성공: ${successCount}명\n` +
        `❌ 실패: ${failCount}명 (DM 차단 등)`,
    });
  } catch (error) {
    console.error(`[익명전체] 오류:`, error.message);
    await interaction.editReply({
      content: `메시지 전송 중 오류가 발생했습니다: ${error.message}`,
    });
  }
}

module.exports = {
  name: "익명",
  execute,
  executeAll,
};
