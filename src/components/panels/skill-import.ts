"use client";

import type { SkillRecord } from "@/components/panels/skill-library-modal";
import type { GenerationNodeData } from "@/components/nodes/generation-node";

type SkillKind = GenerationNodeData["kind"] | "all";

export type SkillImportResult = {
  skills: SkillRecord[];
  errors: string[];
};

type TextEntry = {
  name: string;
  text: string;
};

const textFilePattern = /\.(json|md|markdown|txt|prompt)$/i;
const kindHints: Array<[SkillKind, string[]]> = [
  ["script", ["script", "剧本", "短剧", "story", "screenplay"]],
  ["storyboard", ["storyboard", "分镜", "镜头", "shot"]],
  ["character", ["character", "角色", "人物", "一致性"]],
  ["image", ["image", "图片", "图像", "绘图", "视觉", "prompt"]],
  ["video", ["video", "视频", "运镜", "motion", "camera"]],
  ["voice", ["voice", "音频", "语音", "audio"]],
  ["export", ["export", "导出"]]
];

export async function importSkillsFromFiles(files: File[]): Promise<SkillImportResult> {
  const imported: SkillRecord[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const entries = await entriesFromFile(file);
      for (const entry of entries) {
        const parsed = parseSkillEntry(entry.name, entry.text);
        imported.push(...parsed);
      }
    } catch (error) {
      errors.push(`${file.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { skills: dedupeImportedSkills(imported), errors };
}

export function selectSkillsForNode(
  allSkills: SkillRecord[],
  nodeKind: GenerationNodeData["kind"],
  input: string,
  manualIds: string[] = [],
  autoDetect = true
) {
  const manual = manualIds
    .map((id) => allSkills.find((skill) => skill.id === id))
    .filter((skill): skill is SkillRecord => Boolean(skill && isApplicable(skill, nodeKind)));

  if (!autoDetect) return manual;

  const selected = new Map(manual.map((skill) => [skill.id, skill]));
  const candidates = allSkills
    .filter((skill) => skill.enabled && !selected.has(skill.id) && isApplicable(skill, nodeKind))
    .map((skill) => ({ skill, score: skillScore(skill, nodeKind, input) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, 3 - selected.size));

  for (const item of candidates) selected.set(item.skill.id, item.skill);
  return Array.from(selected.values());
}

function isApplicable(skill: SkillRecord, nodeKind: GenerationNodeData["kind"]) {
  return skill.enabled && (skill.appliesTo.includes("all") || skill.appliesTo.includes(nodeKind));
}

function skillScore(skill: SkillRecord, nodeKind: GenerationNodeData["kind"], input: string) {
  let score = skill.appliesTo.includes(nodeKind) ? 3 : 1;
  const haystack = `${input} ${skill.name} ${skill.tags.join(" ")}`.toLowerCase();
  for (const tag of skill.tags) {
    if (tag && input.toLowerCase().includes(tag.toLowerCase())) score += 2;
  }
  const hints = kindHints.find(([kind]) => kind === nodeKind)?.[1] ?? [];
  for (const hint of hints) {
    if (haystack.includes(hint.toLowerCase())) score += 1;
  }
  return score;
}

async function entriesFromFile(file: File): Promise<TextEntry[]> {
  if (/\.zip$/i.test(file.name)) return zipTextEntries(file);
  if (!textFilePattern.test(file.name)) throw new Error("只支持 JSON、Markdown、TXT、Prompt 或 ZIP 文件。");
  return [{ name: file.name, text: await file.text() }];
}

function parseSkillEntry(name: string, text: string): SkillRecord[] {
  if (/\.json$/i.test(name)) {
    const parsed = JSON.parse(text);
    const rawItems: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { skills?: unknown[] }).skills)
        ? (parsed as { skills: unknown[] }).skills
        : [parsed];
    return rawItems.map((item: unknown) => normalizeSkill(item, name)).filter(Boolean) as SkillRecord[];
  }

  return [skillFromText(name, text)];
}

function normalizeSkill(value: unknown, sourceName: string): SkillRecord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<SkillRecord> & Record<string, unknown>;
  const name = String(item.name || item.title || fileBaseName(sourceName)).trim();
  const promptTemplate = String(item.promptTemplate || item.prompt || item.template || "{{input}}").trim();
  const tags = Array.isArray(item.tags)
    ? item.tags.map(String).filter(Boolean)
    : String(item.tags || "").split(/[,，\s]+/).map((tag) => tag.trim()).filter(Boolean);
  const appliesTo = normalizeKinds(item.appliesTo, `${name} ${tags.join(" ")} ${sourceName}`);

  return {
    id: uniqueSkillId(),
    name,
    appliesTo,
    enabled: item.enabled !== false,
    systemPrompt: String(item.systemPrompt || item.system || "").trim(),
    promptTemplate: promptTemplate.includes("{{input}}") ? promptTemplate : `${promptTemplate}\n\n{{input}}`,
    outputFormat: String(item.outputFormat || item.format || "").trim(),
    tags
  };
}

function skillFromText(sourceName: string, text: string): SkillRecord {
  const clean = text.trim();
  const title = clean.match(/^#\s+(.+)$/m)?.[1]?.trim() || fileBaseName(sourceName);
  const description = clean.match(/description\s*:\s*(.+)/i)?.[1]?.trim();
  const tags = inferTags(`${sourceName} ${title} ${description ?? ""} ${clean.slice(0, 300)}`);

  return {
    id: uniqueSkillId(),
    name: title,
    appliesTo: normalizeKinds(undefined, `${sourceName} ${title} ${tags.join(" ")} ${clean.slice(0, 400)}`),
    enabled: true,
    systemPrompt: description ?? "",
    promptTemplate: clean.includes("{{input}}") ? clean : `${clean}\n\n用户输入：\n{{input}}`,
    outputFormat: "",
    tags
  };
}

function normalizeKinds(value: unknown, hintText: string): SkillKind[] {
  const raw = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(/[,，\s/]+/) : [];
  const normalized = raw.filter((kind): kind is SkillKind => isSkillKind(kind));
  if (normalized.length > 0) return Array.from(new Set(normalized));

  const lowered = hintText.toLowerCase();
  const inferred = kindHints
    .filter(([, hints]) => hints.some((hint) => lowered.includes(hint.toLowerCase())))
    .map(([kind]) => kind);
  return inferred.length > 0 ? Array.from(new Set(inferred)) : ["all"];
}

function isSkillKind(value: string): value is SkillKind {
  return ["all", "script", "storyboard", "character", "image", "video", "voice", "export"].includes(value);
}

function inferTags(text: string) {
  const lowered = text.toLowerCase();
  const tags = kindHints
    .flatMap(([, hints]) => hints)
    .filter((hint) => lowered.includes(hint.toLowerCase()))
    .slice(0, 6);
  return Array.from(new Set(tags));
}

function fileBaseName(name: string) {
  return name.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") || "Imported Skill";
}

function uniqueSkillId() {
  return `skill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function dedupeImportedSkills(skills: SkillRecord[]) {
  const seen = new Set<string>();
  return skills.filter((skill) => {
    const key = `${skill.name}|${skill.promptTemplate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function zipTextEntries(file: File): Promise<TextEntry[]> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const centralOffset = findCentralDirectory(view);
  if (centralOffset < 0) throw new Error("无法读取 ZIP 目录。");

  const entries: TextEntry[] = [];
  let offset = centralOffset;
  const decoder = new TextDecoder();

  while (offset + 46 <= view.byteLength && view.getUint32(offset, true) === 0x02014b50) {
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameBytes = new Uint8Array(buffer, offset + 46, nameLength);
    const name = decoder.decode(nameBytes);
    offset += 46 + nameLength + extraLength + commentLength;

    if (name.endsWith("/") || !textFilePattern.test(name)) continue;
    const text = await readZipEntry(buffer, localHeaderOffset, compressedSize, method);
    entries.push({ name, text });
  }

  if (entries.length === 0) throw new Error("ZIP 里没有可导入的 Skill 文本文件。");
  return entries;
}

function findCentralDirectory(view: DataView) {
  const min = Math.max(0, view.byteLength - 65557);
  for (let offset = view.byteLength - 22; offset >= min; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return view.getUint32(offset + 16, true);
    }
  }
  return -1;
}

async function readZipEntry(buffer: ArrayBuffer, localHeaderOffset: number, compressedSize: number, method: number) {
  const view = new DataView(buffer);
  if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) throw new Error("ZIP 文件头损坏。");

  const nameLength = view.getUint16(localHeaderOffset + 26, true);
  const extraLength = view.getUint16(localHeaderOffset + 28, true);
  const dataOffset = localHeaderOffset + 30 + nameLength + extraLength;
  const compressed = new Uint8Array(buffer, dataOffset, compressedSize);

  if (method === 0) return new TextDecoder().decode(compressed);
  if (method !== 8) throw new Error(`不支持的 ZIP 压缩方式：${method}`);

  type DecompressionCtor = new (format: string) => TransformStream<Uint8Array, Uint8Array>;
  const Decompression = (globalThis as unknown as { DecompressionStream?: DecompressionCtor }).DecompressionStream;
  if (!Decompression) throw new Error("当前运行环境不支持 ZIP 解压。");

  const stream = new Blob([compressed]).stream().pipeThrough(new Decompression("deflate-raw"));
  const output = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(output);
}
