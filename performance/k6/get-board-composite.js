import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const REQUESTS_PER_ITERATION = 3;

const users = new SharedArray('seeded-users', () => {
  const raw = open('../data/test-users.json');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('performance/data/test-users.json must contain at least one seeded user.');
  }

  return parsed;
});

const baseUrl = (__ENV.BOARD_BASE_URL || 'http://productivity-backend-alb-782333318.us-east-1.elb.amazonaws.com').replace(/\/$/, '');
// TARGET_RPS is API-layer requests per second across /tasks + /lists + /settings.
const targetApiRps = Number(__ENV.TARGET_RPS || __ENV.BOARD_TARGET_RPS || '20');
const totalApiRps = Math.trunc(targetApiRps);
const baseScenarioRps = Math.floor(totalApiRps / REQUESTS_PER_ITERATION);
const remainder = totalApiRps % REQUESTS_PER_ITERATION;
const tasksRps = baseScenarioRps + (remainder > 0 ? 1 : 0);
const listsRps = baseScenarioRps + (remainder > 1 ? 1 : 0);
const settingsRps = baseScenarioRps;
const preAllocatedVus = Number(__ENV.PREALLOCATED_VUS || __ENV.BOARD_PREALLOCATED_VUS || '200');
const maxVus = Number(__ENV.MAX_VUS || __ENV.BOARD_MAX_VUS || '2000');
const duration = __ENV.DURATION || '30s';
const p95Ms = Number(__ENV.P95_MS || '300');
const p99Ms = Number(__ENV.P99_MS || '700');

if (!Number.isFinite(targetApiRps) || targetApiRps <= 0 || !Number.isInteger(targetApiRps)) {
  throw new Error('TARGET_RPS must be a positive whole number.');
}

export const options = {
  scenarios: {
    ...(tasksRps > 0
      ? {
          get_board_tasks_rps: {
            executor: 'constant-arrival-rate',
            exec: 'getBoardTasksScenario',
            rate: tasksRps,
            timeUnit: '1s',
            duration,
            preAllocatedVUs: preAllocatedVus,
            maxVUs: maxVus,
          },
        }
      : {}),
    ...(listsRps > 0
      ? {
          get_board_lists_rps: {
            executor: 'constant-arrival-rate',
            exec: 'getBoardListsScenario',
            rate: listsRps,
            timeUnit: '1s',
            duration,
            preAllocatedVUs: preAllocatedVus,
            maxVUs: maxVus,
          },
        }
      : {}),
    ...(settingsRps > 0
      ? {
          get_board_settings_rps: {
            executor: 'constant-arrival-rate',
            exec: 'getBoardSettingsScenario',
            rate: settingsRps,
            timeUnit: '1s',
            duration,
            preAllocatedVUs: preAllocatedVus,
            maxVUs: maxVus,
          },
        }
      : {}),
  },
  thresholds: {
    checks: ['rate>0.95'],
    http_req_failed: ['rate<0.02'],
    http_req_duration: [`p(95)<${p95Ms}`, `p(99)<${p99Ms}`],
  },
};

function pickUser() {
  const index = ((__VU - 1) + __ITER) % users.length;
  const user = users[index];
  const token = (user?.access_token || '').trim();

  if (!token || token.split('.').length !== 3) {
    throw new Error(`Seeded user at index ${index} is missing a valid access_token JWT.`);
  }

  return user;
}

function requestHeadersForUser(user) {
  return {
    Authorization: `Bearer ${user.access_token}`,
    'Content-Type': 'application/json',
  };
}

export function getBoardTasksScenario() {
  const user = pickUser();
  const response = http.get(`${baseUrl}/tasks?includeArchived=true`, {
    headers: requestHeadersForUser(user),
  });

  check(response, {
    'tasks status 200': (r) => r.status === 200,
    'tasks payload has array': (r) => {
      try {
        const payload = JSON.parse(r.body);
        return Array.isArray(payload.tasks);
      } catch {
        return false;
      }
    },
  });
}

export function getBoardListsScenario() {
  const user = pickUser();
  const response = http.get(`${baseUrl}/lists`, {
    headers: requestHeadersForUser(user),
  });

  check(response, {
    'lists status 200': (r) => r.status === 200,
    'lists payload has array': (r) => {
      try {
        const payload = JSON.parse(r.body);
        return Array.isArray(payload.lists);
      } catch {
        return false;
      }
    },
  });
}

export function getBoardSettingsScenario() {
  const user = pickUser();
  const response = http.get(`${baseUrl}/settings`, {
    headers: requestHeadersForUser(user),
  });

  check(response, {
    'settings status 200': (r) => r.status === 200,
    'settings payload has object': (r) => {
      try {
        const payload = JSON.parse(r.body);
        return typeof payload.settings === 'object' && payload.settings !== null;
      } catch {
        return false;
      }
    },
  });
}