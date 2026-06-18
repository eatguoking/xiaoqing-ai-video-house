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
  roleHint: string;
}) {
  const fullPrompt = `${input.roleHint}\n\nUser request: ${input.prompt}`;
  const defaults = {
    model: input.model,
    messages: [
      {
        role: "system",
        content:
          "You are a professional short-drama writer and AI video production planner. Return clear, structured output that can be used for image and video generation."
      },
      {
        role: "user",
        content: fullPrompt
      }
    ],
    temperature: 0.8
  };

  if (!input.template?.trim()) return defaults;

  try {
    return renderTemplate(input.template, {
      model: input.model,
      prompt: input.prompt,
      fullPrompt,
      roleHint: input.roleHint,
      imageUrl: "",
      duration: 60,
      ratio: "9:16",
      size: "1024x1024",
      count: 1
    });
  } catch (error) {
    throw new Error(`Request template JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readModelText(payload: unknown, configuredPath?: string | null) {
  const configured = readStringByPath(payload, configuredPath);
  if (configured) return configured;

  const fallbackPaths = [
    "choices[0].message.content",
    "choices[0].text",
    "output_text",
    "text",
    "content",
    "data.text",
    "data.content",
    "result.text",
    "result.content"
  ];

  for (const path of fallbackPaths) {
    const value = readStringByPath(payload, path);
    if (value) return value;
  }

  return "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const selection = parseModelSelection(body.modelId);
  const selected = await prisma.modelCredential.findUnique({
    where: { id: selection.credentialId }
  });

  if (!selected || selected.capability !== "script" || !selected.enabled) {
    return NextResponse.json({ error: "Please configure and select a script API first." }, { status: 400 });
  }

  if (!selected.baseUrl) {
    return NextResponse.json({ error: "The selected script API is missing Base URL." }, { status: 400 });
  }

  const runtimeModel = selection.model || selected.model;
  if (!runtimeModel || runtimeModel === "__auto__") {
    return NextResponse.json({ error: "Please sync and select an available model first." }, { status: 400 });
  }

  const theme = body.input?.theme || body.prompt || "Modern urban short drama";
  const projectId = String(body.projectId ?? body.input?.projectId ?? "").trim() || null;
  const kind = body.input?.kind || "script";
  const roleHint =
    kind === "storyboard"
      ? "Create a storyboard with shot number, visual action, dialogue, camera movement, and image prompt."
      : kind === "character"
        ? "Create character settings with appearance, clothing, personality, relationships, and visual consistency notes."
        : "Create a vertical short drama script with title, logline, scenes, dialogue, and a twist ending.";
  const endpoint = makeUrl(selected.baseUrl, selected.generatePath || "/chat/completions");
  const payloadBody = requestBody({
    template: selected.requestTemplateJson,
    model: runtimeModel,
    prompt: theme,
    roleHint
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
      capability: "script",
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
        error: "External script API request failed.",
        detail: error instanceof Error ? error.message : String(error),
        hint: friendlyApiError({ detail: error instanceof Error ? error.message : String(error) })
      },
      { status: 502 }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    await writeApiLog({
      capability: "script",
      projectId,
      provider: selected.provider,
      model: runtimeModel,
      endpoint,
      ok: false,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      requestBody: payloadBody,
      responseBody: errorText,
      error: "External script API returned an error."
    });
    return NextResponse.json(
      {
        error: "External script API returned an error.",
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
      capability: "script",
      projectId,
      provider: selected.provider,
      model: runtimeModel,
      endpoint,
      ok: false,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      requestBody: payloadBody,
      responseBody: text,
      error: "External script API did not return JSON."
    });
    return NextResponse.json(
      {
        error: "External script API did not return JSON.",
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
    capability: "script",
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
  const modelText = readModelText(payload, selected.responseContentPath);
  if (!modelText) {
    return NextResponse.json(
      {
        error: "External script API returned empty content.",
        detail: JSON.stringify(payload).slice(0, 1000),
        hint: friendlyApiError({ text: "empty content" })
      },
      { status: 502 }
    );
  }

  const id = `script_${Date.now()}`;
  const output = {
    title: `${String(theme).slice(0, 48)} - Result`,
    logline: modelText.slice(0, 160),
    scenes: [
      {
        id: "s01",
        duration: 60,
        beat: "External model output",
        visual: "See rawText for full content",
        dialogue: modelText
      }
    ],
    rawText: modelText
  };

  await prisma.asset.upsert({
    where: { id },
    create: {
      id,
      projectId,
      type: kind === "character" ? "character" : "script",
      title: output.title,
      preview: output.logline,
      payloadJson: JSON.stringify(output)
    },
    update: {
      projectId,
      type: kind === "character" ? "character" : "script",
      title: output.title,
      preview: output.logline,
      payloadJson: JSON.stringify(output)
    }
  });

  return NextResponse.json({
    id,
    status: "succeeded",
    provider: selected.provider,
    model: runtimeModel,
    output
  });
}
