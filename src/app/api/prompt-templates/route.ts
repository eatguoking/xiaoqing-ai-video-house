import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const kinds = ["script", "storyboard", "character", "image", "video", "voice"] as const;

function normalizeKind(value: unknown) {
  const kind = String(value ?? "").trim().toLowerCase();
  return kinds.includes(kind as (typeof kinds)[number]) ? kind : "script";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = String(searchParams.get("projectId") ?? "").trim();

  const templates = await prisma.promptTemplate.findMany({
    where: {
      OR: [{ scope: "global" }, ...(projectId ? [{ projectId }] : [])]
    },
    orderBy: [{ scope: "asc" }, { updatedAt: "desc" }]
  });

  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim() || "Untitled Template";
  const content = String(body.content ?? "").trim();
  const projectId = String(body.projectId ?? "").trim() || null;
  const scope = body.scope === "global" ? "global" : "project";

  if (!content) {
    return NextResponse.json({ error: "Template content is required" }, { status: 400 });
  }

  const template = await prisma.promptTemplate.create({
    data: {
      id: `template_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      projectId: scope === "project" ? projectId : null,
      scope,
      kind: normalizeKind(body.kind),
      title,
      content
    }
  });

  return NextResponse.json(template);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Template id is required" }, { status: 400 });
  }

  const template = await prisma.promptTemplate.update({
    where: { id },
    data: {
      title: String(body.title ?? "").trim() || "Untitled Template",
      kind: normalizeKind(body.kind),
      content: String(body.content ?? "").trim(),
      scope: body.scope === "global" ? "global" : "project",
      projectId: body.scope === "global" ? null : String(body.projectId ?? "").trim() || null
    }
  });

  return NextResponse.json(template);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Template id is required" }, { status: 400 });
  }

  await prisma.promptTemplate.deleteMany({ where: { id } });
  return NextResponse.json({ id, deleted: true });
}
