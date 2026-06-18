import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function parsePayload(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
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
  const saved = [];

  for (const asset of incomingAssets) {
    const id = asset.id ?? `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

    const record = await prisma.asset.upsert({
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
    });
    saved.push(record);
  }

  return NextResponse.json({ saved: saved.length });
}
