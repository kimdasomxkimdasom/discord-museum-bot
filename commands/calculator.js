const { MessageFlags } = require("discord.js");

// 안전한 수학 표현식 평가 (eval 사용 금지)
function safeEvaluate(expression) {
  // 허용 문자: 숫자, 소수점, 사칙연산, 괄호, 공백
  const sanitized = expression.replace(/\s/g, "");
  if (!/^[0-9+\-*/().]+$/.test(sanitized)) {
    throw new Error("허용되지 않는 문자가 포함되어 있습니다.");
  }

  // 빈 괄호, 연산자 연속 등 기본 검증
  if (/\(\)/.test(sanitized)) {
    throw new Error("빈 괄호가 있습니다.");
  }
  if (/[+\-*/]{2,}/.test(sanitized.replace(/[+\-](?=[+\-])/g, ""))) {
    throw new Error("잘못된 수식입니다.");
  }

  const fn = new Function(`"use strict"; return (${sanitized});`);
  const result = fn();

  if (typeof result !== "number" || !isFinite(result)) {
    throw new Error("계산 결과가 유효하지 않습니다.");
  }

  return result;
}

function formatNumber(num) {
  // 소수점이 있으면 불필요한 0 제거 후 천단위 구분
  const parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

async function execute(interaction) {
  const expression = interaction.options.getString("수식");

  try {
    const result = safeEvaluate(expression);
    await interaction.reply(
      `🧮 \`${expression}\`\n**결과: ${formatNumber(result)}**`,
    );
  } catch (error) {
    await interaction.reply({
      content: `❌ 계산 오류: ${error.message}\n사용 가능: 숫자, +, -, *, /, (, )`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = { execute };
