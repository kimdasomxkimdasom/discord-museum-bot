const { spawn } = require('child_process');
const config = require('../config');

// Claude CLI를 사용하여 응답 생성
async function callClaude(prompt, systemPrompt = '') {
  return new Promise((resolve, reject) => {
    const fullPrompt = systemPrompt
      ? `[System: ${systemPrompt}]\n\n${prompt}`
      : prompt;

    const child = spawn('claude', ['-p', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        console.error(`[Claude] 오류:`, stderr);
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      console.error(`[Claude] 실행 실패:`, error.message);
      reject(new Error(`Failed to run Claude CLI: ${error.message}`));
    });

    // stdin으로 프롬프트 전달
    child.stdin.write(fullPrompt, 'utf-8', () => {
      child.stdin.end();
    });

    // 타임아웃
    setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Claude CLI timed out'));
    }, config.claude.timeout);
  });
}

module.exports = {
  callClaude,
};
