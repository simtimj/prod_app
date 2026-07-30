import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('seeded-users', () => {
  const raw = open('../data/test-users.json');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('performance/data/test-users.json must contain at least one seeded user.');
  }

  return parsed;
});

const baseUrl = (__ENV.BOARD_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export const options = {
  vus: Number(__ENV.VUS || 20),
  duration: __ENV.DURATION || '30s',
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

export default function getBoardScenario() {
  const user = pickUser();
  const headers = {
    Authorization: `Bearer ${user.access_token}`,
    'Content-Type': 'application/json',
  };

  const [tasksRes, listsRes, settingsRes] = http.batch([
    ['GET', `${baseUrl}/tasks?includeArchived=true`, null, { headers }],
    ['GET', `${baseUrl}/lists`, null, { headers }],
    ['GET', `${baseUrl}/settings`, null, { headers }],
  ]);

  check(tasksRes, {
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

  check(listsRes, {
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

  check(settingsRes, {
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

  sleep(Number(__ENV.SLEEP_SECONDS || 1));
}
