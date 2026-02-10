// 서버 전용 명령어 삭제 (글로벌 반영 후 실행)
require('dotenv').config();
const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [] },
    );
    console.log('✅ 서버 전용 (테스트) 명령어 삭제 완료!');
    console.log('이제 글로벌 명령어만 사용됩니다.');
  } catch (error) {
    console.error('삭제 오류:', error);
  }
})();
