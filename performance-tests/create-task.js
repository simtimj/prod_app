import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '5s',
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

export default function () {
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

  const response = http.post('http://localhost:8000/tasks/upsert', payload, params);

  if (response.status !== 200) {
    console.error(`create-task failed: status=${response.status} body=${response.body}`);
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

  sleep(1);
}