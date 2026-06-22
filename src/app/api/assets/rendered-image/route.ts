import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const uploadRoot = process.env.APP_UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
const imageEditPrompt = [
  "Use the attached edited canvas as the authoritative image editing brief.",
  "Treat the canvas as a visual instruction board: read all handwritten marks, arrows, lines, shapes, circles, callouts, and text annotations as requested changes.",
  "Apply the requested edits to the original image content while removing visible annotation marks from the final result.",
  "Preserve the original subject identity, composition intent, lighting, and style unless the canvas annotations explicitly ask for a change.",
  "Ignore any older prompt text from the node inspector. Follow only this edited canvas and its visual instructions."
].join("\n");

function safeName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").slice(0, 90) || "asset";
}

function safeSegment(value: string) {
  return safeName(value).replace(/[^a-zA-Z0-9_-]/g, "_") || "default-project";
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const extension = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
  return {
    mime,
    extension,
    bytes: Buffer.from(match[2], "base64")
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const projectId = String(body.projectId ?? "default-project").trim() || "default-project";
  const title = String(body.title ?? "Edited image").trim() || "Edited image";
  const sourceAssetId = String(body.sourceAssetId ?? "").trim();
  const decoded = decodeDataUrl(String(body.dataUrl ?? ""));

  if (!decoded) {
    return NextResponse.json({ error: "A PNG, JPEG, or WebP data URL is required." }, { status: 400 });
  }

  const projectSegment = safeSegment(projectId);
  const uploadDir = path.join(uploadRoot, projectSegment);
  await mkdir(uploadDir, { recursive: true });

  const id = `edited_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${id}_${safeName(title)}.${decoded.extension}`;
  const diskPath = path.join(uploadDir, filename);
  await writeFile(diskPath, decoded.bytes);

  const url = process.env.APP_UPLOAD_DIR
    ? `/api/local-files/${projectSegment}/${filename}`
    : `/uploads/${projectSegment}/${filename}`;
  const payload = {
    url,
    local: true,
    edited: true,
    imageEditMode: true,
    prompt: imageEditPrompt,
    rawText: imageEditPrompt,
    referenceImageUrl: url,
    projectId,
    sourceAssetId,
    mimeType: decoded.mime,
    size: decoded.bytes.length
  };

  const record = await prisma.asset.create({
    data: {
      id,
      projectId,
      type: "image",
      title,
      preview: sourceAssetId ? `Edited image from ${sourceAssetId}` : "Edited image",
      payloadJson: JSON.stringify(payload),
      sourceJobId: sourceAssetId || null
    }
  });

  return NextResponse.json({
    asset: {
      id: record.id,
      projectId: record.projectId ?? undefined,
      type: record.type,
      title: record.title,
      preview: record.preview,
      url,
      payload,
      createdAt: record.createdAt
    }
  });
}
