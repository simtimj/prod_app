This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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
cd backend/task-parser-api
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
