require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

// 슬래시 명령어 정의
const commands = [
  new SlashCommandBuilder()
    .setName("도움말")
    .setDescription("봇 사용법과 명령어 목록을 보여줍니다"),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show bot usage and command list"),

  new SlashCommandBuilder()
    .setName("알림")
    .setDescription("지정한 시간 후에 알림을 받습니다")
    .addStringOption((option) =>
      option
        .setName("시간")
        .setDescription("알림 시간 (예: 30분, 1시간, 1일)")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("메시지").setDescription("알림 메시지").setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("알림목록")
    .setDescription("설정된 알림 목록을 확인합니다"),

  new SlashCommandBuilder()
    .setName("알림삭제")
    .setDescription("설정된 알림을 삭제합니다")
    .addIntegerOption((option) =>
      option.setName("id").setDescription("삭제할 알림 ID").setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("초기화")
    .setDescription("대화 히스토리를 초기화합니다"),

  new SlashCommandBuilder()
    .setName("질문")
    .setDescription("봇과 대화합니다")
    .addStringOption((option) =>
      option
        .setName("메시지")
        .setDescription("봇에게 보낼 메시지")
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("주간보고")
    .setDescription("Redmine 시간 기록을 기반으로 주간보고를 생성합니다")
    .addStringOption((option) =>
      option
        .setName("api키")
        .setDescription("Redmine API 키")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("사용자id")
        .setDescription("Redmine 사용자 ID")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("시작일")
        .setDescription("시작 날짜 (YYYY-MM-DD, 기본: 이번주 월요일)")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("종료일")
        .setDescription("종료 날짜 (YYYY-MM-DD, 기본: 이번주 금요일)")
        .setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("뽀모도로")
    .setDescription("25분 집중 타이머를 시작합니다")
    .addIntegerOption((option) =>
      option
        .setName("시간")
        .setDescription("집중 시간 (분, 기본: 25분)")
        .setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("휴식")
    .setDescription("휴식 타이머를 시작합니다 (기본 5분)")
    .addBooleanOption((option) =>
      option
        .setName("긴휴식")
        .setDescription("긴 휴식 (15분)")
        .setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("뽀모도로중지")
    .setDescription("진행 중인 뽀모도로/휴식 타이머를 중지합니다"),

  new SlashCommandBuilder()
    .setName("타이머상태")
    .setDescription("현재 타이머 남은 시간을 확인합니다"),

  new SlashCommandBuilder()
    .setName("익명")
    .setDescription("같은 서버의 다른 사용자에게 익명 메시지를 보냅니다")
    .addUserOption((option) =>
      option
        .setName("대상")
        .setDescription("메시지를 받을 사용자")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("메시지")
        .setDescription("보낼 메시지 내용")
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("익명전체")
    .setDescription("서버의 모든 멤버에게 익명 메시지를 보냅니다")
    .addStringOption((option) =>
      option
        .setName("메시지")
        .setDescription("보낼 메시지 내용")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("뽑기")
    .setDescription("참가자 중 랜덤으로 뽑기")
    .addStringOption((option) =>
      option
        .setName("참가자")
        .setDescription("참가자 목록 (쉼표 또는 공백 구분, 예: 철수 영희 민수)")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("인원")
        .setDescription("뽑을 인원 수 (기본: 1명)")
        .setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("점심투표")
    .setDescription("점심 메뉴 투표를 시작합니다")
    .addStringOption((option) =>
      option.setName("메뉴1").setDescription("메뉴 1").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("메뉴2").setDescription("메뉴 2").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("메뉴3").setDescription("메뉴 3").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("메뉴4").setDescription("메뉴 4").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("메뉴5").setDescription("메뉴 5").setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("점심마감")
    .setDescription("진행 중인 점심 투표를 마감합니다"),

  new SlashCommandBuilder()
    .setName("계산기")
    .setDescription("수학 계산을 합니다")
    .addStringOption((option) =>
      option
        .setName("수식")
        .setDescription("계산할 수식 (예: (1000 + 2000) * 3)")
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("n빵")
    .setDescription("총액을 인원수로 균등 분할합니다")
    .addIntegerOption((option) =>
      option
        .setName("총액")
        .setDescription("나눌 총 금액 (원)")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("인원")
        .setDescription("나눌 인원 수")
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("사다리타기")
    .setDescription("사다리타기 게임을 시작합니다")
    .addStringOption((option) =>
      option
        .setName("참가자")
        .setDescription("참가자 목록 (쉼표 또는 공백 구분, 예: 철수 영희 민수)")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("결과")
        .setDescription("결과 목록 (쉼표 구분, 미입력시 당첨1+꽝)")
        .setRequired(false),
    ),
].map((command) => command.toJSON());

// 명령어 등록
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("슬래시 명령어 등록 시작...");

    // 1. 글로벌 명령어 등록 (모든 서버, 최대 1시간 소요)
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("글로벌 명령어 등록 완료! (반영까지 최대 1시간)");

    // 2. 서버 전용 명령어 등록 (즉시 반영, 테스트용)
    const testCommands = commands.map((cmd) => ({
      ...cmd,
      description: `(테스트) ${cmd.description}`,
    }));

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID,
      ),
      { body: testCommands },
    );
    console.log("서버 전용 명령어 등록 완료! (즉시 반영)");

    console.log(
      "\n등록된 명령어:",
      commands.map((c) => `/${c.name}`).join(", "),
    );
    console.log(
      "\n글로벌 반영 후 서버 전용 삭제: node delete-guild-commands.js",
    );
  } catch (error) {
    console.error("명령어 등록 오류:", error);
  }
})();
