This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev:up
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Check status of running frontend/backend services:

```bash
npm run dev:status
```

Stop both services and free ports 3000/8000:

```bash
npm run dev:down
```

## Environment Variables

Add these variables to your local `.env.local` file for the AI smart task parser:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_PARSE_TASK_MODEL=gpt-4.1-mini
FASTAPI_PARSE_TASK_URL=http://127.0.0.1:8000/parse-task
```

`OPENAI_PARSE_TASK_MODEL` is optional and defaults to `gpt-4.1-mini`.

`FASTAPI_PARSE_TASK_URL` is optional and defaults to `http://127.0.0.1:8000/parse-task`.

## FastAPI Parser Service

Requests to `/api/parse-task` are forwarded to Python FastAPI through a Next.js rewrite in `next.config.ts`.

Run the parser service locally:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
.venv/bin/python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Keep the FastAPI service running while using Smart Parse in the app.

From the project root, you can also run:

```bash
npm run dev:api
```

If you only want the frontend (without auto-starting backend):

```bash
npm run dev
```

## Performance Testing (Seed + k6)

The project includes a one-command workflow to seed mock board data and run a get-board load test.

### What the seed creates

- 10 users via Supabase Admin Auth API (no built-in email provider sends)
- 5 custom lists per user
- 100 tasks per user distributed across those custom lists

Seeded user tokens are written to [performance/data/test-users.json](performance/data/test-users.json), which [performance/k6/get-board.js](performance/k6/get-board.js) uses for authenticated board GET requests.

### Required environment variables

Set these in .env.local:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Single command (recommended)

Run from project root:

```bash
npm run perf:get-board
```

This command runs [performance/scripts/run-get-board.sh](performance/scripts/run-get-board.sh), which:

1. Seeds users/lists/tasks using [performance/scripts/seed_test_data.py](performance/scripts/seed_test_data.py)
2. Runs k6 with [performance/k6/get-board.js](performance/k6/get-board.js)
3. Exports a k6 summary JSON file to [performance/results](performance/results)

### Useful overrides

You can override defaults inline:

```bash
SEED_USERS=10 \
SEED_LISTS_PER_USER=5 \
SEED_TASKS_PER_USER=100 \
VUS=40 \
DURATION=60s \
BOARD_BASE_URL=http://localhost:8000 \
npm run perf:get-board
```

Optional cleanup at the end of the same command:

```bash
CLEANUP_AFTER_RUN=1 npm run perf:get-board
```

Delete seeded auth users as well:

```bash
CLEANUP_AFTER_RUN=1 CLEANUP_DELETE_USERS=1 npm run perf:get-board
```

### Manual helper commands

- Seed only: `npm run perf:seed`
- Cleanup seeded data only: `npm run perf:cleanup`
- Cleanup and delete seeded users: `python3 performance/scripts/cleanup_test_data.py --delete-users`

## Performance Testing (AI Parse)

The parse AI load test is designed to stress your parsing pipeline with randomized prompts from [performance/data/ai-prompts.json](performance/data/ai-prompts.json) while defaulting to the mock backend route so you do not spend OpenAI tokens during load runs.

### Recommended default

Run the mock route locally:

```bash
npm run perf:parse-ai
```

This runs [performance/scripts/run-parse-ai.sh](performance/scripts/run-parse-ai.sh), which:

1. Targets [performance/k6/parse-ai.js](performance/k6/parse-ai.js)
2. Defaults to `http://127.0.0.1:3000/api/parse-task/mock`
3. Exports a k6 summary JSON file to [performance/results](performance/results)

### Useful overrides

```bash
PARSE_AI_BASE_URL=http://localhost:8000 \
PARSE_AI_PATH=/parse-task/mock \
VUS=40 \
DURATION=60s \
SLEEP_SECONDS=0.05 \
npm run perf:parse-ai
```

### Real parse mode

If you want a small, controlled sample against the actual OpenAI-backed parser, point the test at `/parse-task` instead of the mock route and keep the base URL pointed at the FastAPI service:

```bash
PARSE_AI_BASE_URL=http://localhost:8000 PARSE_AI_PATH=/parse-task npm run perf:parse-ai
```

Use this mode sparingly. It validates the live model behavior, but it is not the right choice for high-volume stress runs.

## Using Lists

The app supports custom lists such as `Backlog`, `Weekend`, or any list you create from the `Lists` panel.

### Lists overview

Lists give you a second way to organize tasks outside of the day-by-day board.

- Use custom lists for buckets like `Backlog`, `Weekend`, `Errands`, or any category that is easier to manage outside a specific date.
- Open a list to view its tasks in a dedicated side panel.
- Move tasks from daily columns into custom lists when they belong to a category more than a single day.
- Move tasks from custom lists back into daily columns when you want to schedule them again.
- When you are signed in, custom lists and the tasks inside them are persisted to your account.
- `Recurring` and `Archive` are system lists with special behavior and are not treated like normal drop targets.

### Quick drag-and-drop summary

- Drag a task from a daily column.
- Hover over `Lists` in the top bar to open the Lists panel.
- Hover over `Backlog` or a custom list to target it.
- Drop directly on the list tab or inside the open list viewer.

### Basic list workflow

1. Click `Lists` in the top bar to open the Lists panel.
2. Click `+` to create a new custom list.
3. Click any custom list or `Backlog` to open its task viewer.
4. Click anywhere outside the open Lists panel to close it.

### Dragging tasks from daily columns into custom lists

1. Click and hold a task in a daily column to start dragging it.
2. While dragging, move over the `Lists` button in the header.
3. The Lists panel will open.
4. Hover over a destination list such as `Backlog` or a custom list like `Weekend`.
5. Drop the task either:
	- directly on the list tab, or
	- inside the open list viewer panel.

### Current rules

- You can drag daily tasks into `Backlog` and custom lists.
- You can drag tasks from custom lists back into daily columns.
- `Recurring` and `Archive` are specialized system lists and do not accept task drops.
- While dragging a daily task, the `Lists` button shows `Drag Here for Lists` until the drag ends.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# prod_app
