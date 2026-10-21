// 에러 메시지 처리
function getErrorMessage(error) {
  const errorMsg = error?.error?.error?.message || error?.message || '';

  if (error?.code === 'ENOENT') {
    return '❌ **Claude CLI를 찾을 수 없습니다.**\n`npm install -g @anthropic-ai/claude-code` 로 설치해주세요.';
  }
  if (errorMsg.includes('timed out')) {
    return '⏳ **응답 시간이 초과되었습니다.** 잠시 후 다시 시도해주세요.';
  }
  if (/rate limit|usage limit/i.test(errorMsg)) {
    return '⏳ **요청이 너무 많습니다.** 잠시 후 다시 시도해주세요.';
  }
  if (/not logged in|authenticat|\/login|invalid api key/i.test(errorMsg)) {
    return '🔑 **Claude CLI 인증이 필요합니다.** 봇 서버에서 `claude` 로그인 상태를 확인해주세요.';
  }
  if (errorMsg.includes('credit balance is too low')) {
    return '❌ **Claude 사용 크레딧이 부족합니다.** 관리자에게 문의해주세요.';
  }

  return '⚠️ 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

module.exports = {
  getErrorMessage,
};
