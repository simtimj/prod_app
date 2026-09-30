# AI Task Parsing: Design, Testing, and Interview Guide

This guide describes the app's task-parsing feature and its performance-test setup. It distinguishes the real OpenAI-backed route from the deterministic mock route so test results are not overstated.

## Short description

The user enters free-form task text. The FastAPI backend either:

- Calls OpenAI and asks for a strict structured result (`/parse-task`), or
- Runs local deterministic parsing rules (`/parse-task/mock`).

Both routes return a draft containing `title`, optional `dueDate`, optional `dueTime`, and optional `description`. This parse step returns a draft; it does not itself persist a task to Postgres.

## Request flow: real AI route

The real route is `POST /parse-task` in [backend/main.py](../backend/main.py).

1. Receive JSON with `text`, optional `timezone`, and optional `currentDate`.
2. Trim and validate text; reject empty text or text over 400 characters.
3. Apply an in-memory, per-client minimum interval of 1,800 ms using the forwarded client IP (or real IP fallback). Rejected requests receive HTTP 429.
4. Use the supplied date or current UTC date, plus timezone, to ground relative-date interpretation.
5. Build a prompt from the system instructions and user's task text.
6. Call the OpenAI Responses API with strict JSON Schema output for title, due date, due time, and description.
7. Retry transport failures and retryable server errors with exponential backoff; report rate limits separately.
8. Validate the returned JSON with Pydantic (`ModelParsedTask.model_validate_json`).
9. Normalize and validate date/time/title values, then return a `ParseTaskResponse` draft.

The system prompt is defined in `parse_task_system_prompt` in [backend/main.py](../backend/main.py). The system prompt is a fixed instruction template. User task text is supplied separately on each request.

## Request flow: mock route

`POST /parse-task/mock` in [backend/main.py](../backend/main.py) does not call OpenAI or Supabase. It:

- Cleans a title with regular expressions.
- Detects common time formats such as `5pm`, `8 AM`, or `17:30`.
- Resolves a limited set of relative dates (today, tomorrow, weekdays) and explicit month/day forms.
- Returns a locally constructed draft and diagnostic description.

The mock route has its own configurable per-client limiter (`PARSE_MOCK_MIN_INTERVAL_MS`, default `0`, meaning disabled). It is useful for testing FastAPI/ALB request handling and the local mock logic at higher rates. It is **not** a measurement of OpenAI model throughput, latency, availability, or cost.

## What is randomized in the k6 test?

The sample task prompts are stored in [performance/data/ai-prompts.json](../performance/data/ai-prompts.json). It currently contains 10 prewritten strings, such as requests with tomorrow, a weekday, or a time of day.

In [performance/k6/parse-ai.js](../performance/k6/parse-ai.js), k6 loads this array once in a `SharedArray`. For **each iteration**, `pickPrompt()` chooses a random array index. This is random selection **with replacement**: the same prompt can be selected repeatedly, and there is no guarantee each prompt is used equally in a short run. The script also supplies the current date and the load-generator's timezone.

This is a test corpus, not a set of expected outputs. The k6 checks require a successful status/JSON response and a draft title; they do not assert that every inferred date/time exactly matches a hand-authored expected answer.

## Performance test configuration

The launcher is [performance/scripts/run-parse-ai.sh](../performance/scripts/run-parse-ai.sh). Defaults:

- Path: `/parse-task/mock`
- Target: 40 RPS
- Duration: 30 seconds
- Preallocated VUs: 200
- Maximum VUs: 2,000
- Summary JSON: timestamped file under `performance/results/`; historical summaries are consolidated in [performance-history.json](../performance/results/performance-history.json).

The runner refuses `TARGET_RPS > 50` against `/parse-task` (the real OpenAI-backed route) unless `ALLOW_REAL_PARSE_HIGH_RPS=1` is explicitly set. This is a guard against accidentally sending high-rate traffic to a paid, externally rate-limited provider. Do not use that override as a routine stress-test setting.

### Recommended testing layers

1. **Functional correctness:** test representative prompts against `/parse-task` at low request volume. Verify the returned draft fields and edge cases manually or with expected-output tests.
2. **Application capacity:** load-test `/parse-task/mock` in stages. This measures FastAPI/ALB/local mock behavior without OpenAI dependency, provider quotas, or per-call model cost.
3. **Real-provider integration and resilience:** exercise `/parse-task` at a small, controlled rate within the OpenAI account's approved request/token limits and budget. Measure end-to-end latency, 429/5xx/transport errors, retry outcomes, and schema-valid response rate. Use a short test and stop if provider throttling or unexpected spend appears.

Do not describe mock-route RPS as OpenAI RPS. A resume claim should state the route/provider and tested conditions clearly.

## Existing parse-test records

The consolidated performance archive contains three parse-AI runs:

| Original summary | Actual HTTP RPS | HTTP failures | p95 | Successful parse/title rates |
|---|---:|---:|---:|---:|
| `parse-ai-summary-20260811-184039.json` | 134.28 | 0% | 141.17ms | 100% / 100% |
| `parse-ai-summary-20260811-184642.json` | 179.89 | 0% | 26.87ms | 100% / 100% |
| `parse-ai-summary-20260811-211807.json` | 50.14 | 0% | 413.59ms | 100% / 100% |

The archive records these metrics, but these entries alone do not reliably identify which `PARSE_AI_PATH` was used. Check the original command/run notes before claiming these as mock-route or real-OpenAI results. No p99 value was present in these summaries.

## Likely interview questions and concise answers

**What did the AI feature do?**

> It converted free-form task text into a validated draft with a concise title and optional due date, time, and description. The backend requested strict structured output and validated the response before returning it to the client.

**How did you test it without sending a huge number of paid model calls?**

> I separated the local mock parsing route from the OpenAI-backed route. The mock route let me test API/load-handling behavior at higher rates; the real route was reserved for low-rate integration, structured-output, and resilience checks within provider limits.

**How did you handle provider failures?**

> The integration distinguishes rate limits and transport/server failures, applies bounded retries with exponential backoff for retryable failures, validates the resulting JSON with Pydantic, and returns explicit errors when parsing cannot complete.

**What are the limitations of the mock test?**

> It does not exercise OpenAI latency, model quality, provider quotas, or provider reliability. Its RPS is not evidence of OpenAI capacity.

**Was the parse quality fully benchmarked?**

> The current k6 checks verify response success and presence of a draft title. A stronger quality evaluation would use labeled prompts and expected fields, measuring date/time extraction accuracy separately from infrastructure throughput.

## Safe resume framing

> Integrated OpenAI structured-output task parsing with Pydantic validation, bounded retry/backoff, and a deterministic mock endpoint for high-volume API testing without incurring model-call costs.

Only add model-throughput, accuracy, cost, or latency numbers after a real-provider test measures those properties explicitly.
