// 에러 메시지 처리
function getErrorMessage(error) {
  const errorMsg = error?.error?.error?.message || error?.message || '';

  if (errorMsg.includes('credit balance is too low')) {
    return '❌ **API 크레딧이 부족합니다!**\nhttps://console.anthropic.com 에서 크레딧을 충전해주세요.';
  }
  if (errorMsg.includes('rate limit')) {
    return '⏳ **요청이 너무 많습니다.** 잠시 후 다시 시도해주세요.';
  }
  if (errorMsg.includes('invalid_api_key') || errorMsg.includes('authentication')) {
    return '🔑 **API 키가 유효하지 않습니다.** .env 파일을 확인해주세요.';
  }
  if (errorMsg.includes('Claude CLI') || errorMsg.includes('ENOENT') || errorMsg.includes('not found')) {
    return '❌ **Claude CLI를 찾을 수 없습니다.**\n`npm install -g @anthropic-ai/claude-code` 로 설치해주세요.';
  }
  if (errorMsg.includes('timed out')) {
    return '⏳ **응답 시간이 초과되었습니다.** 잠시 후 다시 시도해주세요.';
  }

  return '⚠️ 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

module.exports = {
  getErrorMessage,
};
