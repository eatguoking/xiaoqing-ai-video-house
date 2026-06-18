import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

function makeUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function readPreview(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return text.length > 1800 ? `${text.slice(0, 1800)}...` : text;
}

function renderTemplate(template: string, values: Record<string, string | number>) {
  let rendered = template.trim();
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.replaceAll(`"{{${key}}}"`, JSON.stringify(value));
    rendered = rendered.replaceAll(`{{${key}}}`, String(value));
  }

  return JSON.parse(rendered);
}

function requestBody(config: {
  capability: string;
  model: string;
  requestTemplateJson: string | null;
}, prompt: string) {
  const model = config.model && config.model !== "__auto__" ? config.model : "";

  if (config.requestTemplateJson?.trim()) {
    return renderTemplate(config.requestTemplateJson, {
      model,
      prompt,
      fullPrompt: prompt,
      roleHint: "Connection test",
      imageUrl: "",
      duration: 5,
      ratio: "9:16",
      size: "1024x1024",
      count: 1
    });
  }

  if (config.capability === "script") {
    return {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 64
    };
  }

  if (config.capability === "image") {
    return {
      model,
      prompt,
      size: "1024x1024",
      n: 1
    };
  }

  return {
    model,
    prompt
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  const mode = String(body.mode ?? "base").trim();
  const prompt = String(body.prompt ?? "Reply OK. This is a connection test.").trim();

  if (!id) {
    return NextResponse.json({ error: "Missing config id" }, { status: 400 });
  }

  const config = await prisma.modelCredential.findUnique({ where: { id } });
  if (!config) {
    return NextResponse.json({ error: "API config not found" }, { status: 404 });
  }

  if (!config.baseUrl) {
    return NextResponse.json({ error: "Base URL is required for testing" }, { status: 400 });
  }

  const startedAt = Date.now();
  const { controller, timeout } = withTimeout(15000);

  try {
    let response: Response;

    if (mode === "chat") {
      const model = config.model && config.model !== "__auto__" ? config.model : "";
      if (!model) {
        return NextResponse.json(
          {
            ok: false,
            status: 0,
            statusText: "NEED_MODEL",
            elapsedMs: Date.now() - startedAt,
            preview: "Generation tests need a fallback model or a synced model selection."
          },
          { status: 200 }
        );
      }

      response = await fetch(makeUrl(config.baseUrl, config.generatePath || "/chat/completions"), {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          requestBody(
            {
              capability: config.capability,
              model,
              requestTemplateJson: config.requestTemplateJson
            },
            prompt
          )
        )
      });
    } else if (mode === "models") {
      response = await fetch(makeUrl(config.baseUrl, config.modelsPath || "/models"), {
        method: "GET",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        }
      });
    } else {
      response = await fetch(config.baseUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${config.apiKey}`
        }
      });
    }

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : await response.text();

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      elapsedMs: Date.now() - startedAt,
      preview: readPreview(payload)
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      status: 0,
      statusText: "REQUEST_FAILED",
      elapsedMs: Date.now() - startedAt,
      preview: error instanceof Error ? error.message : String(error)
    });
  } finally {
    clearTimeout(timeout);
  }
}
