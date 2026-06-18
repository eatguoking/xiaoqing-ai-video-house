import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const capabilities = ["script", "image", "video"] as const;

function maskKey(apiKey: string) {
  if (!apiKey) return "";
  if (apiKey.length <= 8) return "****";
  return `${apiKey.slice(0, 4)}****${apiKey.slice(-4)}`;
}

function normalizeCapability(value: unknown) {
  const capability = String(value ?? "").trim().toLowerCase();
  return capabilities.includes(capability as (typeof capabilities)[number]) ? capability : "";
}

function normalizeBaseUrl(value: unknown) {
  const baseUrl = String(value ?? "").trim();
  return baseUrl.replace(/\/+$/, "");
}

function normalizePath(value: unknown) {
  const path = String(value ?? "").trim();
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

function defaultGeneratePath(capability: string) {
  if (capability === "script") return "/chat/completions";
  if (capability === "image") return "/images/generations";
  if (capability === "video") return "/videos/generations";
  return "";
}

function toDto(record: {
  id: string;
  capability: string;
  label: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string | null;
  modelsPath: string | null;
  generatePath: string | null;
  statusPath: string | null;
  requestTemplateJson: string | null;
  responseContentPath: string | null;
  responseUrlPath: string | null;
  responseTaskIdPath: string | null;
  responseStatusPath: string | null;
  responseErrorPath: string | null;
  enabled: boolean;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    capability: record.capability,
    label: record.label,
    provider: record.provider,
    model: record.model === "__auto__" ? "" : record.model,
    baseUrl: record.baseUrl ?? "",
    modelsPath: record.modelsPath || "/models",
    generatePath: record.generatePath || defaultGeneratePath(record.capability),
    statusPath: record.statusPath ?? "",
    requestTemplateJson: record.requestTemplateJson ?? "",
    responseContentPath: record.responseContentPath ?? "",
    responseUrlPath: record.responseUrlPath ?? "",
    responseTaskIdPath: record.responseTaskIdPath ?? "",
    responseStatusPath: record.responseStatusPath ?? "",
    responseErrorPath: record.responseErrorPath ?? "",
    enabled: record.enabled,
    hasKey: Boolean(record.apiKey),
    maskedKey: maskKey(record.apiKey),
    updatedAt: record.updatedAt
  };
}

export async function GET() {
  const records = await prisma.modelCredential.findMany({
    orderBy: [{ capability: "asc" }, { updatedAt: "desc" }]
  });

  return NextResponse.json(records.map(toDto));
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const capability = normalizeCapability(body.capability);
  const label = String(body.label ?? "").trim();
  const provider = String(body.provider ?? "").trim().toLowerCase();
  const model = String(body.model ?? "").trim() || "__auto__";
  const apiKey = String(body.apiKey ?? "").trim();
  const baseUrl = normalizeBaseUrl(body.baseUrl);
  const modelsPath = normalizePath(body.modelsPath) || "/models";
  const generatePath = normalizePath(body.generatePath) || defaultGeneratePath(capability);
  const statusPath = normalizePath(body.statusPath);
  const requestTemplateJson = String(body.requestTemplateJson ?? "").trim();
  const responseContentPath = String(body.responseContentPath ?? "").trim();
  const responseUrlPath = String(body.responseUrlPath ?? "").trim();
  const responseTaskIdPath = String(body.responseTaskIdPath ?? "").trim();
  const responseStatusPath = String(body.responseStatusPath ?? "").trim();
  const responseErrorPath = String(body.responseErrorPath ?? "").trim();
  const enabled = body.enabled !== false;
  const incomingId = String(body.id ?? "").trim();
  const id =
    incomingId ||
    `${capability}_${provider}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, "_");

  if (!capability) {
    return NextResponse.json({ error: "Unsupported model category" }, { status: 400 });
  }

  if (!label || !provider || !baseUrl) {
    return NextResponse.json({ error: "Display name, provider, and Base URL are required" }, { status: 400 });
  }

  if (!/^https?:\/\//i.test(baseUrl)) {
    return NextResponse.json({ error: "Base URL must start with http:// or https://" }, { status: 400 });
  }

  const existing = incomingId
    ? await prisma.modelCredential.findUnique({ where: { id: incomingId } })
    : null;
  const finalApiKey = apiKey || existing?.apiKey || "";

  if (!finalApiKey) {
    return NextResponse.json({ error: "API Key is required for new configs" }, { status: 400 });
  }

  const record = await prisma.modelCredential.upsert({
    where: { id },
    create: {
      id,
      capability,
      label,
      provider,
      model,
      apiKey: finalApiKey,
      baseUrl,
      modelsPath,
      generatePath,
      statusPath,
      requestTemplateJson,
      responseContentPath,
      responseUrlPath,
      responseTaskIdPath,
      responseStatusPath,
      responseErrorPath,
      enabled
    },
    update: {
      capability,
      label,
      provider,
      model,
      apiKey: finalApiKey,
      baseUrl,
      modelsPath,
      generatePath,
      statusPath,
      requestTemplateJson,
      responseContentPath,
      responseUrlPath,
      responseTaskIdPath,
      responseStatusPath,
      responseErrorPath,
      enabled
    }
  });

  return NextResponse.json(toDto(record));
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Missing config id" }, { status: 400 });
  }

  await prisma.modelCredential.deleteMany({
    where: { id }
  });

  return NextResponse.json({ id, deleted: true });
}
