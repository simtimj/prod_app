import OpenAI from "openai";
import { NextResponse } from "next/server";
import { ParseTaskRequest, ParseTaskResponse } from "@/components/kanbanTypes";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL_NAME = process.env.OPENAI_PARSE_TASK_MODEL ?? "gpt-4.1-mini";
const PARSE_MIN_INTERVAL_MS = 1800;
const recentParseByClient = new Map<string, number>();

const parseTaskSystemPrompt = `You convert natural language task requests into a strict JSON object.

Rules:
1) Return ONLY valid JSON matching this shape:
{
  "title": string,
  "dueDate": string | null,
  "dueTime": string | null,
  "description": string | null
}
2) title must be concise and action-oriented.
3) dueDate must be YYYY-MM-DD when date is explicit, otherwise null.
4) dueTime must be HH:MM in 24-hour format when time is explicit (for example 5pm -> 17:00), otherwise null.
5) Resolve relative dates (tomorrow, next Monday, this Friday) using the provided reference date and timezone.
6) If time is mentioned, include concise context in description too.
7) description should preserve useful context from the original user phrase.
8) Never invent dates if unclear.
`;

type ModelParsedTask = {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  description: string | null;
};

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const isRealCalendarDate = (value: string) => {
  if (!isValidDate(value)) return false;

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
};

const isValidTime = (value: string) => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);

const normalizeModelResult = (value: ModelParsedTask): ParseTaskResponse => {
  const normalizedTitle = value.title.trim();
  const normalizedDueDate = value.dueDate?.trim() ?? "";
  const normalizedDueTime = value.dueTime?.trim() ?? "";
  const normalizedDescription = value.description?.trim() ?? "";

  if (!normalizedTitle) {
    throw new Error("Parsed title is empty.");
  }

  if (normalizedDueDate && !isRealCalendarDate(normalizedDueDate)) {
    throw new Error("Parsed dueDate is invalid. Expected a real YYYY-MM-DD date.");
  }

  if (normalizedDueTime && !isValidTime(normalizedDueTime)) {
    throw new Error("Parsed dueTime is invalid. Expected HH:MM (24-hour).");
  }

  return {
    draft: {
      title: normalizedTitle,
      dueDate: normalizedDueDate || undefined,
      dueTime: normalizedDueTime || undefined,
      description: normalizedDescription || undefined,
    },
  };
};

const getClientKey = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "unknown";
};

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 500 });
  }

  try {
    const body = (await request.json()) as ParseTaskRequest;
    const text = body.text?.trim();
    const timezone = body.timezone?.trim() || "UTC";
    const referenceDate = body.currentDate?.trim();

    if (!text) {
      return NextResponse.json({ error: "Task text is required." }, { status: 400 });
    }

    if (text.length > 400) {
      return NextResponse.json({ error: "Task text is too long (max 400 chars)." }, { status: 400 });
    }

    const nowMs = Date.now();
    const clientKey = getClientKey(request);
    const previousMs = recentParseByClient.get(clientKey) ?? 0;
    const elapsedMs = nowMs - previousMs;
    if (elapsedMs < PARSE_MIN_INTERVAL_MS) {
      const retryAfterSeconds = Math.max(1, Math.ceil((PARSE_MIN_INTERVAL_MS - elapsedMs) / 1000));
      return NextResponse.json(
        { error: `Rate limited. Please wait ${retryAfterSeconds}s and try again.`, retryAfterSeconds },
        { status: 429 }
      );
    }
    recentParseByClient.set(clientKey, nowMs);

    if (referenceDate && !isRealCalendarDate(referenceDate)) {
      return NextResponse.json({ error: "currentDate must be a real YYYY-MM-DD date." }, { status: 400 });
    }

    const groundedReferenceDate =
      referenceDate ||
      new Date().toISOString().slice(0, 10);

    const userPrompt = [
      `User input: ${text}`,
      `Reference date: ${groundedReferenceDate}`,
      `Timezone: ${timezone}`,
    ].join("\n");

    const completion = await client.responses.create({
      model: MODEL_NAME,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: parseTaskSystemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "parsed_task",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              dueDate: { type: ["string", "null"] },
              dueTime: { type: ["string", "null"] },
              description: { type: ["string", "null"] },
            },
            required: ["title", "dueDate", "dueTime", "description"],
          },
          strict: true,
        },
      },
    });

    const jsonText = completion.output_text;
    if (!jsonText) {
      return NextResponse.json({ error: "No parse result returned by model." }, { status: 502 });
    }

    const parsed = JSON.parse(jsonText) as ModelParsedTask;
    const response = normalizeModelResult(parsed);

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof OpenAI.APIError && error.status === 429) {
      return NextResponse.json(
        {
          error: "OpenAI rate limit reached. Please wait a few seconds and try again.",
          retryAfterSeconds: 3,
        },
        { status: 429 }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown parse error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
