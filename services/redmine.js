// services/redmine.js
// Redmine API 호출 및 주간보고 생성

const https = require('https');
const http = require('http');
const { URL } = require('url');

const BASE_URL = process.env.REDMINE_BASE_URL;

// 현재 요청에 사용할 API 키 (요청마다 설정)
let currentApiKey = null;

// HTTP 요청 헬퍼 함수
function request(url) {
  return new Promise((resolve, reject) => {
    if (!currentApiKey) {
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
        'X-Redmine-API-Key': currentApiKey
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Redmine API 오류 (${res.statusCode}): ${data}`));
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
      req.destroy();
      reject(new Error('요청 시간 초과'));
    });
    req.end();
  });
}

// API 키 설정
function setApiKey(apiKey) {
  currentApiKey = apiKey;
}

// 프로젝트명에서 앞의 "숫자." 제거
function cleanProjectName(name) {
  return name.replace(/^\d+\./, '').trim();
}

// 시간 기록 데이터 조회
async function fetchTimeEntries(userId, startDate, endDate) {
  const url = `${BASE_URL}/time_entries.json?user_id=${userId}&from=${startDate}&to=${endDate}&sort=spent_on`;
  return await request(url);
}

// 이슈 상세 정보 조회
async function fetchIssueDetails(issueId) {
  const url = `${BASE_URL}/issues/${issueId}.json`;
  return await request(url);
}

// 주간 보고서 생성
async function createWeeklyReport(timeEntries) {
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
        const issueDetails = await fetchIssueDetails(entry.issue.id);
        const issue = issueDetails.issue || {};

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

  for (const [issueId, data] of issueData) {
    const minDate = data.spentOn.reduce((a, b) => a < b ? a : b);
    const maxDate = data.spentOn.reduce((a, b) => a > b ? a : b);
    const spentOnDisplay = minDate !== maxDate ? `${minDate} ~ ${maxDate}` : minDate;

    const commentsText = data.comments.filter(c => c).join(' \n');

    // 업무내용: 일감번호 있으면 #번호 제목, 없으면 코멘트만
    const taskContent = data.issueId
      ? `#${data.issueId} ${data.subject}\n${commentsText}`
      : commentsText;

    workStatus += `| ${spentOnDisplay}`;  // 업무일
    workStatus += `| ${data.projectName} `;  // 업무명
    workStatus += `| ${taskContent}`;  // 업무내용
    workStatus += `| ${spentOnDisplay}`;  // 계획기간
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

// 이번 주 월~금 날짜 계산
function getThisWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=일, 1=월, ..., 6=토

  // 월요일 계산
  const monday = new Date(now);
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(now.getDate() + diff);

  // 금요일 계산
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const formatDate = (d) => d.toISOString().split('T')[0];

  return {
    start: formatDate(monday),
    end: formatDate(friday)
  };
}

module.exports = {
  setApiKey,
  fetchTimeEntries,
  fetchIssueDetails,
  createWeeklyReport,
  getThisWeekDates,
};
