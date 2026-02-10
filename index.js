require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');

// 설정
const config = require('./config');

// 서비스
const { callClaude } = require('./services/claude');
const { startEventMonitoring } = require('./services/events');

// 명령어
const commands = require('./commands');
const { getErrorMessage } = require('./utils/error');

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
});

// 대화 히스토리 저장 (채널별: { messages: [], lastUsed: timestamp })
const conversationHistory = new Map();

// 오래된 대화 히스토리 정리 (1시간마다 실행, 30분 이상 미사용 채널 삭제)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1시간
const MAX_IDLE_TIME = 30 * 60 * 1000; // 30분

function cleanupConversationHistory() {
  const now = Date.now();
  let cleaned = 0;
  for (const [channelId, data] of conversationHistory.entries()) {
    if (now - data.lastUsed > MAX_IDLE_TIME) {
      conversationHistory.delete(channelId);
      cleaned++;
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

// 봇이 준비되면 실행
client.once('ready', () => {
  console.log(`봇이 ${client.user.tag}로 로그인했습니다!`);

  // 이벤트 알림 모니터링 시작
  startEventMonitoring(client);

  // 대화 히스토리 메모리 정리 시작
  setInterval(cleanupConversationHistory, CLEANUP_INTERVAL);
});

// ===== 슬래시 명령어 처리 =====
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    // 도움말
    if (commandName === '도움말' || commandName === 'help') {
      await commands.help.execute(interaction);
      return;
    }

    // 대화
    if (commandName === '대화') {
      const message = interaction.options.getString('메시지');
      await interaction.deferReply();

      const channelId = interaction.channel.id;
      const history = getHistory(channelId);

      history.push({ role: 'user', content: message });
      while (history.length > config.conversation.maxHistory) {
        history.shift();
      }

      const conversationText = history.map(msg => {
        const role = msg.role === 'user' ? '사용자' : '봇';
        return `${role}: ${msg.content}`;
      }).join('\n\n');

      const systemPrompt = '당신은 친절하고 도움이 되는 Discord 봇입니다. 한국어로 대화할 때는 한국어로, 영어로 대화할 때는 영어로 답변합니다. 답변은 Discord에서 읽기 좋게 간결하게 작성합니다.';
      const prompt = `이전 대화:\n${conversationText}\n\n위 대화의 마지막 사용자 메시지에 답변해주세요.`;

      const reply = await callClaude(prompt, systemPrompt);
      history.push({ role: 'assistant', content: reply });

      if (reply.length > 2000) {
        const chunks = reply.match(/[\s\S]{1,2000}/g);
        await interaction.editReply(chunks[0]);
        for (let i = 1; i < chunks.length; i++) {
          await interaction.followUp(chunks[i]);
        }
      } else {
        await interaction.editReply(reply);
      }
      return;
    }

    // 대화 초기화
    if (commandName === '초기화') {
      conversationHistory.delete(interaction.channel.id);
      await interaction.reply('대화 히스토리가 초기화되었습니다.');
      return;
    }

    // 알림 설정
    if (commandName === '알림') {
      await commands.reminder.executeSet(interaction, client);
      return;
    }

    // 알림 목록
    if (commandName === '알림목록') {
      await commands.reminder.executeList(interaction);
      return;
    }

    // 알림 삭제
    if (commandName === '알림삭제') {
      await commands.reminder.executeDelete(interaction);
      return;
    }

    // 주간보고
    if (commandName === '주간보고') {
      await commands.weeklyReport.execute(interaction);
      return;
    }

    // 뽀모도로
    if (commandName === '뽀모도로') {
      await commands.pomodoro.startPomodoro(interaction, client);
      return;
    }

    // 휴식
    if (commandName === '휴식') {
      await commands.pomodoro.startBreak(interaction, client);
      return;
    }

    // 뽀모도로 중지
    if (commandName === '뽀모도로중지') {
      await commands.pomodoro.stopPomodoro(interaction);
      return;
    }

    // 타이머 상태
    if (commandName === '타이머상태') {
      await commands.pomodoro.checkStatus(interaction);
      return;
    }

    // 익명 메시지
    if (commandName === '익명') {
      await commands.anonymous.execute(interaction);
      return;
    }

    // 익명 전체 메시지
    if (commandName === '익명전체') {
      await commands.anonymous.executeAll(interaction);
      return;
    }

  } catch (error) {
    console.error('슬래시 명령어 오류:', error);
    const errMsg = getErrorMessage(error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errMsg);
    } else {
      await interaction.reply({ content: errMsg, ephemeral: true });
    }
  }
});

// ===== 메시지 처리 (멘션 대화) =====
client.on('messageCreate', async (message) => {
  // 봇 메시지 무시
  if (message.author.bot) return;

  // ===== 멘션 대화 처리 =====
  const isMentioned = message.mentions.has(client.user);
  const isDM = !message.guild;

  if (!isMentioned && !isDM) return;

  // 멘션 제거하고 내용만 추출
  const textContent = message.content
    .replace(/<@!?\d+>/g, '')
    .trim();

  // 텍스트가 없으면
  if (!textContent) {
    await message.reply('무엇을 도와드릴까요? `/도움말`로 명령어를 확인하세요.');
    return;
  }

  // 타이핑 표시
  await message.channel.sendTyping();

  try {
    // 채널별 대화 히스토리 가져오기
    const channelId = message.channel.id;
    const history = getHistory(channelId);

    // 새 메시지 추가
    history.push({
      role: 'user',
      content: textContent,
    });

    // 히스토리가 너무 길면 오래된 메시지 제거
    while (history.length > config.conversation.maxHistory) {
      history.shift();
    }

    // 히스토리를 텍스트로 변환
    const conversationText = history.map(msg => {
      const role = msg.role === 'user' ? '사용자' : '봇';
      return `${role}: ${msg.content}`;
    }).join('\n\n');

    const systemPrompt = '당신은 친절하고 도움이 되는 Discord 봇입니다. 한국어로 대화할 때는 한국어로, 영어로 대화할 때는 영어로 답변합니다. 답변은 Discord에서 읽기 좋게 간결하게 작성합니다.';
    const prompt = `이전 대화:\n${conversationText}\n\n위 대화의 마지막 사용자 메시지에 답변해주세요.`;

    // Claude CLI 호출
    const reply = await callClaude(prompt, systemPrompt);

    // 응답을 히스토리에 추가
    history.push({
      role: 'assistant',
      content: reply,
    });

    // Discord 메시지 길이 제한 (2000자)
    if (reply.length > 2000) {
      const chunks = reply.match(/[\s\S]{1,2000}/g);
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      await message.reply(reply);
    }
  } catch (error) {
    console.error('에러 발생:', error);
    await message.reply(getErrorMessage(error));
  }
});

// 봇 로그인
client.login(process.env.DISCORD_TOKEN);
