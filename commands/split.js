function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function execute(interaction) {
  const total = interaction.options.getInteger("총액");
  const people = interaction.options.getInteger("인원");

  if (total <= 0) {
    await interaction.reply({
      content: "❌ 총액은 0보다 커야 합니다.",
      ephemeral: true,
    });
    return;
  }

  if (people <= 0) {
    await interaction.reply({
      content: "❌ 인원은 0보다 커야 합니다.",
      ephemeral: true,
    });
    return;
  }

  const perPerson = Math.floor(total / people);
  const remainder = total % people;

  let message = `💰 **N빵 계산기**\n`;
  message += `총액: **${formatNumber(total)}원**\n`;
  message += `인원: **${people}명**\n`;
  message += `━━━━━━━━━━━━━━━\n`;
  message += `1인당: **${formatNumber(perPerson)}원**`;

  if (remainder > 0) {
    message += `\n나머지: **${formatNumber(remainder)}원**`;
  }

  await interaction.reply(message);
}

module.exports = { execute };
