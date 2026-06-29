import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { uniqueId } from "@/lib/id";

export const runtime = "nodejs";

const uploadRoot = process.env.APP_UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

function parsePayload(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function localFilePathFromUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  const pathname = (() => {
    try {
      return new URL(value, "http://local").pathname;
    } catch {
      return value;
    }
  })();
  const decoded = decodeURIComponent(pathname);

  if (decoded.startsWith("/uploads/")) {
    const root = path.resolve(process.cwd(), "public", "uploads");
    const target = path.resolve(root, ...decoded.slice("/uploads/".length).split("/").filter(Boolean));
    return target.startsWith(`${root}${path.sep}`) ? target : null;
  }

  if (decoded.startsWith("/api/local-files/")) {
    const root = path.resolve(uploadRoot);
    const target = path.resolve(root, ...decoded.slice("/api/local-files/".length).split("/").filter(Boolean));
    return target.startsWith(`${root}${path.sep}`) ? target : null;
  }

  return null;
}

function assetLocalFilePaths(payload: Record<string, unknown>) {
  const urls = [
    payload.url,
    payload.videoUrl,
    payload.audioUrl,
    payload.thumbnailUrl,
    payload.referenceImageUrl
  ];
  return Array.from(new Set(urls.map(localFilePathFromUrl).filter((item): item is string => Boolean(item))));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = String(searchParams.get("projectId") ?? "").trim();
  const type = String(searchParams.get("type") ?? "all").trim();
  const query = String(searchParams.get("q") ?? "").trim().toLowerCase();

  const assets = await prisma.asset.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(type && type !== "all" ? { type } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 240
  });

  return NextResponse.json(
    assets
      .map((asset) => {
        const payload = parsePayload(asset.payloadJson);
        return {
        id: asset.id,
        projectId: asset.projectId,
        type: asset.type,
        title: asset.title,
        preview: asset.preview,
        url: payload?.url ?? payload?.videoUrl ?? payload?.audioUrl ?? "",
        payload,
        sourceJobId: asset.sourceJobId,
        createdAt: asset.createdAt
      };
      })
      .filter((asset) => {
        if (!query) return true;
        const text = `${asset.title} ${asset.preview} ${asset.type}`.toLowerCase();
        return text.includes(query);
      })
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const incomingAssets = Array.isArray(body.assets) ? body.assets : [body];
  const operations = [];

  for (const asset of incomingAssets) {
    const id = asset.id ?? uniqueId("asset");
    const projectId = String(asset.projectId ?? body.projectId ?? "").trim() || null;
    const payload = {
      ...(asset.payload ?? {})
    };
    if (asset.url && typeof payload.url !== "string") {
      payload.url = asset.url;
    }
    if (asset.type === "video" && asset.url && typeof payload.videoUrl !== "string") {
      payload.videoUrl = asset.url;
    }

    operations.push(prisma.asset.upsert({
      where: { id },
      create: {
        id,
        projectId,
        type: asset.type ?? "unknown",
        title: asset.title ?? "Untitled asset",
        preview: asset.preview ?? "",
        payloadJson: JSON.stringify(payload),
        sourceJobId: asset.sourceJobId ?? null
      },
      update: {
        projectId,
        type: asset.type ?? "unknown",
        title: asset.title ?? "Untitled asset",
        preview: asset.preview ?? "",
        payloadJson: JSON.stringify(payload),
        sourceJobId: asset.sourceJobId ?? null
      }
    }));
  }

  const saved = await prisma.$transaction(operations);
  return NextResponse.json({ saved: saved.length });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const projectId = String(body.projectId ?? "").trim();
  const rawIds: unknown[] = Array.isArray(body.ids) ? body.ids : [];
  const ids: string[] = Array.from(
    new Set(rawIds.map((id) => String(id ?? "").trim()).filter((id): id is string => Boolean(id)))
  );

  if (!projectId || ids.length === 0) {
    return NextResponse.json({ error: "projectId and asset ids are required." }, { status: 400 });
  }

  const assets = await prisma.asset.findMany({
    where: {
      projectId,
      id: { in: ids }
    }
  });
  const deletableIds = assets.map((asset) => asset.id);

  if (deletableIds.length === 0) {
    return NextResponse.json({ deleted: 0, ids: [], filesDeleted: 0, fileErrors: 0 });
  }

  let filesDeleted = 0;
  let fileErrors = 0;
  const paths = assets.flatMap((asset) => assetLocalFilePaths(parsePayload(asset.payloadJson)));
  for (const filePath of Array.from(new Set(paths))) {
    try {
      await unlink(filePath);
      filesDeleted += 1;
    } catch {
      fileErrors += 1;
    }
  }

  await prisma.asset.deleteMany({
    where: {
      projectId,
      id: { in: deletableIds }
    }
  });

  return NextResponse.json({
    deleted: deletableIds.length,
    ids: deletableIds,
    filesDeleted,
    fileErrors
  });
}
