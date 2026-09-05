import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('seeded-users', () => {
  const raw = open('../data/test-users.json');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('performance/data/test-users.json must contain at least one seeded user.');
  }

  return parsed;
});

const baseUrl = (__ENV.BOARD_BASE_URL || 'http://productivity-backend-alb-782333318.us-east-1.elb.amazonaws.com').replace(/\/$/, '');
// TARGET_RPS is requests per second for the /tasks board-read endpoint.
const targetApiRps = Number(__ENV.TARGET_RPS || __ENV.BOARD_TARGET_RPS || '20');
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
    get_board_tasks_rps: {
      executor: 'constant-arrival-rate',
      exec: 'getBoardTasksScenario',
      rate: targetApiRps,
      timeUnit: '1s',
      duration,
      preAllocatedVUs: preAllocatedVus,
      maxVUs: maxVus,
    },
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
