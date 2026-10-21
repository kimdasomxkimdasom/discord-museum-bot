// commands/lunchVote.js
// 점심 메뉴 투표 기능
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

// 채널별 투표 데이터 저장 (channelId -> { menus, votes, creatorId, messageId })
// votes: Map<menuIndex, Set<userId>>
const activeVotes = new Map();

// 마감하지 않고 방치된 투표는 이 시간이 지나면 새 투표로 대체 가능
const VOTE_TTL = 6 * 60 * 60 * 1000;

// 투표 임베드 생성
function buildVoteEmbed(data, closed = false) {
  const totalVotes = data.menus.reduce((sum, _, i) => {
    return sum + (data.votes.get(i)?.size || 0);
  }, 0);

  const lines = data.menus.map((menu, i) => {
    const count = data.votes.get(i)?.size || 0;
    const bar = "🟦".repeat(count) || "⬜";
    const voters = data.votes.get(i)?.size
      ? [...data.votes.get(i)].map((id) => `<@${id}>`).join(", ")
      : "";
    return `**${menu}** — ${count}표 ${bar}${voters ? `\n└ ${voters}` : ""}`;
  });

  const embed = new EmbedBuilder()
    .setColor(closed ? 0xed4245 : 0x57f287)
    .setTitle(closed ? "🍽️ 점심 투표 결과 (마감)" : "🍽️ 점심 메뉴 투표")
    .setDescription(lines.join("\n\n"))
    .setFooter({ text: `총 ${totalVotes}표` })
    .setTimestamp();

  if (closed) {
    // 최다 득표 메뉴 찾기
    let maxCount = 0;
    data.menus.forEach((_, i) => {
      const count = data.votes.get(i)?.size || 0;
      if (count > maxCount) maxCount = count;
    });

    if (maxCount > 0) {
      const winners = data.menus.filter(
        (_, i) => (data.votes.get(i)?.size || 0) === maxCount,
      );
      embed.addFields({
        name: "🏆 결과",
        value:
          winners.length > 1
            ? `**${winners.join(", ")}** 동률! (${maxCount}표)`
            : `**${winners[0]}** 당선! (${maxCount}표)`,
      });
    }
  }

  return embed;
}

// 버튼 행 생성
function buildButtons(menus, disabled = false) {
  const row = new ActionRowBuilder();
  menus.forEach((menu, i) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`lunch_vote_${i}`)
        .setLabel(menu)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
    );
  });
  return row;
}

// /점심투표 실행
async function execute(interaction) {
  const channelId = interaction.channelId;

  // 이미 진행 중인 투표가 있는지 확인
  const existing = activeVotes.get(channelId);
  if (existing && Date.now() - existing.createdAt < VOTE_TTL) {
    await interaction.reply({
      content:
        "이미 진행 중인 투표가 있습니다! `/점심마감`으로 먼저 마감해주세요.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 메뉴 옵션 수집
  const menus = [];
  for (let i = 1; i <= 5; i++) {
    const menu = interaction.options.getString(`메뉴${i}`);
    if (menu) menus.push(menu);
  }

  if (menus.length < 2) {
    await interaction.reply({
      content: "최소 2개 이상의 메뉴를 입력해주세요.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 투표 데이터 초기화
  const votes = new Map();
  menus.forEach((_, i) => votes.set(i, new Set()));

  const data = {
    menus,
    votes,
    creatorId: interaction.user.id,
    createdAt: Date.now(),
  };

  const embed = buildVoteEmbed(data);
  const row = buildButtons(menus);

  const reply = await interaction.reply({
    content: `📢 **${interaction.user.displayName}**님이 점심 투표를 시작했습니다! 버튼을 눌러 투표하세요. (다시 누르면 취소)`,
    embeds: [embed],
    components: [row],
    withResponse: true,
  });

  data.messageId = reply.resource.message.id;
  activeVotes.set(channelId, data);
}

// 버튼 클릭 처리
async function handleButton(interaction) {
  const channelId = interaction.channelId;
  const data = activeVotes.get(channelId);

  // 이 메시지의 투표가 아니면 (마감되었거나 새 투표로 대체됨)
  if (!data || data.messageId !== interaction.message.id) {
    await interaction.reply({
      content: "진행 중인 투표가 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const menuIndex = parseInt(interaction.customId.replace("lunch_vote_", ""));
  const userId = interaction.user.id;
  const voterSet = data.votes.get(menuIndex);

  if (!voterSet) {
    await interaction.deferUpdate();
    return;
  }

  // 다른 메뉴에 이미 투표했으면 해제
  let action;
  if (voterSet.has(userId)) {
    // 같은 메뉴 다시 클릭 -> 취소
    voterSet.delete(userId);
    action = "cancel";
  } else {
    // 다른 메뉴 투표 해제 후 새 메뉴에 투표
    for (const [idx, voters] of data.votes.entries()) {
      if (idx !== menuIndex) voters.delete(userId);
    }
    voterSet.add(userId);
    action = "vote";
  }

  // 메시지 업데이트
  const embed = buildVoteEmbed(data);
  const row = buildButtons(data.menus);

  await interaction.update({
    embeds: [embed],
    components: [row],
  });
}

// /점심마감 실행
async function executeClose(interaction) {
  const channelId = interaction.channelId;
  const data = activeVotes.get(channelId);

  if (!data) {
    await interaction.reply({
      content: "진행 중인 투표가 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 마감 처리
  const embed = buildVoteEmbed(data, true);
  const row = buildButtons(data.menus, true);

  await interaction.reply({
    content: "🔔 **점심 투표가 마감되었습니다!**",
    embeds: [embed],
    components: [row],
  });

  // 투표 데이터 삭제
  activeVotes.delete(channelId);

  // 원래 투표 메시지의 버튼도 비활성화
  await interaction.channel?.messages
    .edit(data.messageId, { components: [row] })
    .catch(() => {});
}

module.exports = {
  name: "점심투표",
  execute,
  handleButton,
  executeClose,
};
