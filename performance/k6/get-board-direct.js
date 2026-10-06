import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const baseUrl = (__ENV.SUPABASE_URL || '').replace(/\/+$/, '');
const serviceKey = (__ENV.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const userId = (__ENV.TEST_USER_ID || '').trim();
// SHAPE=backend or a comma list of columns,order,users,profile reproduces parts of the postgrest-py query from list_tasks.
const shapeParts = new Set(
  (__ENV.SHAPE === 'backend' ? 'columns,order,users,profile' : __ENV.SHAPE || '').split(',').filter(Boolean),
);
const BACKEND_COLUMNS =
  'id, user_id, title, completed, recurrence_enabled, recurrence_frequency, ' +
  'recurrence_weekdays, recurrence_month_days, tag, tag_color, description, ' +
  'due_date, due_time, priority, created_at, updated_at, position, archived, archived_at';
const seededUserIds = new SharedArray('seeded-user-ids', () =>
  shapeParts.has('users') ? JSON.parse(open('../data/test-users.json')).map((user) => user.user_id) : [],
);
const targetRps = Number(__ENV.TARGET_RPS || '1000');
const preAllocatedVus = Number(__ENV.PREALLOCATED_VUS || '200');
const maxVus = Number(__ENV.MAX_VUS || '2000');
const duration = __ENV.DURATION || '60s';
const p95Ms = Number(__ENV.P95_MS || '300');
const p99Ms = Number(__ENV.P99_MS || '700');

if (!baseUrl || !serviceKey || (!userId && !shapeParts.has('users'))) {
  throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and TEST_USER_ID (or SHAPE including users).');
}

export const options = {
  scenarios: {
    direct_supabase_read: {
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

// GET_BODY=1 mimics supabase-py 2.7.4, which sends "{}" as the body of every select.
const sendBody = __ENV.GET_BODY === '1';

export default function directSupabaseRead() {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  if (sendBody) headers['Content-Type'] = 'application/json';

  const id = shapeParts.has('users') ? seededUserIds[(__VU + __ITER) % seededUserIds.length] : userId;
  const columns = shapeParts.has('columns')
    ? encodeURIComponent(BACKEND_COLUMNS)
    : shapeParts.has('columnsnospace')
      ? encodeURIComponent(BACKEND_COLUMNS.replace(/ /g, ''))
      : '*';
  const order = shapeParts.has('order')
    ? 'order=archived&order=position&order=created_at'
    : 'order=archived.asc,position.asc,created_at.asc';
  if (shapeParts.has('profile')) {
    headers['Accept-Profile'] = 'public';
    headers['Content-Profile'] = 'public';
  }
  const url = `${baseUrl}/rest/v1/tasks?select=${columns}&user_id=eq.${id}&${order}`;

  const response = http.request('GET', url, sendBody ? '{}' : null, { headers });

  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
