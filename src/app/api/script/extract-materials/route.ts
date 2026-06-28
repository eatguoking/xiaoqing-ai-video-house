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

function requestBody(input: { template: string | null; model: string; prompt: string }) {
  const defaults = {
    model: input.model,
    messages: [
      {
        role: "system",
        content:
          "You extract production materials from AI video storyboards. Return only valid JSON, no markdown fences."
      },
      {
        role: "user",
        content: input.prompt
      }
    ],
    temperature: 0.35
  };

  if (!input.template?.trim()) return defaults;

  try {
    return renderTemplate(input.template, {
      model: input.model,
      prompt: input.prompt,
      fullPrompt: input.prompt,
      roleHint: "Extract characters, props, and scenes from this storyboard as production materials.",
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

function extractJsonObject(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Material extraction response was not valid JSON.");
  }
}

function normalizeMaterialType(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("character") || text.includes("人物") || text.includes("角色")) return "character";
  if (text.includes("prop") || text.includes("道具")) return "prop";
  if (text.includes("scene") || text.includes("场景")) return "scene";
  return "prop";
}

function normalizeMaterials(payload: unknown) {
  const source = payload as {
    styleGuide?: unknown;
    materials?: Array<Record<string, unknown>>;
  };
  const materials = Array.isArray(source.materials) ? source.materials : [];

  return {
    styleGuide: typeof source.styleGuide === "string" ? source.styleGuide.trim() : "",
    materials: materials
      .map((item, index) => {
        const name = String(item.name ?? item.title ?? "").trim();
        const imagePrompt = String(item.imagePrompt ?? item.prompt ?? "").trim();
        return {
          id: `material_${Date.now()}_${index}`,
          type: normalizeMaterialType(item.type),
          name: name || `Material ${index + 1}`,
          reason: String(item.reason ?? "").trim(),
          imagePrompt
        };
      })
      .filter((item) => item.name && item.imagePrompt)
      .slice(0, 18)
  };
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
    return NextResponse.json({ error: "Please sync and select an available script model first." }, { status: 400 });
  }

  const storyboardText = String(body.text ?? "").trim();
  if (!storyboardText) {
    return NextResponse.json({ error: "Storyboard text is required." }, { status: 400 });
  }

  const projectId = String(body.projectId ?? "").trim() || null;
  const prompt = [
    "Analyze this storyboard/script and extract reusable AI video production materials.",
    "Return only JSON in this exact shape:",
    "{\"styleGuide\":\"overall visual style in Chinese\",\"materials\":[{\"type\":\"character|prop|scene\",\"name\":\"material name\",\"reason\":\"why it matters\",\"imagePrompt\":\"complete Chinese image generation prompt, include style, appearance, details, vertical video reference, no extra commentary\"}]}",
    "Rules:",
    "- Extract only important recurring or visually necessary materials.",
    "- Prefer 2-5 characters, 2-5 scenes, and 1-5 props when present.",
    "- Image prompts must be standalone and ready for an image generation API.",
    "- Keep character prompts consistent with clothing, face, age, vibe, and role.",
    "",
    "Storyboard/script:",
    storyboardText
  ].join("\n");
  const endpoint = makeUrl(selected.baseUrl, selected.generatePath || "/chat/completions");
  const payloadBody = requestBody({
    template: selected.requestTemplateJson,
    model: runtimeModel,
    prompt
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
        error: "External material extraction API request failed.",
        detail: error instanceof Error ? error.message : String(error),
        hint: friendlyApiError({ detail: error instanceof Error ? error.message : String(error) })
      },
      { status: 502 }
    );
  }

  const responseText = await response.text();
  if (!response.ok) {
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
      error: "External material extraction API returned an error."
    });
    return NextResponse.json(
      {
        error: "External material extraction API returned an error.",
        detail: responseText.slice(0, 1000),
        hint: friendlyApiError({ status: response.status, text: responseText })
      },
      { status: 502 }
    );
  }

  let payload: unknown = null;
  let parsedJson = false;
  try {
    payload = JSON.parse(responseText);
    parsedJson = true;
  } catch {
    payload = null;
  }

  const modelText = parsedJson ? readModelText(payload, selected.responseContentPath) : responseText.trim();
  await writeApiLog({
    capability: "script",
    projectId,
    provider: selected.provider,
    model: runtimeModel,
    endpoint,
    ok: true,
    status: response.status,
    elapsedMs: Date.now() - startedAt,
    requestBody: payloadBody,
    responseBody: parsedJson ? payload : responseText
  });

  try {
    const extracted = normalizeMaterials(extractJsonObject(modelText));
    if (!extracted.materials.length) {
      return NextResponse.json(
        {
          error: "No usable materials were extracted.",
          detail: modelText.slice(0, 1000)
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      provider: selected.provider,
      model: runtimeModel,
      ...extracted
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Material extraction response could not be parsed.",
        detail: error instanceof Error ? error.message : String(error),
        rawText: modelText.slice(0, 2000)
      },
      { status: 502 }
    );
  }
}
