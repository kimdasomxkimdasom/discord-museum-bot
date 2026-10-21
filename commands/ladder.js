// commands/ladder.js
// 사다리타기 게임
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

// 채널별 게임 데이터
const activeGames = new Map();

const BRIDGE = "──────";
const EMPTY = "      ";
// 결과 공개를 누르지 않고 방치된 게임은 이 시간이 지나면 새 게임으로 대체 가능
const GAME_TTL = 30 * 60 * 1000;
const ANIMALS = ["🐶", "🐱", "🐰", "🐻", "🐼", "🦊", "🐨", "🐯"];

// ===== 사다리 생성 =====

function generateBridges(numCols, numRows) {
  const bridges = [];
  for (let row = 0; row < numRows; row++) {
    const rowBridges = new Array(numCols - 1).fill(false);
    for (let col = 0; col < numCols - 1; col++) {
      if (col > 0 && rowBridges[col - 1]) continue;
      rowBridges[col] = Math.random() < 0.4;
    }
    if (!rowBridges.some((b) => b)) {
      rowBridges[Math.floor(Math.random() * (numCols - 1))] = true;
    }
    bridges.push(rowBridges);
  }

  // 모든 열이 최소 1개 가로줄에 연결되도록 보정
  for (let c = 0; c < numCols; c++) {
    let has = false;
    for (const rb of bridges) {
      if ((c > 0 && rb[c - 1]) || (c < numCols - 1 && rb[c])) {
        has = true;
        break;
      }
    }
    if (!has) {
      const row = Math.floor(Math.random() * numRows);
      const idx = c < numCols - 1 ? c : c - 1;
      if (idx > 0 && bridges[row][idx - 1]) bridges[row][idx - 1] = false;
      if (idx < numCols - 2 && bridges[row][idx + 1])
        bridges[row][idx + 1] = false;
      bridges[row][idx] = true;
    }
  }

  return bridges;
}

// ===== 경로 계산 =====

function calcPaths(bridges, numCols) {
  const paths = [];
  for (let p = 0; p < numCols; p++) {
    const path = [p];
    let col = p;
    for (const rb of bridges) {
      if (col > 0 && rb[col - 1]) col--;
      else if (col < numCols - 1 && rb[col]) col++;
      path.push(col);
    }
    paths.push(path);
  }
  return paths;
}

// ===== 렌더링 헬퍼 =====

function vLine(numCols) {
  let l = "  ";
  for (let c = 0; c < numCols; c++) {
    l += "│";
    if (c < numCols - 1) l += EMPTY;
  }
  return l;
}

function bridgeLine(rowBridges, numCols) {
  let line = "  ";
  for (let c = 0; c < numCols; c++) {
    const hasLeft = c > 0 && rowBridges[c - 1];
    const hasRight = c < numCols - 1 && rowBridges[c];
    line += hasLeft ? "┤" : hasRight ? "├" : "│";
    if (c < numCols - 1) line += rowBridges[c] ? BRIDGE : EMPTY;
  }
  return line;
}

// 다리 위에 이모지를 올린 가로줄 행
function bridgeLineEmoji(rowBridges, numCols, onBridgeIdx, pIndex) {
  let line = "  ";
  for (let c = 0; c < numCols; c++) {
    const hasLeft = c > 0 && rowBridges[c - 1];
    const hasRight = c < numCols - 1 && rowBridges[c];
    line += hasLeft ? "┤" : hasRight ? "├" : "│";
    if (c < numCols - 1) {
      if (c === onBridgeIdx && rowBridges[c]) {
        line += "──" + ANIMALS[pIndex] + "──";
      } else {
        line += rowBridges[c] ? BRIDGE : EMPTY;
      }
    }
  }
  return line;
}

function headerLine(numCols) {
  let h = " ";
  for (let c = 0; c < numCols; c++) {
    h += ANIMALS[c];
    if (c < numCols - 1) h += "     ";
  }
  return h;
}

function footerLine(numCols, revealed) {
  let f = " ";
  for (let c = 0; c < numCols; c++) {
    const label = revealed ? String.fromCharCode(65 + c) : "?";
    f += c === 0 ? " " + label : label.padStart(7);
  }
  return f;
}

// 단일 참가자 세로 마커 행
function markerSingle(numCols, col, pIndex) {
  let l = " ";
  for (let c = 0; c < numCols; c++) {
    l += c === col ? ANIMALS[pIndex] : " ·";
    if (c < numCols - 1) l += "     ";
  }
  return l;
}

// ===== 사다리 렌더링 =====

// 정적 (초기 / 최종)
function renderStatic(numCols, bridges, revealed) {
  const lines = [headerLine(numCols), vLine(numCols)];
  for (const rb of bridges) {
    lines.push(bridgeLine(rb, numCols));
    lines.push(vLine(numCols));
  }
  lines.push(footerLine(numCols, revealed));
  return lines.join("\n");
}

// 세로 위치 프레임 (참가자가 특정 행에 있음)
function renderVertical(numCols, bridges, step, col, pIndex) {
  const lines = [headerLine(numCols)];
  lines.push(step === 0 ? markerSingle(numCols, col, pIndex) : vLine(numCols));
  for (let row = 0; row < bridges.length; row++) {
    lines.push(bridgeLine(bridges[row], numCols));
    lines.push(
      step === row + 1 ? markerSingle(numCols, col, pIndex) : vLine(numCols),
    );
  }
  lines.push(footerLine(numCols, false));
  return lines.join("\n");
}

// 가로 이동 프레임 (참가자가 다리 위에 있음)
function renderHorizontal(numCols, bridges, bridgeRow, bridgeIdx, pIndex) {
  const lines = [headerLine(numCols)];
  lines.push(vLine(numCols));
  for (let row = 0; row < bridges.length; row++) {
    if (row === bridgeRow) {
      lines.push(bridgeLineEmoji(bridges[row], numCols, bridgeIdx, pIndex));
    } else {
      lines.push(bridgeLine(bridges[row], numCols));
    }
    lines.push(vLine(numCols));
  }
  lines.push(footerLine(numCols, false));
  return lines.join("\n");
}

// ===== 임베드 =====

function buildStaticEmbed(data, revealed) {
  const numCols = data.participants.length;
  const ladder = renderStatic(numCols, data.bridges, revealed);
  const pList = data.participants
    .map((p, i) => `${ANIMALS[i]} ${p}`)
    .join("  ");
  let desc = `👥 ${pList}\n\n\`\`\`\n${ladder}\n\`\`\``;

  if (revealed) {
    const paths = calcPaths(data.bridges, numCols);
    const labels = data.results
      .map((r, i) => `**${String.fromCharCode(65 + i)}** = ${r}`)
      .join(", ");
    desc += `\n🎯 ${labels}\n\n`;
    const mapping = data.participants.map((p, i) => {
      const endCol = paths[i][paths[i].length - 1];
      const letter = String.fromCharCode(65 + endCol);
      return `${ANIMALS[i]} **${p}** → ${letter}(**${data.results[endCol]}**)`;
    });
    desc += mapping.join("\n");
  }

  return new EmbedBuilder()
    .setColor(revealed ? 0xfee75c : 0x5865f2)
    .setTitle("🪜 사다리타기")
    .setDescription(desc)
    .setTimestamp();
}

function buildFrameEmbed(data, ladderStr, pIndex, revealedResults) {
  const pList = data.participants
    .map((p, i) => `${ANIMALS[i]} ${p}`)
    .join("  ");
  let desc = `👥 ${pList}\n\n\`\`\`\n${ladderStr}\n\`\`\``;
  if (revealedResults.length > 0) {
    desc += "\n" + revealedResults.join("\n");
  }
  desc += `\n\n${ANIMALS[pIndex]} **${data.participants[pIndex]}** 추적 중...`;

  return new EmbedBuilder()
    .setColor(0xfe8b3e)
    .setTitle("🪜 사다리타기")
    .setDescription(desc)
    .setTimestamp();
}

// ===== 명령어 실행 =====

async function execute(interaction) {
  const channelId = interaction.channelId;

  const existing = activeGames.get(channelId);
  if (
    existing &&
    (existing.revealing || Date.now() - existing.createdAt < GAME_TTL)
  ) {
    await interaction.reply({
      content: "이미 진행 중인 사다리타기가 있습니다!",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const input = interaction.options.getString("참가자");
  const resultsInput = interaction.options.getString("결과");

  const participants = input
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (participants.length < 2) {
    await interaction.reply({
      content: "⚠️ 참가자를 2명 이상 입력해주세요!",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (participants.length > 8) {
    await interaction.reply({
      content: "⚠️ 참가자는 최대 8명까지 가능합니다!",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let results;
  if (resultsInput) {
    results = resultsInput
      .split(/[,\s]+/)
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
    if (results.length !== participants.length) {
      await interaction.reply({
        content: `⚠️ 결과 수(${results.length})와 참가자 수(${participants.length})가 일치해야 합니다!`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  } else {
    results = new Array(participants.length).fill("꽝");
    results[Math.floor(Math.random() * results.length)] = "당첨";
  }

  // 결과 섞기
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }

  const numRows = Math.min(Math.max(participants.length, 4), 7);
  const bridges = generateBridges(participants.length, numRows);

  const data = {
    participants,
    results,
    bridges,
    creatorId: interaction.user.id,
    createdAt: Date.now(),
    revealing: false,
  };
  const embed = buildStaticEmbed(data, false);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ladder_reveal")
      .setLabel("결과 공개 🎉")
      .setStyle(ButtonStyle.Success),
  );

  const response = await interaction.reply({
    embeds: [embed],
    components: [row],
    withResponse: true,
  });

  data.messageId = response.resource.message.id;
  activeGames.set(channelId, data);
}

// ===== 버튼 처리 (한 마리씩 + 가로 이동 애니메이션) =====

async function handleButton(interaction) {
  const channelId = interaction.channelId;
  const data = activeGames.get(channelId);

  // 이 메시지의 게임이 아니면 (만료되었거나 새 게임으로 대체됨)
  if (!data || data.messageId !== interaction.message.id) {
    await interaction.reply({
      content: "진행 중인 사다리타기가 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 동시에 여러 명이 눌러도 한 번만 공개
  if (data.revealing) {
    await interaction.reply({
      content: "이미 결과를 공개하는 중입니다!",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  data.revealing = true;

  try {
    await revealResults(interaction, data);
  } finally {
    activeGames.delete(channelId);
  }
}

async function revealResults(interaction, data) {
  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ladder_reveal")
      .setLabel("추적 중...")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  );
  await interaction.update({ components: [disabledRow] });

  const numCols = data.participants.length;
  const paths = calcPaths(data.bridges, numCols);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // 인원에 따라 속도 조절
  const stepDelay = numCols <= 3 ? 900 : numCols <= 5 ? 700 : 500;
  const revealedResults = [];

  for (let p = 0; p < numCols; p++) {
    let col = paths[p][0];

    // 시작 위치 프레임
    const startLadder = renderVertical(numCols, data.bridges, 0, col, p);
    await interaction.message.edit({
      embeds: [buildFrameEmbed(data, startLadder, p, revealedResults)],
    });
    await wait(stepDelay);

    // 각 가로줄 통과
    for (let row = 0; row < data.bridges.length; row++) {
      const nextCol = paths[p][row + 1];

      if (nextCol !== col) {
        // 가로 이동 프레임 (다리 위)
        const bridgeIdx = Math.min(col, nextCol);
        const hLadder = renderHorizontal(
          numCols,
          data.bridges,
          row,
          bridgeIdx,
          p,
        );
        await interaction.message.edit({
          embeds: [buildFrameEmbed(data, hLadder, p, revealedResults)],
        });
        await wait(stepDelay);
      }

      col = nextCol;

      // 5+ 인원이면 이동 없는 행은 건너뛰기
      if (numCols >= 5 && nextCol === paths[p][row]) continue;

      // 세로 위치 프레임
      const vLadder = renderVertical(numCols, data.bridges, row + 1, col, p);
      await interaction.message.edit({
        embeds: [buildFrameEmbed(data, vLadder, p, revealedResults)],
      });
      await wait(stepDelay);
    }

    // 이 참가자 결과 공개
    const endCol = paths[p][paths[p].length - 1];
    const letter = String.fromCharCode(65 + endCol);
    revealedResults.push(
      `${ANIMALS[p]} **${data.participants[p]}** → ${letter}(**${data.results[endCol]}**)`,
    );

    await wait(300);
  }

  // 최종 결과
  const finalEmbed = buildStaticEmbed(data, true);
  const finalRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ladder_reveal")
      .setLabel("결과 공개 완료")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  );
  await interaction.message.edit({
    embeds: [finalEmbed],
    components: [finalRow],
  });
}

module.exports = {
  name: "사다리타기",
  execute,
  handleButton,
};
