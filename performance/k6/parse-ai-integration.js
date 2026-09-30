import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';

const cases = new SharedArray('parse-ai-integration-cases', () => {
  const parsed = JSON.parse(open('../data/parse-ai-integration-cases.json'));
  if (!Array.isArray(parsed) || parsed.length !== 30) {
    throw new Error('Expected exactly 30 integration cases in parse-ai-integration-cases.json.');
  }
  return parsed;
});

const baseUrl = (__ENV.PARSE_AI_BASE_URL || 'http://productivity-backend-alb-782333318.us-east-1.elb.amazonaws.com').replace(/\/+$/, '');
const parseUrl = `${baseUrl}/parse-task`;
const referenceDate = __ENV.INTEGRATION_REFERENCE_DATE || '2026-09-29';
const timezone = __ENV.INTEGRATION_TIMEZONE || 'America/Los_Angeles';
const spacingSeconds = Number(__ENV.REQUEST_SPACING_SECONDS || '3');

const integrationSuccess = new Rate('parse_integration_success');
const schemaValid = new Rate('parse_schema_valid');
const expectedFieldsMatch = new Rate('parse_expected_fields_match');
const status2xx = new Counter('parse_status_2xx');
const status4xx = new Counter('parse_status_4xx');
const status5xx = new Counter('parse_status_5xx');
const parseLatency = new Trend('openai_parse_latency_ms');

export const options = {
  scenarios: {
    real_openai_parse_integration: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: cases.length,
      maxDuration: '5m',
      gracefulStop: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    parse_schema_valid: ['rate>0.95'],
    parse_expected_fields_match: ['rate>0.90'],
    parse_integration_success: ['rate>0.90'],
  },
};

function isOptionalString(value) {
  return value === null || typeof value === 'string';
}

function hasValidDraft(payload) {
  const draft = payload?.draft;
  return Boolean(
    draft &&
      typeof draft.title === 'string' &&
      draft.title.trim() &&
      isOptionalString(draft.dueDate) &&
      isOptionalString(draft.dueTime) &&
      isOptionalString(draft.description)
  );
}

function expectedFieldsMatchCase(testCase, draft) {
  if (Object.prototype.hasOwnProperty.call(testCase, 'expectedDueDate') && (draft?.dueDate ?? null) !== testCase.expectedDueDate) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(testCase, 'expectedDueTime') && (draft?.dueTime ?? null) !== testCase.expectedDueTime) {
    return false;
  }
  return true;
}

export default function () {
  const index = __ITER;
  const testCase = cases[index];
  if (!testCase) {
    throw new Error(`No integration case at index ${index}.`);
  }

  if (index > 0) {
    sleep(spacingSeconds);
  }

  const response = http.post(
    parseUrl,
    JSON.stringify({
      text: testCase.text,
      timezone,
      currentDate: referenceDate,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  parseLatency.add(response.timings.duration);

  let payload = null;
  try {
    payload = JSON.parse(response.body);
  } catch {
    payload = null;
  }

  const draftIsValid = hasValidDraft(payload);
  const fieldsMatch = draftIsValid && expectedFieldsMatchCase(testCase, payload.draft);
  const requestSucceeded = response.status >= 200 && response.status < 300 && draftIsValid && fieldsMatch;

  if (response.status >= 200 && response.status < 300) {
    status2xx.add(1);
  } else if (response.status >= 400 && response.status < 500) {
    status4xx.add(1);
  } else if (response.status >= 500) {
    status5xx.add(1);
  }

  schemaValid.add(draftIsValid ? 1 : 0);
  expectedFieldsMatch.add(fieldsMatch ? 1 : 0);
  integrationSuccess.add(requestSucceeded ? 1 : 0);

  check(response, {
    'OpenAI route returns 2xx': (r) => r.status >= 200 && r.status < 300,
    'response has valid draft schema': () => draftIsValid,
    'explicit expected date/time match': () => fieldsMatch,
  });

  if (!requestSucceeded) {
    console.error(`parse integration case=${testCase.id} status=${response.status} schemaValid=${draftIsValid} expectedFieldsMatch=${fieldsMatch}`);
  }
}
