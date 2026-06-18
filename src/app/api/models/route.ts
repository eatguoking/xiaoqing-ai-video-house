import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encodeModelSelection } from "@/lib/models/selection";

export const dynamic = "force-dynamic";

type Capability = "script" | "image" | "video";

type ExternalModelDto = {
  id: string;
  credentialId: string;
  capability: Capability;
  provider: string;
  model: string;
  label: string;
  sourceName: string;
  baseUrl: string;
  mode: "api";
  status: "ready" | "fallback";
  description: string;
  tags: string[];
};

const emptyModels: Record<Capability, ExternalModelDto[]> = {
  script: [],
  image: [],
  video: []
};

function makeUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

function extractModelIds(payload: unknown) {
  const root = payload as { data?: unknown; models?: unknown };
  const list = Array.isArray(root?.data) ? root.data : Array.isArray(root?.models) ? root.models : [];

  return list
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const value = item as { id?: unknown; name?: unknown; model?: unknown };
        return String(value.id ?? value.name ?? value.model ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function tagsFor(capability: Capability, model: string, provider: string) {
  const text = `${provider} ${model}`.toLowerCase();
  const tags: string[] = [];

  if (capability === "script") tags.push("text");
  if (capability === "image") tags.push("visual");
  if (capability === "video") tags.push("video");
  if (/(reason|r1|thinking|deepseek)/i.test(text)) tags.push("reasoning");
  if (/(search|web)/i.test(text)) tags.push("web");
  if (/(tool|function|agent|codex)/i.test(text)) tags.push("tools");
  if (/free/i.test(text)) tags.push("free");

  return tags;
}

function makeModelDto(input: {
  credentialId: string;
  capability: Capability;
  provider: string;
  model: string;
  sourceName: string;
  baseUrl: string;
  status: "ready" | "fallback";
}) {
  return {
    id: encodeModelSelection(input.credentialId, input.model),
    credentialId: input.credentialId,
    capability: input.capability,
    provider: input.provider,
    model: input.model,
    label: input.model,
    sourceName: input.sourceName,
    baseUrl: input.baseUrl,
    mode: "api" as const,
    status: input.status,
    description: `${input.sourceName} / ${input.provider}`,
    tags: tagsFor(input.capability, input.model, input.provider)
  };
}

async function discoverModels(record: {
  id: string;
  capability: string;
  label: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string | null;
  modelsPath: string | null;
}) {
  if (record.capability !== "script" && record.capability !== "image" && record.capability !== "video") {
    return [];
  }

  const capability = record.capability;
  const fallbackModel = record.model && record.model !== "__auto__" ? record.model : "";

  if (!record.baseUrl) {
    return fallbackModel
      ? [
          makeModelDto({
            credentialId: record.id,
            capability,
            provider: record.provider,
            model: fallbackModel,
            sourceName: record.label,
            baseUrl: "",
            status: "fallback"
          })
        ]
      : [];
  }

  const { controller, timeout } = withTimeout(8000);

  try {
    const response = await fetch(makeUrl(record.baseUrl, record.modelsPath || "/models"), {
      method: "GET",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${record.apiKey}`,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error("Models endpoint did not return JSON");
    }

    const payload = await response.json().catch(() => ({}));
    const names = Array.from(new Set(extractModelIds(payload)));

    if (names.length === 0 && fallbackModel) {
      names.push(fallbackModel);
    }

    return names.map((model) =>
      makeModelDto({
        credentialId: record.id,
        capability,
        provider: record.provider,
        model,
        sourceName: record.label,
        baseUrl: record.baseUrl ?? "",
        status: "ready"
      })
    );
  } catch {
    return fallbackModel
      ? [
          makeModelDto({
            credentialId: record.id,
            capability,
            provider: record.provider,
            model: fallbackModel,
            sourceName: record.label,
            baseUrl: record.baseUrl ?? "",
            status: "fallback"
          })
        ]
      : [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const records = await prisma.modelCredential.findMany({
    where: { enabled: true },
    orderBy: [{ capability: "asc" }, { updatedAt: "desc" }]
  });

  const discovered = (await Promise.all(records.map(discoverModels))).flat();
  const grouped = discovered.reduce<Record<Capability, ExternalModelDto[]>>(
    (acc, model) => {
      acc[model.capability].push(model);
      return acc;
    },
    { script: [], image: [], video: [] }
  );

  return NextResponse.json({ ...emptyModels, ...grouped });
}
