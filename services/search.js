// DuckDuckGo 웹 검색
async function webSearch(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const response = await fetch(url);
    const data = await response.json();

    let results = [];

    // 즉시 답변
    if (data.AbstractText) {
      results.push(`**요약**: ${data.AbstractText}`);
      if (data.AbstractURL) {
        results.push(`출처: ${data.AbstractURL}`);
      }
    }

    // 관련 토픽
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      results.push('\n**관련 정보**:');
      const topics = data.RelatedTopics.slice(0, 5);
      for (const topic of topics) {
        if (topic.Text) {
          results.push(`• ${topic.Text}`);
        }
      }
    }

    if (results.length === 0) {
      return `"${query}"에 대한 검색 결과를 찾지 못했습니다. 더 구체적인 키워드로 검색해보세요.`;
    }

    return results.join('\n');
  } catch (error) {
    return `검색 오류: ${error.message}`;
  }
}

module.exports = {
  webSearch,
};
