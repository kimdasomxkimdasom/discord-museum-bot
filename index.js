require("dotenv").config();
const {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  MessageFlags,
} = require("discord.js");

// 설정
const config = require("./config");

// 서비스
const { callClaude } = require("./services/claude");
const { startEventMonitoring } = require("./services/events");

// 명령어
const commands = require("./commands");
const { getErrorMessage } = require("./utils/error");
const { isAllowedGuild, isAllowedUser } = require("./utils/access");

// Discord 클라이언트 설정
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildScheduledEvents,
  ],
  partials: [Partials.Channel],
  // 봇이 보내는 메시지로 @everyone/@here/역할 멘션이 울리지 않도록 차단
  allowedMentions: { parse: ["users"], repliedUser: true },
});

// ===== Claude 대화 =====

const SYSTEM_PROMPT =
  "당신은 친절하고 도움이 되는 Discord 봇입니다. 한국어로 대화할 때는 한국어로, 영어로 대화할 때는 영어로 답변합니다. 답변은 Discord에서 읽기 좋게 간결하게 작성합니다.";

// 대화 히스토리 저장 (채널별: { messages: [], lastUsed: timestamp })
const conversationHistory = new Map();

// 응답 생성 중인 채널 (같은 채널 동시 요청으로 히스토리 순서가 꼬이는 것 방지)
const busyChannels = new Set();

// 오래된 대화 히스토리 정리 (1시간마다 실행, 30분 이상 미사용 채널 삭제)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1시간
const MAX_IDLE_TIME = 30 * 60 * 1000; // 30분

function cleanupConversationHistory() {
  const now = Date.now();
  for (const [channelId, data] of conversationHistory.entries()) {
    if (now - data.lastUsed > MAX_IDLE_TIME) {
      conversationHistory.delete(channelId);
    }
  }
}

// 대화 히스토리 가져오기 (없으면 생성)
function getHistory(channelId) {
  if (!conversationHistory.has(channelId)) {
    conversationHistory.set(channelId, { messages: [], lastUsed: Date.now() });
  }
  const data = conversationHistory.get(channelId);
  data.lastUsed = Date.now();
  return data.messages;
}

// 히스토리에 질문을 추가하고 Claude 응답을 받아 히스토리에 저장
async function askClaude(channelId, speaker, text) {
  const history = getHistory(channelId);

  history.push({ role: "user", speaker, content: text });
  while (history.length > config.conversation.maxHistory) {
    history.shift();
  }

  const conversationText = history
    .map((msg) => {
      const role = msg.role === "user" ? `사용자(${msg.speaker})` : "봇";
      return `${role}: ${msg.content}`;
    })
    .join("\n\n");

  const prompt = `이전 대화:\n${conversationText}\n\n위 대화의 마지막 사용자 메시지에 답변해주세요.`;

  let reply;
  try {
    reply = await callClaude(prompt, SYSTEM_PROMPT);
  } catch (error) {
    // 실패한 질문은 히스토리에서 제거
    const index = history.findLastIndex((msg) => msg.content === text);
    if (index !== -1) history.splice(index, 1);
    throw error;
  }

  history.push({ role: "assistant", content: reply });
  return reply || "(응답이 비어 있습니다)";
}

// Discord 메시지 길이 제한(2000자)에 맞춰 분할
function splitMessage(text, size = 2000) {
  return text.match(new RegExp(`[\\s\\S]{1,${size}}`, "g")) || [""];
}

// ===== 봇 준비 =====

client.once(Events.ClientReady, () => {
  console.log(`봇이 ${client.user.tag}로 로그인했습니다!`);

  // 이벤트 알림 모니터링 시작
  startEventMonitoring(client);

  // 대화 히스토리 메모리 정리 시작
  setInterval(cleanupConversationHistory, CLEANUP_INTERVAL);
});

// ===== 슬래시 명령어 =====

async function handleAsk(interaction) {
  const channelId = interaction.channelId;
  if (busyChannels.has(channelId)) {
    await interaction.reply({
      content: "⏳ 이 채널의 이전 질문에 답변 중입니다. 잠시 후 다시 시도해주세요.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  busyChannels.add(channelId);
  try {
    const message = interaction.options.getString("메시지");
    await interaction.deferReply();

    const reply = await askClaude(channelId, interaction.user.displayName, message);
    const chunks = splitMessage(reply);
    await interaction.editReply(chunks[0]);
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp(chunks[i]);
    }
  } finally {
    busyChannels.delete(channelId);
  }
}

async function handleReset(interaction) {
  conversationHistory.delete(interaction.channelId);
  await interaction.reply("대화 히스토리가 초기화되었습니다.");
}

// 서버에서만 사용 가능한 명령어
function guildOnly(handler) {
  return async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "이 명령어는 서버에서만 사용할 수 있습니다.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await handler(interaction);
  };
}

const slashHandlers = {
  도움말: (i) => commands.help.execute(i),
  help: (i) => commands.help.execute(i),
  질문: handleAsk,
  초기화: handleReset,
  알림: (i) => commands.reminder.executeSet(i, client),
  알림목록: (i) => commands.reminder.executeList(i),
  알림삭제: (i) => commands.reminder.executeDelete(i),
  주간보고: (i) => commands.weeklyReport.execute(i),
  뽀모도로: (i) => commands.pomodoro.startPomodoro(i, client),
  휴식: (i) => commands.pomodoro.startBreak(i, client),
  뽀모도로중지: (i) => commands.pomodoro.stopPomodoro(i),
  타이머상태: (i) => commands.pomodoro.checkStatus(i),
  익명: guildOnly((i) => commands.anonymous.execute(i)),
  익명전체: guildOnly((i) => commands.anonymous.executeAll(i)),
  뽑기: (i) => commands.pick.execute(i),
  사다리타기: (i) => commands.ladder.execute(i),
  계산기: (i) => commands.calculator.execute(i),
  n빵: (i) => commands.split.execute(i),
  점심투표: (i) => commands.lunchVote.execute(i),
  점심마감: (i) => commands.lunchVote.executeClose(i),
};

const buttonHandlers = [
  [(id) => id.startsWith("lunch_vote_"), (i) => commands.lunchVote.handleButton(i)],
  [(id) => id === "ladder_reveal", (i) => commands.ladder.handleButton(i)],
];

// 인터랙션에 에러 메시지 응답 (응답 실패는 로그만 남김)
async function replyError(interaction, content) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
  } catch (error) {
    console.error("에러 응답 실패:", error.message);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // 허용된 서버/사용자인지 확인 (버튼 포함)
  if (!isAllowedGuild(interaction.guildId)) {
    await replyError(interaction, "이 서버에서는 사용할 수 없는 봇입니다.");
    return;
  }
  if (!isAllowedUser(interaction.user.id)) {
    await replyError(interaction, "사용 권한이 없습니다. 관리자에게 문의하세요.");
    return;
  }

  try {
    if (interaction.isChatInputCommand()) {
      const handler = slashHandlers[interaction.commandName];
      if (handler) await handler(interaction);
      return;
    }

    const entry = buttonHandlers.find(([match]) => match(interaction.customId));
    if (entry) await entry[1](interaction);
  } catch (error) {
    console.error("인터랙션 처리 오류:", error);
    const errMsg = interaction.isChatInputCommand()
      ? getErrorMessage(error)
      : "처리 중 오류가 발생했습니다.";
    await replyError(interaction, errMsg);
  }
});

// ===== 메시지 처리 (멘션 대화) =====

client.on(Events.MessageCreate, async (message) => {
  // 봇 메시지 무시
  if (message.author.bot) return;

  // 허용된 서버/사용자만
  if (!isAllowedGuild(message.guildId) || !isAllowedUser(message.author.id)) return;

  // 직접 멘션 또는 DM일 때만 응답 (@everyone, 역할 멘션은 무시)
  const isMentioned = message.mentions.has(client.user, {
    ignoreEveryone: true,
    ignoreRoles: true,
  });
  const isDM = !message.guild;

  if (!isMentioned && !isDM) return;

  const channelId = message.channelId;

  try {
    // 봇 멘션만 제거하고 내용 추출
    const textContent = message.content
      .replace(new RegExp(`<@!?${client.user.id}>`, "g"), "")
      .trim();

    // 텍스트가 없으면
    if (!textContent) {
      await message.reply(
        "무엇을 도와드릴까요? `/도움말`로 명령어를 확인하세요.",
      );
      return;
    }

    if (busyChannels.has(channelId)) {
      await message.reply("⏳ 이전 질문에 답변 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    busyChannels.add(channelId);
    try {
      // 타이핑 표시 (실패해도 무시)
      message.channel.sendTyping().catch(() => {});

      const reply = await askClaude(
        channelId,
        message.member?.displayName || message.author.displayName,
        textContent,
      );

      for (const chunk of splitMessage(reply)) {
        await message.reply(chunk);
      }
    } finally {
      busyChannels.delete(channelId);
    }
  } catch (error) {
    console.error("에러 발생:", error);
    await message.reply(getErrorMessage(error)).catch((e) => {
      console.error("에러 응답 실패:", e.message);
    });
  }
});

// ===== 전역 에러 처리 (프로세스가 죽지 않도록) =====

client.on(Events.Error, (error) => {
  console.error("Discord 클라이언트 오류:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("처리되지 않은 Promise 거부:", reason);
});

// 봇 로그인
client.login(process.env.DISCORD_TOKEN);
