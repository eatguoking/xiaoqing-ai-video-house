import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeApiLog } from "@/lib/api/api-log";
import { friendlyApiError } from "@/lib/api/friendly-error";
import { readStringByPath } from "@/lib/api/response-path";
import { parseModelSelection } from "@/lib/models/selection";

function makeUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function readImageUrl(payload: unknown, configuredPath?: string | null) {
  const configured = readStringByPath(payload, configuredPath);
  if (configured) return configured;

  const data = (payload as { data?: Array<{ url?: string; b64_json?: string }> })?.data;
  const first = Array.isArray(data) ? data[0] : undefined;

  if (first?.url) return first.url;
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  return "";
}

function renderTemplate(template: string, values: Record<string, string | number>) {
  let rendered = template.trim();
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.replaceAll(`"{{${key}}}"`, JSON.stringify(value));
    rendered = rendered.replaceAll(`{{${key}}}`, String(value));
  }

  return JSON.parse(rendered);
}

function requestBody(input: { template: string | null; model: string; prompt: string; imageUrl?: string; editMode?: boolean }) {
  const defaults = {
    model: input.model,
    prompt: input.prompt,
    size: "1024x1024",
    n: 1,
    ...(input.imageUrl
      ? {
          image_url: input.imageUrl,
          imageUrl: input.imageUrl,
          reference_image: input.imageUrl,
          input_image: input.imageUrl
        }
      : {}),
    ...(input.editMode ? { edit_mode: true } : {})
  };

  if (!input.template?.trim()) return defaults;

  try {
    return renderTemplate(input.template, {
      model: input.model,
      prompt: input.prompt,
      imageUrl: input.imageUrl ?? "",
      duration: 5,
      ratio: "1:1",
      size: "1024x1024",
      count: 1,
      editMode: input.editMode ? 1 : 0
    });
  } catch (error) {
    throw new Error(`Request template JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const selection = parseModelSelection(body.modelId);
  const selected = await prisma.modelCredential.findUnique({
    where: { id: selection.credentialId }
  });

  if (!selected || selected.capability !== "image" || !selected.enabled) {
    return NextResponse.json({ error: "Please configure and select an image API first." }, { status: 400 });
  }

  if (!selected.baseUrl) {
    return NextResponse.json({ error: "The selected image API is missing Base URL." }, { status: 400 });
  }

  const runtimeModel = selection.model || selected.model;
  if (!runtimeModel || runtimeModel === "__auto__") {
    return NextResponse.json({ error: "Please sync and select an available image model first." }, { status: 400 });
  }

  const prompt = body.input?.prompt || body.prompt || "cinematic vertical drama frame";
  const referenceImageUrl = body.input?.imageUrl || body.imageUrl || "";
  const editMode = body.input?.editMode === true || body.editMode === true;
  const projectId = String(body.projectId ?? body.input?.projectId ?? "").trim() || null;
  const endpoint = makeUrl(selected.baseUrl, selected.generatePath || "/images/generations");
  const payloadBody = requestBody({
    template: selected.requestTemplateJson,
    model: runtimeModel,
    prompt,
    imageUrl: referenceImageUrl,
    editMode
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
      capability: "image",
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
        error: "External image API request failed.",
        detail: error instanceof Error ? error.message : String(error),
        hint: friendlyApiError({ detail: error instanceof Error ? error.message : String(error) })
      },
      { status: 502 }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    await writeApiLog({
      capability: "image",
      projectId,
      provider: selected.provider,
      model: runtimeModel,
      endpoint,
      ok: false,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      requestBody: payloadBody,
      responseBody: errorText,
      error: "External image API returned an error."
    });
    return NextResponse.json(
      {
        error: "External image API returned an error.",
        detail: errorText.slice(0, 1000),
        hint: friendlyApiError({ status: response.status, text: errorText })
      },
      { status: 502 }
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    await writeApiLog({
      capability: "image",
      projectId,
      provider: selected.provider,
      model: runtimeModel,
      endpoint,
      ok: false,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      requestBody: payloadBody,
      responseBody: text,
      error: "External image API did not return JSON."
    });
    return NextResponse.json(
      {
        error: "External image API did not return JSON.",
        hint: friendlyApiError({ status: response.status, text }),
        detail: text.includes("<html")
          ? "The Base URL returned a web page. For OpenAI-compatible APIs, the Base URL usually needs to end with /v1."
          : text.slice(0, 1000)
      },
      { status: 502 }
    );
  }

  const payload = await response.json().catch(() => ({}));
  await writeApiLog({
    capability: "image",
    projectId,
    provider: selected.provider,
    model: runtimeModel,
    endpoint,
    ok: Boolean(response.ok),
    status: response.status,
    elapsedMs: Date.now() - startedAt,
    requestBody: payloadBody,
    responseBody: payload
  });
  const generatedImageUrl = readImageUrl(payload, selected.responseUrlPath);

  if (!generatedImageUrl) {
    return NextResponse.json(
      {
        error: "External image API returned no image URL or b64_json.",
        detail: JSON.stringify(payload).slice(0, 1000),
        hint: friendlyApiError({ text: "no image url" })
      },
      { status: 502 }
    );
  }

  const jobId = `image_${Date.now()}`;
  const asset = {
    id: `${jobId}_asset_1`,
    projectId,
    type: "image",
    title: `${String(prompt).slice(0, 36)}${String(prompt).length > 36 ? "..." : ""}`,
    preview: `Image generated by ${selected.provider}/${runtimeModel}`,
    url: generatedImageUrl,
    referenceImageUrl,
    editMode,
    prompt,
    provider: selected.provider,
    model: runtimeModel
  };

  await prisma.generationJob.upsert({
    where: { id: jobId },
      create: {
        id: jobId,
        projectId,
        kind: "image",
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

  await prisma.asset.upsert({
    where: { id: asset.id },
    create: {
      id: asset.id,
      projectId,
      type: "image",
      title: asset.title,
      preview: asset.preview,
      payloadJson: JSON.stringify(asset),
      sourceJobId: jobId
    },
    update: {
      projectId,
      type: "image",
      title: asset.title,
      preview: asset.preview,
      payloadJson: JSON.stringify(asset),
      sourceJobId: jobId
    }
  });

  return NextResponse.json({
    id: jobId,
    kind: "image",
    provider: selected.provider,
    model: runtimeModel,
    prompt,
    status: "succeeded",
    assets: [asset]
  });
}
