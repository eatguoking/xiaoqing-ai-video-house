import { NextResponse } from "next/server";

const allowedLocalPrefixes = ["/uploads/", "/api/local-files/"];

function isAllowedSource(value: string) {
  if (allowedLocalPrefixes.some((prefix) => value.startsWith(prefix))) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const source = requestUrl.searchParams.get("url") ?? "";

  if (!source || !isAllowedSource(source)) {
    return NextResponse.json({ error: "Unsupported image source." }, { status: 400 });
  }

  const target = source.startsWith("/")
    ? new URL(source, requestUrl.origin).toString()
    : source;
  const response = await fetch(target);
  if (!response.ok) {
    return NextResponse.json({ error: "Image fetch failed." }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Source is not an image." }, { status: 400 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300"
    }
  });
}
