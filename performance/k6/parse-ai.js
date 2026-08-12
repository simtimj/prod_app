import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Counter, Trend } from 'k6/metrics';

const prompts = new SharedArray('ai-prompts', () => {
  const raw = open('../data/ai-prompts.json');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('performance/data/ai-prompts.json must contain at least one prompt.');
  }

  return parsed.map((prompt) => String(prompt).trim()).filter(Boolean);
});

const baseUrl = (__ENV.PARSE_AI_BASE_URL || __ENV.FASTAPI_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const parsePath = (__ENV.PARSE_AI_PATH || '/api/parse-task/mock').trim() || '/api/parse-task/mock';
const parseUrl = `${baseUrl}${parsePath.startsWith('/') ? parsePath : `/${parsePath}`}`;
const sleepSeconds = Number(__ENV.SLEEP_SECONDS || '0.1');

const parseSuccess = new Rate('parse_success');
const parseHasDraftTitle = new Rate('parse_has_draft_title');
const parseStatus2xx = new Counter('parse_status_2xx');
const parseStatus4xx = new Counter('parse_status_4xx');
const parseStatus5xx = new Counter('parse_status_5xx');
const parseDuration = new Trend('parse_duration_ms');

export const options = {
  vus: Number(__ENV.VUS || '20'),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    parse_success: ['rate>0.95'],
    parse_has_draft_title: ['rate>0.95'],
  },
};

function pickPrompt() {
  const index = Math.floor(Math.random() * prompts.length);
  return prompts[index];
}

function currentDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseAiScenario() {
  const prompt = pickPrompt();
  const timezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  })();
  const currentDate = currentDateString();

  const response = http.post(
    parseUrl,
    JSON.stringify({
      text: prompt,
      timezone,
      currentDate,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  parseDuration.add(response.timings.duration);

  let payload = null;
  try {
    payload = JSON.parse(response.body);
  } catch {
    payload = null;
  }

  const hasDraftTitle = Boolean(payload?.draft?.title);
  const isSuccess = response.status >= 200 && response.status < 300 && hasDraftTitle;

  if (response.status >= 200 && response.status < 300) {
    parseStatus2xx.add(1);
  } else if (response.status >= 400 && response.status < 500) {
    parseStatus4xx.add(1);
  } else if (response.status >= 500) {
    parseStatus5xx.add(1);
  }

  parseSuccess.add(isSuccess ? 1 : 0);
  parseHasDraftTitle.add(hasDraftTitle ? 1 : 0);

  const passed = check(response, {
    'status is not 5xx': (r) => r.status < 500,
    'response body is json': () => payload !== null,
    'response includes draft title': () => hasDraftTitle,
  });

  if (!passed) {
    fail(`parse-ai request failed: status=${response.status} body=${response.body}`);
  }

  sleep(sleepSeconds);
}

export default parseAiScenario;
