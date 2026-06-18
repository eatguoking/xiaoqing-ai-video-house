import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json"
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const uploadRoot = process.env.APP_UPLOAD_DIR;
  if (!uploadRoot) {
    return NextResponse.json({ error: "Local file storage is not configured." }, { status: 404 });
  }

  const { path: parts } = await params;
  const requestedPath = path.resolve(uploadRoot, ...parts);
  const root = path.resolve(uploadRoot);

  if (!requestedPath.startsWith(root) || !existsSync(requestedPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const stream = createReadStream(requestedPath);
  const ext = path.extname(requestedPath).toLowerCase();
  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": mimeTypes[ext] ?? "application/octet-stream"
    }
  });
}
