import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const uploadRoot = process.env.APP_UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

function assetType(mime: string) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "voice";
  if (mime.startsWith("text/")) return "script";
  return "file";
}

function safeName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").slice(0, 90) || "asset";
}

function safeSegment(value: string) {
  return safeName(value).replace(/[^a-zA-Z0-9_-]/g, "_") || "default-project";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);
  const projectId = String(formData.get("projectId") ?? "default-project").trim() || "default-project";
  const projectSegment = safeSegment(projectId);

  if (!files.length) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const uploadDir = path.join(uploadRoot, projectSegment);
  await mkdir(uploadDir, { recursive: true });
  const saved = [];

  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const filename = `${id}_${safeName(file.name)}`;
    const diskPath = path.join(uploadDir, filename);
    await writeFile(diskPath, bytes);

    const type = assetType(file.type);
    const url = process.env.APP_UPLOAD_DIR
      ? `/api/local-files/${projectSegment}/${filename}`
      : `/uploads/${projectSegment}/${filename}`;
    const payload = {
      url,
      local: true,
      projectId,
      projectFolder: process.env.APP_UPLOAD_DIR ? `/api/local-files/${projectSegment}` : `/uploads/${projectSegment}`,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      ...(type === "video" ? { videoUrl: url } : {}),
      ...(type === "voice" ? { audioUrl: url } : {})
    };

    const record = await prisma.asset.create({
      data: {
        id,
        projectId,
        type,
        title: file.name,
        preview: `Local ${type} file / ${(file.size / 1024 / 1024).toFixed(2)} MB`,
        payloadJson: JSON.stringify(payload)
      }
    });

    saved.push({
      id: record.id,
      projectId: record.projectId,
      type: record.type,
      title: record.title,
      preview: record.preview,
      url,
      payload,
      createdAt: record.createdAt
    });
  }

  return NextResponse.json({ assets: saved });
}
