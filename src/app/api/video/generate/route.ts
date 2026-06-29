import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeApiLog } from "@/lib/api/api-log";
import { friendlyApiError } from "@/lib/api/friendly-error";
import { readStringByPath } from "@/lib/api/response-path";
import { uniqueId } from "@/lib/id";
import { parseModelSelection } from "@/lib/models/selection";

type JsonRecord = Record<string, unknown>;

function makeUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function firstRecord(value: unknown) {
  return Array.isArray(value) && isRecord(value[0]) ? value[0] : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readVideoUrl(payload: unknown, configuredPath?: string | null): string {
  const configured = readStringByPath(payload, configuredPath);
  if (configured) return configured;

  if (!isRecord(payload)) return "";

  const direct =
    stringValue(payload.url) ||
    stringValue(payload.video_url) ||
    stringValue(payload.videoUrl) ||
    stringValue(payload.output_url) ||
    stringValue(payload.outputUrl);
  if (direct) return direct;

  const data = firstRecord(payload.data);
  const output = isRecord(payload.output) ? payload.output : undefined;
  const result = isRecord(payload.result) ? payload.result : undefined;
  const video = firstRecord(payload.videos);
  const asset = firstRecord(payload.assets);

  return (
    stringValue(data?.url) ||
    stringValue(data?.video_url) ||
    stringValue(data?.videoUrl) ||
    stringValue(output?.url) ||
    stringValue(output?.video_url) ||
    stringValue(output?.videoUrl) ||
    stringValue(result?.url) ||
    stringValue(result?.video_url) ||
    stringValue(result?.videoUrl) ||
    stringValue(video?.url) ||
    stringValue(video?.video_url) ||
    stringValue(asset?.url) ||
    stringValue(asset?.video_url)
  );
}

function readExternalJobId(payload: unknown, configuredPath?: string | null): string {
  const configured = readStringByPath(payload, configuredPath);
  if (configured) return configured;

  if (!isRecord(payload)) return "";

  const data = isRecord(payload.data) ? payload.data : firstRecord(payload.data);
  const output = isRecord(payload.output) ? payload.output : undefined;
  const result = isRecord(payload.result) ? payload.result : undefined;

  return (
    stringValue(payload.task_id) ||
    stringValue(payload.taskId) ||
    stringValue(payload.job_id) ||
    stringValue(payload.jobId) ||
    stringValue(payload.generation_id) ||
    stringValue(payload.generationId) ||
    stringValue(payload.id) ||
    stringValue(data?.task_id) ||
    stringValue(data?.taskId) ||
    stringValue(data?.job_id) ||
    stringValue(data?.jobId) ||
    stringValue(data?.id) ||
    stringValue(output?.id) ||
    stringValue(result?.id)
  );
}

function readStatusUrl(payload: unknown): string {
  if (!isRecord(payload)) return "";
  const urls = isRecord(payload.urls) ? payload.urls : undefined;
  return (
    stringValue(payload.status_url) ||
    stringValue(payload.statusUrl) ||
    stringValue(payload.polling_url) ||
    stringValue(payload.pollingUrl) ||
    stringValue(urls?.get) ||
    stringValue(urls?.status)
  );
}

function renderTemplate(template: string, values: Record<string, string | number>) {
  let rendered = template.trim();
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.replaceAll(`"{{${key}}}"`, JSON.stringify(value));
    rendered = rendered.replaceAll(`{{${key}}}`, String(value));
  }

  return JSON.parse(rendered);
}

function requestBody(input: {
  template: string | null;
  model: string;
  prompt: string;
  imageUrl: string;
  ratio: string;
  resolution: string;
  duration: number;
  camera: string;
  variants: number;
}) {
  const defaults = {
    model: input.model,
    prompt: input.prompt,
    ratio: input.ratio,
    resolution: input.resolution,
    duration: input.duration,
    camera: input.camera,
    n: input.variants,
    ...(input.imageUrl
      ? { image_url: input.imageUrl, imageUrl: input.imageUrl, first_frame_image: input.imageUrl }
      : {})
  };

  if (!input.template?.trim()) return defaults;

  try {
    return renderTemplate(input.template, {
      model: input.model,
      prompt: input.prompt,
      imageUrl: input.imageUrl,
      duration: input.duration,
      ratio: input.ratio,
      size: input.resolution,
      resolution: input.resolution,
      count: input.variants,
      camera: input.camera,
      variants: input.variants
    });
  } catch (error) {
    throw new Error(`Request template JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function videoAsset(input: {
  id: string;
  prompt: string;
  provider: string;
  model: string;
  videoUrl: string;
  imageUrl?: string;
  ratio?: string;
  resolution?: string;
  duration?: number;
  camera?: string;
  variants?: number;
  projectId?: string | null;
  raw?: unknown;
}) {
  return {
    id: `${input.id}_asset_1`,
    projectId: input.projectId ?? null,
    type: "video",
    title: `${input.prompt.slice(0, 36)}${input.prompt.length > 36 ? "..." : ""}`,
    preview: `Video generated by ${input.provider}/${input.model}`,
    url: input.videoUrl,
    videoUrl: input.videoUrl,
    prompt: input.prompt,
    imageUrl: input.imageUrl ?? "",
    ratio: input.ratio ?? "9:16",
    resolution: input.resolution ?? "1080x1920",
    duration: input.duration ?? 5,
    camera: input.camera ?? "slow push-in",
    variants: input.variants ?? 1,
    provider: input.provider,
    model: input.model,
    raw: input.raw
  };
}

async function saveVideoAsset(jobId: string, asset: ReturnType<typeof videoAsset>, projectId?: string | null) {
  await prisma.asset.upsert({
    where: { id: asset.id },
    create: {
      id: asset.id,
      projectId: projectId ?? null,
      type: "video",
      title: asset.title,
      preview: asset.preview,
      payloadJson: JSON.stringify(asset),
      sourceJobId: jobId
    },
    update: {
      projectId: projectId ?? null,
      type: "video",
      title: asset.title,
      preview: asset.preview,
      payloadJson: JSON.stringify(asset),
      sourceJobId: jobId
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const selection = parseModelSelection(body.modelId);
  const selected = await prisma.modelCredential.findUnique({
    where: { id: selection.credentialId }
  });

  if (!selected || selected.capability !== "video" || !selected.enabled) {
    return NextResponse.json({ error: "Please configure and select a video API first." }, { status: 400 });
  }

  if (!selected.baseUrl) {
    return NextResponse.json({ error: "The selected video API is missing Base URL." }, { status: 400 });
  }

  const runtimeModel = selection.model || selected.model;
  if (!runtimeModel || runtimeModel === "__auto__") {
    return NextResponse.json({ error: "Please sync and select an available video model first." }, { status: 400 });
  }

  const prompt = body.input?.prompt || body.prompt || "slow push-in, emotional close-up, vertical video";
  const imageUrl = body.input?.imageUrl || body.imageUrl || "";
  const ratio = String(body.input?.ratio || body.ratio || "9:16");
  const resolution = String(body.input?.resolution || body.resolution || "1080x1920");
  const duration = Number(body.input?.duration || body.duration || 5) || 5;
  const camera = String(body.input?.camera || body.camera || "slow push-in");
  const variants = Number(body.input?.variants || body.variants || 1) || 1;
  const projectId = String(body.projectId ?? body.input?.projectId ?? "").trim() || null;
  const endpoint = makeUrl(selected.baseUrl, selected.generatePath || "/videos/generations");
  const payloadBody = requestBody({
    template: selected.requestTemplateJson,
    model: runtimeModel,
    prompt,
    imageUrl,
    ratio,
    resolution,
    duration,
    camera,
    variants
  });
  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${selected.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payloadBody)
    });
  } catch (error) {
    await writeApiLog({
      capability: "video",
      projectId,
      provider: selected.provider,
      model: runtimeModel,
      endpoint,
      ok: false,
      status: 0,
      elapsedMs: Date.now() - startedAt,
      requestBody: payloadBody,
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      {
        error: "External video API request failed.",
        detail: error instanceof Error ? error.message : String(error),
        hint: friendlyApiError({ detail: error instanceof Error ? error.message : String(error) })
      },
      { status: 502 }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    await writeApiLog({
      capability: "video",
      projectId,
      provider: selected.provider,
      model: runtimeModel,
      endpoint,
      ok: false,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      requestBody: payloadBody,
      responseBody: errorText,
      error: "External video API returned an error."
    });
    return NextResponse.json(
      {
        error: "External video API returned an error.",
        detail: errorText.slice(0, 1200),
        hint: friendlyApiError({ status: response.status, text: errorText })
      },
      { status: 502 }
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    await writeApiLog({
      capability: "video",
      projectId,
      provider: selected.provider,
      model: runtimeModel,
      endpoint,
      ok: false,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      requestBody: payloadBody,
      responseBody: text,
      error: "External video API did not return JSON."
    });
    return NextResponse.json(
      {
        error: "External video API did not return JSON.",
        hint: friendlyApiError({ status: response.status, text }),
        detail: text.includes("<html")
          ? "The Base URL returned a web page. For OpenAI-compatible APIs, the Base URL usually needs to end with /v1."
          : text.slice(0, 1200)
      },
      { status: 502 }
    );
  }

  const payload = await response.json().catch(() => ({}));
  await writeApiLog({
    capability: "video",
    projectId,
    provider: selected.provider,
    model: runtimeModel,
    endpoint,
    ok: response.ok,
    status: response.status,
    elapsedMs: Date.now() - startedAt,
    requestBody: payloadBody,
    responseBody: payload
  });
  const videoUrl = readVideoUrl(payload, selected.responseUrlPath);
  const jobId = uniqueId("video");

  if (videoUrl) {
    const asset = videoAsset({
      id: jobId,
      prompt,
      provider: selected.provider,
      model: runtimeModel,
        videoUrl,
        imageUrl,
        ratio,
        resolution,
        duration,
        camera,
        variants,
        projectId,
        raw: payload
      });

    await prisma.generationJob.upsert({
      where: { id: jobId },
      create: {
        id: jobId,
        projectId,
        kind: "video",
        provider: selected.provider,
        model: runtimeModel,
        prompt,
        status: "succeeded",
        assetsJson: JSON.stringify([asset]),
        completedAt: new Date()
      },
      update: {
        status: "succeeded",
        assetsJson: JSON.stringify([asset]),
        completedAt: new Date()
      }
    });
    await saveVideoAsset(jobId, asset, projectId);

    return NextResponse.json({
      id: jobId,
      kind: "video",
      provider: selected.provider,
      model: runtimeModel,
      prompt,
      status: "succeeded",
      assets: [asset]
    });
  }

  const externalJobId = readExternalJobId(payload, selected.responseTaskIdPath);
  if (!externalJobId) {
    return NextResponse.json(
      {
        error: "External video API returned no video URL or task ID.",
        detail: JSON.stringify(payload).slice(0, 1200),
        hint: friendlyApiError({ text: "no video url or task id" })
      },
      { status: 502 }
    );
  }

  const meta = {
    external: true,
    credentialId: selected.id,
    externalJobId,
    statusUrl: readStatusUrl(payload) || selected.statusPath || "",
    prompt,
    imageUrl,
    ratio,
    resolution,
    duration,
    camera,
    variants,
    raw: payload
  };

  await prisma.generationJob.upsert({
    where: { id: jobId },
    create: {
        id: jobId,
        projectId,
        kind: "video",
      provider: selected.provider,
      model: runtimeModel,
      prompt,
      status: "queued",
      assetsJson: JSON.stringify({ meta, assets: [] })
    },
    update: {
      status: "queued",
      assetsJson: JSON.stringify({ meta, assets: [] })
    }
  });

  return NextResponse.json({
    id: jobId,
    kind: "video",
    provider: selected.provider,
    model: runtimeModel,
    prompt,
    status: "queued",
    assets: []
  });
}
