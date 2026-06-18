export function readByPath(payload: unknown, path: string | null | undefined) {
  const trimmed = String(path ?? "").trim();
  if (!trimmed) return undefined;

  const parts = trimmed
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

  let current = payload;
  for (const part of parts) {
    if (Array.isArray(current)) {
      current = current[Number(part)];
      continue;
    }
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
      continue;
    }
    return undefined;
  }

  return current;
}

export function readStringByPath(payload: unknown, path: string | null | undefined) {
  const value = readByPath(payload, path);
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
