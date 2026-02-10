// 시간 문자열 파싱 (예: "30분", "1시간", "2일", "1시간30분")
function parseTime(timeStr) {
  let totalMs = 0;

  // 일
  const dayMatch = timeStr.match(/(\d+)\s*일/);
  if (dayMatch) totalMs += parseInt(dayMatch[1]) * 24 * 60 * 60 * 1000;

  // 시간
  const hourMatch = timeStr.match(/(\d+)\s*시간/);
  if (hourMatch) totalMs += parseInt(hourMatch[1]) * 60 * 60 * 1000;

  // 분
  const minMatch = timeStr.match(/(\d+)\s*분/);
  if (minMatch) totalMs += parseInt(minMatch[1]) * 60 * 1000;

  // 초
  const secMatch = timeStr.match(/(\d+)\s*초/);
  if (secMatch) totalMs += parseInt(secMatch[1]) * 1000;

  return totalMs;
}

// 밀리초를 읽기 쉬운 형식으로 변환
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts = [];
  if (days > 0) parts.push(`${days}일`);
  if (hours % 24 > 0) parts.push(`${hours % 24}시간`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}분`);
  if (seconds % 60 > 0 && days === 0 && hours === 0) parts.push(`${seconds % 60}초`);

  return parts.join(' ') || '0초';
}

module.exports = {
  parseTime,
  formatTime,
};
