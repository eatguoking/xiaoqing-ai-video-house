import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_PROJECT_ID = "default-project";
const DEFAULT_PROJECT_NAME = "\u5c0f\u6674\u7684AI\u5f71\u89c6\u5999\u5999\u5c4b";

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function projectPayload(project: {
  id: string;
  name: string;
  nodesJson: string;
  edgesJson: string;
  settingsJson: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: project.id,
    name: project.name || DEFAULT_PROJECT_NAME,
    nodes: parseJsonArray(project.nodesJson),
    edges: parseJsonArray(project.edgesJson),
    settings: parseJsonObject(project.settingsJson),
    saved: true,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const list = searchParams.get("list") === "1";
  const id = String(searchParams.get("id") ?? DEFAULT_PROJECT_ID).trim() || DEFAULT_PROJECT_ID;

  if (list) {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        nodesJson: true,
        edgesJson: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json(
      projects.map((project) => ({
        id: project.id,
        name: project.name || DEFAULT_PROJECT_NAME,
        nodeCount: parseJsonArray(project.nodesJson).length,
        edgeCount: parseJsonArray(project.edgesJson).length,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }))
    );
  }

  const project = await prisma.project.findUnique({
    where: { id }
  });

  if (!project) {
    return NextResponse.json({
      id: DEFAULT_PROJECT_ID,
      name: DEFAULT_PROJECT_NAME,
      nodes: [],
      edges: [],
      settings: {},
      saved: false
    });
  }

  return NextResponse.json(projectPayload(project));
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const id = String(searchParams.get("id") ?? body.id ?? DEFAULT_PROJECT_ID).trim() || DEFAULT_PROJECT_ID;
  const name = String(body.name ?? DEFAULT_PROJECT_NAME).trim() || DEFAULT_PROJECT_NAME;

  const project = await prisma.project.upsert({
    where: { id },
    create: {
      id,
      name,
      nodesJson: JSON.stringify(body.nodes ?? []),
      edgesJson: JSON.stringify(body.edges ?? []),
      settingsJson: JSON.stringify(body.settings ?? {})
    },
    update: {
      name,
      nodesJson: JSON.stringify(body.nodes ?? []),
      edgesJson: JSON.stringify(body.edges ?? []),
      settingsJson: JSON.stringify(body.settings ?? {})
    }
  });

  return NextResponse.json({
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "Untitled Project").trim() || "Untitled Project";
  const id = `project_${Date.now()}`;

  const project = await prisma.project.create({
    data: {
      id,
      name,
      nodesJson: JSON.stringify(body.nodes ?? []),
      edgesJson: JSON.stringify(body.edges ?? []),
      settingsJson: JSON.stringify(body.settings ?? {})
    }
  });

  return NextResponse.json(projectPayload(project));
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim();

  if (!id || !name) {
    return NextResponse.json({ error: "Project id and name are required" }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id },
    data: { name }
  });

  return NextResponse.json(projectPayload(project));
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Project id is required" }, { status: 400 });
  }

  await prisma.project.deleteMany({
    where: { id }
  });

  return NextResponse.json({ id, deleted: true });
}
