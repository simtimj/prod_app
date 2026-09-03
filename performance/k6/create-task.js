import http from 'k6/http';
import { check } from 'k6';

const targetRps = Number(__ENV.TARGET_RPS || __ENV.CREATE_TASK_TARGET_RPS || '10');
const preAllocatedVus = Number(__ENV.PREALLOCATED_VUS || __ENV.CREATE_TASK_PREALLOCATED_VUS || '200');
const maxVus = Number(__ENV.MAX_VUS || __ENV.CREATE_TASK_MAX_VUS || '2000');
const duration = __ENV.DURATION || '30s';
const baseUrl = (__ENV.CREATE_TASK_BASE_URL || __ENV.FASTAPI_BASE_URL || 'http://productivity-backend-alb-782333318.us-east-1.elb.amazonaws.com').replace(/\/+$/, '');
const p95Ms = Number(__ENV.P95_MS || '300');
const p99Ms = Number(__ENV.P99_MS || '700');
const maxErrorLogs = Number(__ENV.MAX_ERROR_LOGS || '25');
let loggedErrors = 0;

export const options = {
  scenarios: {
    create_task_rps: {
      executor: 'constant-arrival-rate',
      rate: targetRps,
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

function randomHex(length) {
  let result = '';
  for (let index = 0; index < length; index += 1) {
    result += Math.floor(Math.random() * 16).toString(16);
  }
  return result;
}

function uuidV4() {
  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${((8 + Math.floor(Math.random() * 4)).toString(16))}${randomHex(3)}-${randomHex(12)}`;
}

function createTaskScenario() {
  const token = (__ENV.ACCESS_TOKEN || '').trim(); // pass via: k6 run -e ACCESS_TOKEN=... performance-tests/create-task.js

  if (!token) {
    throw new Error('Missing ACCESS_TOKEN. Run: k6 run -e ACCESS_TOKEN=<supabase_user_access_token> create-task.js');
  }

  // Supabase access tokens are JWTs; this catches obvious misconfiguration
  if (token.split('.').length !== 3) {
    throw new Error('ACCESS_TOKEN does not look like a JWT. Use a real Supabase user access_token, not anon/service keys.');
  }

  const nowIso = new Date().toISOString();
  const taskId = uuidV4();

  const payload = JSON.stringify({
    task: {
      id: taskId,
      title: 'Finish project',
      completed: false,
      recurrence_enabled: false,
      description: 'Deploy application',
      due_date: null,
      due_time: null,
      priority: null,
      created_at: nowIso,
      updated_at: nowIso,
    },
    position: 0,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  const response = http.post(`${baseUrl}/tasks/upsert`, payload, params);

  if (response.status !== 200 && loggedErrors < maxErrorLogs) {
    console.error(`create-task failed: status=${response.status} body=${response.body}`);
    loggedErrors += 1;
  }

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response ok=true': (r) => {
      try {
        return JSON.parse(r.body).ok === true;
      } catch {
        return false;
      }
    },
  });

}

export default createTaskScenario;