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
