// services/redmine.js
// Redmine API 호출 및 주간보고 생성

const https = require('https');
const http = require('http');
const { URL } = require('url');

const BASE_URL = process.env.REDMINE_BASE_URL;

// 한 번에 가져올 최대 건수 (Redmine 최대값 100, 기본값 25)
const PAGE_LIMIT = 100;

// HTTP 요청 헬퍼 함수
function request(url, apiKey) {
  return new Promise((resolve, reject) => {
    if (!BASE_URL) {
      reject(new Error('REDMINE_BASE_URL이 설정되지 않았습니다.'));
      return;
    }
    if (!apiKey) {
      reject(new Error('API 키가 설정되지 않았습니다.'));
      return;
    }

    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'X-Redmine-API-Key': apiKey
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          const err = new Error(`Redmine API 오류 (${res.statusCode})`);
          err.statusCode = res.statusCode;
          reject(err);
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('JSON 파싱 오류'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('요청 시간 초과'));
    });
    req.end();
  });
}

function buildUrl(pathname, params = {}) {
  const url = new URL(pathname, BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

// 프로젝트명에서 앞의 "숫자." 제거
function cleanProjectName(name) {
  return name.replace(/^\d+\./, '').trim();
}

// Textile 표 안에서 칸 구분자로 해석되지 않도록 | 이스케이프
function escapeCell(text) {
  return String(text ?? '').replace(/\|/g, '&#124;');
}

// 시간 기록 데이터 조회 (페이지네이션으로 전체 조회)
async function fetchTimeEntries(apiKey, userId, startDate, endDate) {
  const entries = [];
  let offset = 0;

  while (true) {
    const url = buildUrl('time_entries.json', {
      user_id: userId,
      from: startDate,
      to: endDate,
      sort: 'spent_on',
      limit: PAGE_LIMIT,
      offset,
    });
    const page = await request(url, apiKey);
    const items = page.time_entries || [];
    entries.push(...items);
    offset += items.length;

    if (!items.length || offset >= (page.total_count ?? 0)) break;
  }

  return { time_entries: entries };
}

// 이슈 상세 정보 조회 (권한 없음/삭제된 일감이면 null)
async function fetchIssueDetails(apiKey, issueId) {
  try {
    const url = buildUrl(`issues/${encodeURIComponent(issueId)}.json`);
    return await request(url, apiKey);
  } catch (error) {
    if (error.statusCode === 403 || error.statusCode === 404) return null;
    throw error;
  }
}

// 주간 보고서 생성
async function createWeeklyReport(apiKey, timeEntries) {
  const entries = timeEntries.time_entries || [];

  if (!entries.length) {
    return '해당 기간에 기록된 업무가 없습니다.';
  }

  // 1. 업무 개요 생성
  const spentDates = entries.map(e => e.spent_on);
  const startDate = spentDates.reduce((a, b) => a < b ? a : b);
  const endDate = spentDates.reduce((a, b) => a > b ? a : b);

  const projectNames = [...new Set(entries.map(e => cleanProjectName(e.project.name)))];

  const overview = `
● 업무 개요
> * 업무 기간 : ${startDate} ~ ${endDate}
> * 요약 내용 : ${projectNames.join(', ')}`;

  // 2. 업무 현황 구성 (Map 사용하여 순서 유지)
  const issueData = new Map();

  for (const entry of entries) {
    // 일감번호가 있는 경우와 없는 경우 분리
    const hasIssue = !!entry.issue;
    const key = hasIssue ? `issue-${entry.issue.id}` : `project-${entry.project.id}`;

    if (!issueData.has(key)) {
      if (hasIssue) {
        // 이슈 세부정보 조회
        const issueDetails = await fetchIssueDetails(apiKey, entry.issue.id);
        const issue = issueDetails?.issue || {};

        issueData.set(key, {
          spentOn: [],
          projectName: cleanProjectName(entry.project.name),
          comments: [],
          issueId: entry.issue.id,
          subject: issue.subject || '',
          startIssueDate: issue.start_date || '',
          endIssueDate: issue.due_date || '',
          doneRatio: issue.done_ratio || 0
        });
      } else {
        // 일감번호 없는 경우
        issueData.set(key, {
          spentOn: [],
          projectName: cleanProjectName(entry.project.name),
          comments: [],
          issueId: null,
          subject: '',
          startIssueDate: '',
          endIssueDate: '',
          doneRatio: 0
        });
      }
    }

    const data = issueData.get(key);
    data.spentOn.push(entry.spent_on);
    data.comments.push(entry.comments);
  }

  let workStatus = '● 업무 현황\n|_.업무일|_.업무명|_.업무내용|_.계획기간|_.진척도|_.비고|\n';

  for (const data of issueData.values()) {
    const minDate = data.spentOn.reduce((a, b) => a < b ? a : b);
    const maxDate = data.spentOn.reduce((a, b) => a > b ? a : b);
    const spentOnDisplay = minDate !== maxDate ? `${minDate} ~ ${maxDate}` : minDate;

    // 계획기간: 일감의 시작일~완료기한, 없으면 업무일
    const planDisplay = data.startIssueDate || data.endIssueDate
      ? `${data.startIssueDate} ~ ${data.endIssueDate}`
      : spentOnDisplay;

    const commentsText = data.comments.filter(c => c).join(' \n');

    // 업무내용: 일감번호 있으면 #번호 제목, 없으면 코멘트만
    const taskContent = data.issueId
      ? `#${data.issueId} ${data.subject}\n${commentsText}`
      : commentsText;

    workStatus += `| ${spentOnDisplay}`;  // 업무일
    workStatus += `| ${escapeCell(data.projectName)} `;  // 업무명
    workStatus += `| ${escapeCell(taskContent)}`;  // 업무내용
    workStatus += `| ${planDisplay}`;  // 계획기간
    workStatus += `| ${data.doneRatio}% `;  // 진척도
    workStatus += `|  |\n`;  // 비고
  }

  // 3. 이슈 사항
  const issueSection = `
● 이슈 사항
> # 이슈 제목~~
> > * 이슈 내용~~
`;

  // 4. 차주 업무
  const nextWeekWork = `
● 차주 업무
|_.업무명|_.업무내용|_.계획기간|_.목표진척도|_.비고|
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
`;

  // 5. 특이사항
  const specialNotes = `
● 특이사항
> # 내용~~
`;

  // 최종 보고서 구성
  const report = `${overview}\n\n${workStatus}\n${issueSection}\n${nextWeekWork}\n${specialNotes}`;
  return report;
}

// 이번 주 월~금 날짜 계산 (서버 시간대와 무관하게 한국 시간 기준)
function getThisWeekDates() {
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const now = new Date(Date.now() + KST_OFFSET); // UTC 메서드로 읽으면 한국 날짜
  const dayOfWeek = now.getUTCDay(); // 0=일, 1=월, ..., 6=토

  // 월요일 계산
  const monday = new Date(now);
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setUTCDate(now.getUTCDate() + diff);

  // 금요일 계산
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);

  const formatDate = (d) => d.toISOString().split('T')[0];

  return {
    start: formatDate(monday),
    end: formatDate(friday)
  };
}

// YYYY-MM-DD 형식이면서 실제 존재하는 날짜인지 확인
function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !isNaN(d) && d.toISOString().startsWith(str);
}

module.exports = {
  fetchTimeEntries,
  fetchIssueDetails,
  createWeeklyReport,
  getThisWeekDates,
  isValidDate,
};
