import { prisma } from "@/lib/db";

export async function writeApiLog(input: {
  projectId?: string | null;
  capability: string;
  provider: string;
  model: string;
  endpoint: string;
  ok: boolean;
  status: number;
  elapsedMs: number;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
}) {
  const responseText =
    typeof input.responseBody === "string"
      ? input.responseBody
      : JSON.stringify(input.responseBody ?? {});

  await prisma.apiLog
    .create({
      data: {
        id: `api_log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        projectId: input.projectId ?? null,
        capability: input.capability,
        provider: input.provider,
        model: input.model,
        endpoint: input.endpoint,
        ok: input.ok,
        status: input.status,
        elapsedMs: Math.max(0, Math.round(input.elapsedMs)),
        requestJson: JSON.stringify(input.requestBody ?? {}),
        responseText: responseText.slice(0, 5000),
        error: input.error?.slice(0, 1000) ?? null
      }
    })
    .catch(() => undefined);
}
