const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('../config');

// Claude CLI 작업 디렉토리 (봇 소스/.env와 분리된 빈 디렉토리)
const WORK_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'discord-bot-claude-'));

// Claude CLI를 사용하여 응답 생성
// - 도구(파일 읽기, 명령 실행 등)와 MCP 서버를 모두 끄고 텍스트 응답만 받는다
// - 프롬프트는 stdin으로 전달 (셸을 거치지 않음)
async function callClaude(prompt, systemPrompt = '') {
  return new Promise((resolve, reject) => {
    const args = ['-p', '-', '--tools', '', '--strict-mcp-config', '--no-session-persistence'];
    if (systemPrompt) {
      args.push('--system-prompt', systemPrompt);
    }

    const child = spawn('claude', args, {
      cwd: WORK_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    // 타임아웃
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish(reject, new Error('Claude CLI timed out'));
    }, config.claude.timeout);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        finish(resolve, stdout.trim());
      } else {
        console.error(`[Claude] 오류:`, stderr);
        finish(reject, new Error(`Claude CLI exited with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      console.error(`[Claude] 실행 실패:`, error.message);
      const err = new Error(`Failed to run Claude CLI: ${error.message}`);
      err.code = error.code;
      finish(reject, err);
    });

    // stdin으로 프롬프트 전달
    child.stdin.on('error', () => {}); // 프로세스가 먼저 종료된 경우 EPIPE 무시
    child.stdin.end(prompt, 'utf-8');
  });
}

module.exports = {
  callClaude,
};
