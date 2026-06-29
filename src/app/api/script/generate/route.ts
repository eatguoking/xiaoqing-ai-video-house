import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeApiLog } from "@/lib/api/api-log";
import { friendlyApiError } from "@/lib/api/friendly-error";
import { readStringByPath } from "@/lib/api/response-path";
import { uniqueId } from "@/lib/id";
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
  style: string;
  length: string;
  language: string;
  temperature: number;
}) {
  const fullPrompt = `${input.roleHint}\n\nStyle: ${input.style}\nLength: ${input.length}\nLanguage: ${input.language}\n\nUser request: ${input.prompt}`;
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
    temperature: input.temperature
  };

  if (!input.template?.trim()) return defaults;

  try {
    return renderTemplate(input.template, {
      model: input.model,
      prompt: input.prompt,
      fullPrompt,
      roleHint: input.roleHint,
      style: input.style,
      length: input.length,
      language: input.language,
      temperature: input.temperature,
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
  const style = String(body.input?.style || body.style || "短剧");
  const length = String(body.input?.length || body.length || "中");
  const language = String(body.input?.language || body.language || "中文");
  const temperature = Number(body.input?.temperature ?? body.temperature ?? 0.8) || 0.8;
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
    roleHint,
    style,
    length,
    language,
    temperature
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

  const responseText = await response.text();
  let payload: unknown = null;
  let parsedJson = false;

  try {
    payload = JSON.parse(responseText);
    parsedJson = true;
  } catch {
    payload = null;
  }

  if (!parsedJson && /<!doctype html|<html/i.test(responseText)) {
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
      responseBody: responseText,
      error: "External script API did not return JSON."
    });
    return NextResponse.json(
      {
        error: "External script API did not return JSON.",
        hint: friendlyApiError({ status: response.status, text: responseText }),
        detail: "The Base URL returned a web page. For OpenAI-compatible APIs, the Base URL usually needs to end with /v1."
      },
      { status: 502 }
    );
  }

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
    responseBody: parsedJson ? payload : responseText
  });
  const modelText = parsedJson ? readModelText(payload, selected.responseContentPath) : responseText.trim();
  if (!modelText) {
    return NextResponse.json(
      {
        error: "External script API returned empty content.",
        detail: (parsedJson ? JSON.stringify(payload) : responseText).slice(0, 1000),
        hint: friendlyApiError({ text: "empty content" })
      },
      { status: 502 }
    );
  }

  const id = uniqueId("script");
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
