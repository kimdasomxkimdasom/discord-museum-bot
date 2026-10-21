// 접근 제어 및 사용자 매핑 (.env 기반)

// "a,b,c" -> Set (비어 있으면 빈 Set)
function parseList(value) {
  return new Set(
    (value || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  );
}

const allowedGuildIds = parseList(process.env.ALLOWED_GUILD_IDS);
const allowedUserIds = parseList(process.env.ALLOWED_USER_IDS);

// "discordId:redmineId,discordId:redmineId" -> Map
const redmineUserMap = new Map(
  [...parseList(process.env.REDMINE_USER_MAP)]
    .map((pair) => pair.split(':').map((v) => v.trim()))
    .filter(([discordId, redmineId]) => discordId && /^\d+$/.test(redmineId))
    .map(([discordId, redmineId]) => [discordId, Number(redmineId)]),
);

// 허용된 서버인지 (목록이 비어 있으면 모두 허용, DM은 guildId가 없으므로 통과)
function isAllowedGuild(guildId) {
  return !guildId || allowedGuildIds.size === 0 || allowedGuildIds.has(guildId);
}

// 허용된 사용자인지 (목록이 비어 있으면 모두 허용)
function isAllowedUser(userId) {
  return allowedUserIds.size === 0 || allowedUserIds.has(userId);
}

function getRedmineId(discordId) {
  return redmineUserMap.get(discordId) ?? null;
}

module.exports = {
  isAllowedGuild,
  isAllowedUser,
  getRedmineId,
};
