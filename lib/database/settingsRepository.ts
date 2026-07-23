import { getCurrentSession } from "@/lib/database/authRepository";
import {
  SyncUserSettingsRequest,
  UserSettings,
  UserSettingsResponse,
} from "@/lib/database/types";

type ApiErrorPayload = {
  error?: string;
};

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await getCurrentSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Missing auth session. Please sign in again.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function toApiError(response: Response, fallback: string): Promise<Error> {
  let message = fallback;

  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload?.error?.trim()) {
      message = payload.error;
    }
  } catch {
    // Keep fallback if response is not JSON.
  }

  return new Error(message);
}

export async function fetchUserSettingsForUser(): Promise<UserSettings> {
  const response = await fetch("/api/settings", {
    method: "GET",
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw await toApiError(response, "Could not load settings.");
  }

  const payload = (await response.json()) as UserSettingsResponse;
  return payload.settings ?? {};
}

export async function syncUserSettingsForUser(settings: UserSettings): Promise<void> {
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ settings } satisfies SyncUserSettingsRequest),
  });

  if (!response.ok) {
    throw await toApiError(response, "Could not save settings.");
  }
}
