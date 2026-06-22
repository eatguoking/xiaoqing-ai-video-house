"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Bug,
  Clapperboard,
  Download,
  CloudDownload,
  FileJson,
  FileText,
  FolderOpen,
  GitBranch,
  KeyRound,
  Languages,
  Library,
  ListVideo,
  Moon,
  Plus,
  Save,
  Sun,
  Trash2
} from "lucide-react";
import { GenerationNode, type GenerationNodeData } from "@/components/nodes/generation-node";
import { BottomPanel, type Asset } from "@/components/panels/bottom-panel";
import { LeftPanel, type NodeKind } from "@/components/panels/left-panel";
import { RightPanel } from "@/components/panels/right-panel";
import { SettingsModal } from "@/components/panels/settings-modal";

const appName = "\u5c0f\u6674\u7684AI\u5f71\u89c6\u5999\u5999\u5c4b";
export type Locale = "zh" | "en";
type ThemeMode = "light" | "dark";

const uiText = {
  zh: {
    projects: "项目",
    storyboard: "分镜",
    library: "角色库",
    templates: "提示词",
    pipeline: "流程",
    timeline: "时间线",
    debug: "调试",
    save: "保存",
    apiConfig: "API配置",
    checkUpdates: "检查更新",
    downloadUpdate: "下载更新",
    installUpdate: "重启更新",
    export: "导出",
    projectGroup: "项目",
    createGroup: "创作",
    flowGroup: "流程",
    systemGroup: "系统",
    exportGroup: "导出",
    language: "中/EN",
    dark: "夜间",
    light: "日间",
    canvasGrid: "#344256",
    projectDefaultName: "新的AI影视项目",
    saved: "已保存",
    unsaved: "未保存",
    loaded: "已加载",
    loadFailed: "加载失败",
    saving: "保存中...",
    saveFailed: "保存失败",
    unsavedChanges: "有未保存修改",
    localStorage: "项目保存在本地 SQLite 中。",
    close: "关闭",
    new: "新建",
    open: "打开",
    rename: "重命名",
    projectName: "项目名称",
    noProjects: "还没有保存的项目",
    projectSubtitle: "创建、打开、重命名或删除本地视频项目。",
    nodes: "节点",
    assets: "资产",
    done: "完成",
    edges: "连线",
    packageContents: "制作包内容",
    markdownPreview: "Markdown预览",
    exportTitle: "导出制作包",
    exportSubtitle: "打包当前画布、文本输出、媒体链接、任务和资产。",
    exportNotice: "媒体文件会以 URL 或 data URL 引用；导出包不会复制外部文件。",
    assetType: "资产",
    saveChanges: "保存修改",
    savedChanges: "已保存",
    savingChanges: "保存中...",
    debugTitle: "调试中心",
    debugSubtitle: "查看外部 API 请求、响应、耗时和错误。",
    loading: "加载中...",
    refresh: "刷新",
    clearLogs: "清空日志",
    noLogs: "暂无 API 日志",
    timelineSubtitle: "把已生成视频整理成粗剪列表。",
    noVideos: "生成或上传的视频资产会显示在这里",
    videoClips: "个视频片段在粗剪中",
    exportCsv: "导出CSV",
    pipelineTitle: "批量流程",
    pipelineSubtitle: "按顺序执行制作步骤，每一步都可以继续编辑。",
    runSelected: "1. 生成当前节点",
    runSelectedDesc: "用已选模型生成剧本、分镜、图片或视频。",
    createNext: "2. 创建下一个节点",
    createNextDesc: "剧本到分镜，分镜到图片，图片到视频。",
    splitStoryboard: "3. 拆分分镜",
    splitStoryboardDesc: "按每个镜头提示词创建图片节点。",
    batchImages: "4. 批量生成图片节点",
    batchImagesDesc: "按顺序生成所有连接的分镜图片节点。",
    saveProject: "5. 保存项目",
    saveProjectDesc: "完成一轮制作后保存当前画布。",
    templateTitle: "提示词模板",
    templateSubtitle: "保存可复用的剧本、分镜、图片和视频提示词结构。",
    templateName: "模板名称",
    templatePlaceholder: "在这里写可复用提示词...",
    saveTemplate: "保存模板",
    allKinds: "全部类型",
    searchTemplates: "搜索模板...",
    noTemplates: "暂无提示词模板",
    apply: "应用",
    libraryTitle: "角色 / 场景库",
    librarySubtitle: "保存可复用的一致性设定，并应用到当前节点输入。",
    name: "名称",
    libraryPlaceholder: "外貌、服装、性格、地点、氛围、一致性备注...",
    saveToLibrary: "保存到库",
    noLibrary: "暂无角色或场景卡片",
    storyboardTitle: "分镜编辑器",
    storyboardSubtitle: "编辑镜号、画面、台词、镜头运动、提示词和时长。",
    shot: "镜号",
    visual: "画面",
    dialogue: "台词",
    camera: "镜头",
    prompt: "提示词",
    sec: "秒",
    row: "行",
    createImageNodes: "创建图片节点",
    saveTable: "保存表格",
    selectStoryboard: "选择一个分镜节点可获得最佳效果。"
  },
  en: {
    projects: "Projects",
    storyboard: "Storyboard",
    library: "Library",
    templates: "Templates",
    pipeline: "Pipeline",
    timeline: "Timeline",
    debug: "Debug",
    save: "Save",
    apiConfig: "API Config",
    checkUpdates: "Check Updates",
    downloadUpdate: "Download Update",
    installUpdate: "Restart to Update",
    export: "Export",
    projectGroup: "Project",
    createGroup: "Create",
    flowGroup: "Flow",
    systemGroup: "System",
    exportGroup: "Export",
    language: "EN/中",
    dark: "Dark",
    light: "Light",
    canvasGrid: "#d8dee8",
    projectDefaultName: "New AI Video Project",
    saved: "Saved",
    unsaved: "Unsaved",
    loaded: "Loaded",
    loadFailed: "Load failed",
    saving: "Saving...",
    saveFailed: "Save failed",
    unsavedChanges: "Unsaved changes",
    localStorage: "Projects are stored locally in SQLite.",
    close: "Close",
    new: "New",
    open: "Open",
    rename: "Rename",
    projectName: "Project name",
    noProjects: "No saved projects yet",
    projectSubtitle: "Create, open, rename, or delete local video projects.",
    nodes: "Nodes",
    assets: "Assets",
    done: "Done",
    edges: "Edges",
    packageContents: "Package contents",
    markdownPreview: "Markdown preview",
    exportTitle: "Export Production Package",
    exportSubtitle: "Package the current canvas, text outputs, media links, jobs, and assets.",
    exportNotice: "Media files are referenced by URL or data URL; this package does not copy external files.",
    assetType: "asset",
    saveChanges: "Save changes",
    savedChanges: "Saved",
    savingChanges: "Saving...",
    debugTitle: "Debug Center",
    debugSubtitle: "Inspect external API requests, responses, latency, and errors.",
    loading: "Loading...",
    refresh: "Refresh",
    clearLogs: "Clear logs",
    noLogs: "No API logs yet",
    timelineSubtitle: "Arrange generated video clips into a rough cut list.",
    noVideos: "Generated or uploaded video assets will appear here",
    videoClips: "video clips in the rough cut.",
    exportCsv: "Export CSV",
    pipelineTitle: "Batch Pipeline",
    pipelineSubtitle: "Run production steps in order while keeping each step editable.",
    runSelected: "1. Run selected node",
    runSelectedDesc: "Generate script, storyboard, image, or video with the selected model.",
    createNext: "2. Create next node",
    createNextDesc: "Script to storyboard, storyboard to image, image to video.",
    splitStoryboard: "3. Split storyboard",
    splitStoryboardDesc: "Create one image node per shot prompt.",
    batchImages: "4. Batch image children",
    batchImagesDesc: "Generate all connected image shot nodes in order.",
    saveProject: "5. Save project",
    saveProjectDesc: "Persist the current canvas after a production pass.",
    templateTitle: "Prompt Templates",
    templateSubtitle: "Save reusable script, storyboard, image, and video prompt structures.",
    templateName: "Template name",
    templatePlaceholder: "Write reusable prompt text here...",
    saveTemplate: "Save template",
    allKinds: "All kinds",
    searchTemplates: "Search templates...",
    noTemplates: "No prompt templates yet",
    apply: "Apply",
    libraryTitle: "Character / Scene Library",
    librarySubtitle: "Keep reusable continuity notes and apply them to the selected node input.",
    name: "Name",
    libraryPlaceholder: "Appearance, costume, personality, location, mood, continuity notes...",
    saveToLibrary: "Save to library",
    noLibrary: "No character or scene cards yet",
    storyboardTitle: "Storyboard Editor",
    storyboardSubtitle: "Edit shots, prompts, dialogue, camera movement, and duration.",
    shot: "Shot",
    visual: "Visual",
    dialogue: "Dialogue",
    camera: "Camera",
    prompt: "Prompt",
    sec: "Sec",
    row: "Row",
    createImageNodes: "Create image nodes",
    saveTable: "Save table",
    selectStoryboard: "Select a storyboard node for best results."
  }
} satisfies Record<Locale, Record<string, string>>;

export type ExternalModelOption = {
  id: string;
  credentialId: string;
  capability: "script" | "image" | "video";
  provider: string;
  model: string;
  label: string;
  sourceName: string;
  baseUrl: string;
  mode: "api";
  status: "ready" | "fallback";
  description: string;
  tags: string[];
};

type ModelsResponse = {
  script?: ExternalModelOption[];
  image?: ExternalModelOption[];
  video?: ExternalModelOption[];
};

type JobRecord = {
  id: string;
  kind: "image" | "video";
  status: "queued" | "running" | "succeeded" | "failed";
  model: string;
  assets?: Array<{ id: string; type: string; title: string; preview: string; url?: string; payload?: Asset["payload"] }>;
  error?: string;
};

type AssetRecord = {
  id: string;
  projectId?: string;
  type: string;
  title: string;
  preview: string;
  url?: string;
  payload?: Asset["payload"];
};

type ProjectSummary = {
  id: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  createdAt: string;
  updatedAt: string;
};

type ProjectPayload = {
  id: string;
  name: string;
  nodes: Node<GenerationNodeData>[];
  edges: Edge[];
  settings?: Record<string, unknown>;
  saved: boolean;
  updatedAt?: string;
};

type ApiLogRecord = {
  id: string;
  capability: string;
  provider: string;
  model: string;
  endpoint: string;
  ok: boolean;
  status: number;
  elapsedMs: number;
  requestJson: string;
  responseText: string;
  error?: string | null;
  createdAt: string;
};

type PromptTemplateRecord = {
  id: string;
  projectId?: string | null;
  scope: "project" | "global";
  kind: string;
  title: string;
  content: string;
  updatedAt: string;
};

const noModelLabel = "No external model";
const editedImageEventType = "xiaoqing:image-edited";
const editedImageStorageKey = "xiaoqing.imageEdited";

type EditedImageEvent = {
  type?: string;
  nodeId?: string;
  asset?: Asset;
  savedAt?: number;
};

const initialNodes: Node<GenerationNodeData>[] = [
  {
    id: "script-1",
    type: "generation",
    position: { x: 40, y: 80 },
    data: {
      title: "Script",
      kind: "script",
      model: noModelLabel,
      status: "idle",
      summary: "Generate structured short drama scripts from a prompt."
    }
  },
  {
    id: "storyboard-1",
    type: "generation",
    position: { x: 360, y: 80 },
    data: {
      title: "Storyboard",
      kind: "storyboard",
      model: noModelLabel,
      status: "idle",
      summary: "Break a script into shots, dialogue, and visual prompts."
    }
  },
  {
    id: "image-1",
    type: "generation",
    position: { x: 680, y: 40 },
    data: {
      title: "Image",
      kind: "image",
      model: noModelLabel,
      status: "idle",
      summary: "Generate key frames with your configured image API."
    }
  },
  {
    id: "video-1",
    type: "generation",
    position: { x: 1000, y: 80 },
    data: {
      title: "Video",
      kind: "video",
      model: noModelLabel,
      status: "idle",
      summary: "Generate video clips with your configured video API."
    }
  }
];

const initialEdges: Edge[] = [
  { id: "e-script-storyboard", source: "script-1", target: "storyboard-1" },
  { id: "e-storyboard-image", source: "storyboard-1", target: "image-1" },
  { id: "e-image-video", source: "image-1", target: "video-1" }
];

function freshInitialNodes() {
  return initialNodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: { ...node.data }
  }));
}

function freshInitialEdges() {
  return initialEdges.map((edge) => ({ ...edge }));
}

const nodeTypes = {
  generation: GenerationNode
};

function assetText(asset: Asset) {
  const topLevelPrompt = (asset as Asset & { prompt?: unknown }).prompt;
  return (
    asset.payload?.rawText ||
    asset.payload?.dialogue ||
    (typeof asset.payload?.prompt === "string" ? asset.payload.prompt : "") ||
    (typeof topLevelPrompt === "string" ? topLevelPrompt : "") ||
    asset.preview ||
    ""
  );
}

function assetUrl(asset: Asset) {
  if (asset.url) return asset.url;
  if (typeof asset.payload?.videoUrl === "string") return asset.payload.videoUrl;
  if (typeof asset.payload?.audioUrl === "string") return asset.payload.audioUrl;
  return typeof asset.payload?.url === "string" ? asset.payload.url : "";
}

function assetPatch(asset: Asset): Partial<GenerationNodeData> {
  const url = assetUrl(asset);
  const text = assetText(asset);
  const imageEditMode = asset.payload?.imageEditMode === true;
  const imageEditPrompt = typeof asset.payload?.prompt === "string" ? asset.payload.prompt : text;
  const imageEditReferenceUrl =
    typeof asset.payload?.referenceImageUrl === "string" ? asset.payload.referenceImageUrl : url;

  return {
    status: "succeeded",
    summary: asset.preview || text,
    assetId: asset.id,
    assetUrl: url || undefined,
    assetPreview: asset.preview,
    assetContent: text,
    imageEditMode: imageEditMode ? true : undefined,
    imageEditPrompt: imageEditMode ? imageEditPrompt : undefined,
    imageEditReferenceUrl: imageEditMode ? imageEditReferenceUrl : undefined
  };
}

function videoSourceUrl(node?: Node<GenerationNodeData>) {
  if (!node) return "";
  return node.data.kind === "image" ? node.data.assetUrl ?? "" : "";
}

const nodeDefaults: Record<NodeKind, Pick<GenerationNodeData, "kind" | "model" | "summary">> = {
  script: {
    kind: "script",
    model: noModelLabel,
    summary: "Generate a script through an external script API."
  },
  storyboard: {
    kind: "storyboard",
    model: noModelLabel,
    summary: "Turn script text into shots and visual prompts."
  },
  character: {
    kind: "character",
    model: noModelLabel,
    summary: "Create character settings and visual consistency notes."
  },
  image: {
    kind: "image",
    model: noModelLabel,
    summary: "Generate character frames, scenes, or key images."
  },
  video: {
    kind: "video",
    model: noModelLabel,
    summary: "Generate text-to-video or image-to-video clips."
  },
  voice: {
    kind: "voice",
    model: "Not configured",
    summary: "Voice APIs can be added as a later category."
  },
  export: {
    kind: "export",
    model: "Local export",
    summary: "Assemble assets and prepare the final output."
  }
};

const defaultPrompt = "Modern urban short drama, 60 seconds, strong conflict, twist ending";

function modelOptionsForKind(kind: GenerationNodeData["kind"] | undefined, models: ModelsResponse) {
  if (kind === "image") return models.image ?? [];
  if (kind === "video") return models.video ?? [];
  if (kind === "script" || kind === "storyboard" || kind === "character") {
    return models.script ?? [];
  }
  return [];
}

function allModels(models: ModelsResponse) {
  return [...(models.script ?? []), ...(models.image ?? []), ...(models.video ?? [])];
}

function findModel(modelId: string, models: ModelsResponse) {
  return allModels(models).find((model) => model.id === modelId);
}

function nodeOutputText(node: Node<GenerationNodeData> | undefined) {
  if (!node) return "";
  return node.data.assetContent || node.data.assetPreview || node.data.summary || "";
}

function nextWorkflowKind(kind: GenerationNodeData["kind"]): GenerationNodeData["kind"] | null {
  if (kind === "script") return "storyboard";
  if (kind === "storyboard") return "image";
  if (kind === "image") return "video";
  return null;
}

function workflowTitle(kind: GenerationNodeData["kind"]) {
  if (kind === "storyboard") return "Storyboard";
  if (kind === "image") return "Image";
  if (kind === "video") return "Video";
  return "Workflow Node";
}

function workflowSummary(kind: GenerationNodeData["kind"]) {
  if (kind === "storyboard") return "Generated from the upstream script node.";
  if (kind === "image") return "Generated from a storyboard shot prompt.";
  if (kind === "video") return "Generated from the upstream image node.";
  return "Generated from the upstream node.";
}

function extractStoryboardPrompts(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const promptLines = lines.filter((line) =>
    /prompt|提示词|画面|镜头|visual|image/i.test(line)
  );
  const candidates = promptLines.length ? promptLines : lines;

  return candidates
    .map((line) =>
      line
        .replace(/^\|+|\|+$/g, "")
        .replace(/^\d+[\).、-]\s*/, "")
        .replace(/\s*\|\s*/g, " ")
        .trim()
    )
    .filter((line) => line.length >= 18)
    .slice(0, 6);
}

function safeFilename(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 60) || "ai-video-canvas";
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function nodeText(data: GenerationNodeData) {
  return data.assetContent || data.assetPreview || data.input || data.summary || "";
}

function sortedWorkflowNodes(nodes: Node<GenerationNodeData>[]) {
  return [...nodes].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
}

function buildExportBundle(input: {
  name: string;
  nodes: Node<GenerationNodeData>[];
  edges: Edge[];
  assets: AssetRecord[];
  jobs: JobRecord[];
}) {
  const workflowNodes = sortedWorkflowNodes(input.nodes);
  return {
    name: input.name,
    exportedAt: new Date().toISOString(),
    summary: {
      nodeCount: input.nodes.length,
      edgeCount: input.edges.length,
      assetCount: input.assets.length,
      completedNodes: input.nodes.filter((node) => node.data.status === "succeeded").length
    },
    workflow: workflowNodes.map((node) => ({
      id: node.id,
      title: node.data.title,
      kind: node.data.kind,
      model: node.data.model,
      status: node.data.status,
      input: node.data.input ?? "",
      outputText: nodeText(node.data),
      assetUrl: node.data.assetUrl ?? "",
      sourceAssetUrl: node.data.sourceAssetUrl ?? "",
      position: node.position
    })),
    edges: input.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target
    })),
    assets: input.assets.map((asset) => ({
      id: asset.id,
      type: asset.type,
      title: asset.title,
      preview: asset.preview,
      url: asset.url ?? "",
      payload: asset.payload ?? {}
    })),
    libraries: input.assets
      .filter((asset) => asset.type === "character" || asset.type === "scene")
      .map((asset) => ({
        id: asset.id,
        type: asset.type,
        title: asset.title,
        content: asset.payload?.rawText || asset.preview
      })),
    timeline: input.assets
      .filter((asset) => asset.type === "video")
      .map((asset, index) => ({
        order: index + 1,
        id: asset.id,
        title: asset.title,
        url: asset.url ?? "",
        notes: asset.preview
      })),
    storyboardCsv: buildStoryboardCsv(
      parseStoryboardRows(
        workflowNodes
          .filter((node) => node.data.kind === "storyboard")
          .map((node) => nodeText(node.data))
          .join("\n")
      )
    ),
    timelineCsv: buildTimelineCsv(input.assets),
    jobs: input.jobs
  };
}

function buildExportMarkdown(bundle: ReturnType<typeof buildExportBundle>) {
  const lines = [
    `# ${bundle.name}`,
    "",
    `Exported at: ${bundle.exportedAt}`,
    "",
    "## Overview",
    "",
    `- Nodes: ${bundle.summary.nodeCount}`,
    `- Connections: ${bundle.summary.edgeCount}`,
    `- Assets: ${bundle.summary.assetCount}`,
    `- Completed nodes: ${bundle.summary.completedNodes}`,
    "",
    "## Workflow",
    ""
  ];

  for (const node of bundle.workflow) {
    lines.push(`### ${node.title}`);
    lines.push("");
    lines.push(`- Type: ${node.kind}`);
    lines.push(`- Status: ${node.status}`);
    lines.push(`- Model: ${node.model}`);
    if (node.input) lines.push(`- Input: ${node.input}`);
    if (node.assetUrl) lines.push(`- Asset URL: ${node.assetUrl}`);
    if (node.sourceAssetUrl) lines.push(`- Source asset URL: ${node.sourceAssetUrl}`);
    if (node.outputText) {
      lines.push("");
      lines.push("```text");
      lines.push(node.outputText);
      lines.push("```");
    }
    lines.push("");
  }

  lines.push("## Assets");
  lines.push("");
  if (!bundle.assets.length) {
    lines.push("No assets exported.");
    lines.push("");
  }

  for (const asset of bundle.assets) {
    lines.push(`### ${asset.title}`);
    lines.push("");
    lines.push(`- Type: ${asset.type}`);
    lines.push(`- Preview: ${asset.preview}`);
    if (asset.url) lines.push(`- URL: ${asset.url}`);
    lines.push("");
  }

  lines.push("## Character And Scene Library");
  lines.push("");
  if (!bundle.libraries.length) {
    lines.push("No library cards exported.");
  } else {
    for (const item of bundle.libraries) {
      lines.push(`### ${item.title}`);
      lines.push("");
      lines.push(`- Type: ${item.type}`);
      lines.push("");
      lines.push("```text");
      lines.push(String(item.content ?? ""));
      lines.push("```");
      lines.push("");
    }
  }

  lines.push("## Timeline");
  lines.push("");
  if (!bundle.timeline.length) {
    lines.push("No video timeline clips exported.");
  } else {
    for (const clip of bundle.timeline) {
      lines.push(`- ${clip.order}. ${clip.title} ${clip.url ? `(${clip.url})` : ""}`);
    }
  }

  lines.push("## Jobs");
  lines.push("");
  if (!bundle.jobs.length) {
    lines.push("No jobs recorded.");
  } else {
    for (const job of bundle.jobs) {
      lines.push(`- ${job.kind} / ${job.model} / ${job.status} / ${job.id}`);
    }
  }

  return lines.join("\n");
}

type StoryboardRow = {
  id: string;
  shot: string;
  visual: string;
  dialogue: string;
  camera: string;
  prompt: string;
  duration: string;
};

function parseStoryboardRows(text: string): StoryboardRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^[-|:\s]+$/.test(line));

  const rows = lines
    .filter((line) => !/shot|visual|dialogue|camera|prompt|duration/i.test(line) || !line.includes("|"))
    .map((line, index) => {
      const cells = line
        .replace(/^\|+|\|+$/g, "")
        .split("|")
        .map((cell) => cell.trim());
      const compact = line.replace(/^\d+[\).、]\s*/, "").trim();

      return {
        id: `shot_${Date.now()}_${index}`,
        shot: cells.length >= 4 ? cells[0] || String(index + 1) : String(index + 1),
        visual: cells.length >= 4 ? cells[1] ?? "" : compact,
        dialogue: cells.length >= 4 ? cells[2] ?? "" : "",
        camera: cells.length >= 4 ? cells[3] ?? "" : "",
        prompt: cells.length >= 5 ? cells[4] ?? "" : compact,
        duration: cells.length >= 6 ? cells[5] ?? "5" : "5"
      };
    })
    .filter((row) => row.visual || row.prompt);

  return rows.length
    ? rows.slice(0, 40)
    : [
        {
          id: `shot_${Date.now()}_0`,
          shot: "1",
          visual: "",
          dialogue: "",
          camera: "",
          prompt: "",
          duration: "5"
        }
      ];
}

function storyboardRowsToText(rows: StoryboardRow[]) {
  return [
    "| Shot | Visual | Dialogue | Camera | Image Prompt | Duration |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) =>
      `| ${row.shot} | ${row.visual} | ${row.dialogue} | ${row.camera} | ${row.prompt} | ${row.duration} |`
    )
  ].join("\n");
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildStoryboardCsv(rows: StoryboardRow[]) {
  return [
    ["Shot", "Visual", "Dialogue", "Camera", "Image Prompt", "Duration"].map(csvEscape).join(","),
    ...rows.map((row) =>
      [row.shot, row.visual, row.dialogue, row.camera, row.prompt, row.duration].map(csvEscape).join(",")
    )
  ].join("\n");
}

function buildTimelineCsv(assets: AssetRecord[]) {
  const videoAssets = assets.filter((asset) => asset.type === "video");
  return [
    ["Order", "Title", "URL", "Preview"].map(csvEscape).join(","),
    ...videoAssets.map((asset, index) =>
      [index + 1, asset.title, asset.url ?? "", asset.preview].map(csvEscape).join(",")
    )
  ].join("\n");
}

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function timecode(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hh = String(Math.floor(total / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}:00`;
}

function buildEdl(assets: AssetRecord[]) {
  const videoAssets = assets.filter((asset) => asset.type === "video");
  let cursor = 0;
  const lines = ["TITLE: XIAOQING_AI_VIDEO_CANVAS", "FCM: NON-DROP FRAME", ""];

  videoAssets.forEach((asset, index) => {
    const duration = Number(asset.payload?.duration ?? 5) || 5;
    const start = cursor;
    const end = cursor + duration;
    lines.push(
      `${String(index + 1).padStart(3, "0")}  AX       V     C        ${timecode(0)} ${timecode(duration)} ${timecode(start)} ${timecode(end)}`,
      `* FROM CLIP NAME: ${asset.title}`,
      asset.url ? `* SOURCE FILE: ${asset.url}` : "",
      ""
    );
    cursor = end;
  });

  return lines.filter((line) => line !== "").join("\n");
}

function buildFcpxml(assets: AssetRecord[], projectName: string) {
  const videoAssets = assets.filter((asset) => asset.type === "video");
  const resources = videoAssets
    .map(
      (asset, index) =>
        `<asset id="r${index + 1}" name="${xmlEscape(asset.title)}" src="${xmlEscape(asset.url ?? "")}" start="0s" duration="${Number(asset.payload?.duration ?? 5) || 5}s" hasVideo="1" />`
    )
    .join("\n      ");
  let cursor = 0;
  const clips = videoAssets
    .map((asset, index) => {
      const duration = Number(asset.payload?.duration ?? 5) || 5;
      const clip = `<asset-clip name="${xmlEscape(asset.title)}" ref="r${index + 1}" offset="${cursor}s" duration="${duration}s" start="0s" />`;
      cursor += duration;
      return clip;
    })
    .join("\n            ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
      ${resources}
  </resources>
  <library>
    <event name="${xmlEscape(projectName)}">
      <project name="${xmlEscape(projectName)}">
        <sequence format="r1" duration="${cursor || 1}s">
          <spine>
            ${clips}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;
}

function errorMessage(result: { error?: string; hint?: string }, fallback: string) {
  return [result.error || fallback, result.hint].filter(Boolean).join(" ");
}

export function CanvasWorkspace() {
  const [locale, setLocale] = useState<Locale>("zh");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [updaterStatus, setUpdaterStatus] = useState<XiaoqingUpdaterPayload | null>(null);
  const [updaterBusy, setUpdaterBusy] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(freshInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(freshInitialEdges());
  const [models, setModels] = useState<ModelsResponse>({ script: [], image: [], video: [] });
  const [loadingModels, setLoadingModels] = useState(false);
  const [projectId, setProjectId] = useState("default-project");
  const [projectName, setProjectName] = useState(appName);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [projectsMessage, setProjectsMessage] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("script-1");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [storyboardOpen, setStoryboardOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [apiLogs, setApiLogs] = useState<ApiLogRecord[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplateRecord[]>([]);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<Node<GenerationNodeData>, Edge> | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Unsaved");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const lastEditedImageSavedAtRef = useRef(0);
  const t = uiText[locale];

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const upstreamText = useMemo(() => {
    if (!selectedNode) return "";
    return edges
      .filter((edge) => edge.target === selectedNode.id)
      .map((edge) => nodeOutputText(nodes.find((node) => node.id === edge.source)))
      .filter(Boolean)
      .join("\n\n");
  }, [edges, nodes, selectedNode]);

  const sourceImageUrl = useMemo(() => {
    if (!selectedNode || selectedNode.data.kind !== "video") return "";
    if (selectedNode.data.sourceAssetUrl) return selectedNode.data.sourceAssetUrl;

    return edges
      .filter((edge) => edge.target === selectedNode.id)
      .map((edge) => videoSourceUrl(nodes.find((node) => node.id === edge.source)))
      .find(Boolean) ?? "";
  }, [edges, nodes, selectedNode]);

  const selectedInput = selectedNode?.data.input ?? prompt;
  const localizedSaveStatus =
    saveStatus === "Saved"
      ? t.saved
      : saveStatus === "Loaded"
        ? t.loaded
        : saveStatus === "Load failed"
          ? t.loadFailed
          : saveStatus === "Saving..."
            ? t.saving
            : saveStatus === "Save failed"
              ? t.saveFailed
              : saveStatus === "Unsaved changes"
                ? t.unsavedChanges
                : saveStatus === "Unsaved"
                  ? t.unsaved
                  : saveStatus;

  const updaterMessage = useMemo(() => {
    if (!updaterStatus) return "";
    const latest = updaterStatus.latestVersion ? ` ${updaterStatus.latestVersion}` : "";
    if (locale === "zh") {
      if (updaterStatus.status === "checking") return "正在检查更新";
      if (updaterStatus.status === "available") return `发现新版本${latest}`;
      if (updaterStatus.status === "none") return "已是最新版";
      if (updaterStatus.status === "downloading") return `正在下载 ${updaterStatus.percent ?? 0}%`;
      if (updaterStatus.status === "downloaded") return "更新已下载，重启后安装";
      if (updaterStatus.status === "installing") return "正在重启安装";
      if (updaterStatus.status === "disabled") return "安装版支持自动更新";
      if (updaterStatus.status === "unconfigured") return "需要先配置 GitHub 发布源";
      return updaterStatus.message ? `更新失败：${updaterStatus.message}` : "更新失败";
    }
    if (updaterStatus.status === "checking") return "Checking for updates";
    if (updaterStatus.status === "available") return `Update available${latest}`;
    if (updaterStatus.status === "none") return "Up to date";
    if (updaterStatus.status === "downloading") return `Downloading ${updaterStatus.percent ?? 0}%`;
    if (updaterStatus.status === "downloaded") return "Update ready, restart to install";
    if (updaterStatus.status === "installing") return "Restarting to install";
    if (updaterStatus.status === "disabled") return "Auto update works in installed builds";
    if (updaterStatus.status === "unconfigured") return "Configure GitHub release feed first";
    return updaterStatus.message ? `Update failed: ${updaterStatus.message}` : "Update failed";
  }, [locale, updaterStatus]);

  const updaterButtonLabel =
    updaterStatus?.status === "available"
      ? t.downloadUpdate
      : updaterStatus?.status === "downloaded"
        ? t.installUpdate
        : t.checkUpdates;

  const selectedImageChildCount = useMemo(() => {
    if (!selectedNode) return 0;
    return edges.filter((edge) => {
      if (edge.source !== selectedNode.id) return false;
      return nodes.find((node) => node.id === edge.target)?.data.kind === "image";
    }).length;
  }, [edges, nodes, selectedNode]);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const response = await fetch("/api/models", { cache: "no-store" });
      const data = (await response.json()) as ModelsResponse;
      setModels({
        script: data.script ?? [],
        image: data.image ?? [],
        video: data.video ?? []
      });
    } catch {
      setModels({ script: [], image: [], video: [] });
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("xiaoqing.locale");
    const savedTheme = window.localStorage.getItem("xiaoqing.theme");
    if (savedLocale === "zh" || savedLocale === "en") setLocale(savedLocale);
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.body.dataset.theme = theme;
    window.localStorage.setItem("xiaoqing.locale", locale);
    window.localStorage.setItem("xiaoqing.theme", theme);
  }, [locale, theme]);

  useEffect(() => {
    if (!window.xiaoqingUpdater) return;
    return window.xiaoqingUpdater.onStatus((payload) => {
      setUpdaterStatus(payload);
      setUpdaterBusy(payload.status === "checking" || payload.status === "downloading" || payload.status === "installing");
    });
  }, []);

  const handleUpdaterAction = useCallback(async () => {
    if (!window.xiaoqingUpdater) {
      setUpdaterStatus({
        status: "disabled",
        message: "Desktop updater bridge is not available."
      });
      return;
    }

    setUpdaterBusy(true);
    try {
      const next =
        updaterStatus?.status === "available"
          ? await window.xiaoqingUpdater.downloadUpdate()
          : updaterStatus?.status === "downloaded"
            ? await window.xiaoqingUpdater.installUpdate()
            : await window.xiaoqingUpdater.checkForUpdates();
      setUpdaterStatus(next);
      setUpdaterBusy(next.status === "checking" || next.status === "downloading" || next.status === "installing");
    } catch (error) {
      setUpdaterStatus({
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      });
      setUpdaterBusy(false);
    }
  }, [updaterStatus?.status]);

  const loadProjects = useCallback(async () => {
    const response = await fetch("/api/project?list=1", { cache: "no-store" });
    const data = (await response.json()) as ProjectSummary[];
    const nextProjects = Array.isArray(data) ? data : [];
    setProjects(nextProjects);
    return nextProjects;
  }, []);

  const loadAssets = useCallback(async (id: string) => {
    const response = await fetch(`/api/assets?projectId=${encodeURIComponent(id)}`, { cache: "no-store" });
    const storedAssets = await response.json();
    setAssets(Array.isArray(storedAssets) ? storedAssets : []);
  }, []);

  const applyProject = useCallback(
    (project: ProjectPayload) => {
      const nextNodes = project.nodes?.length ? project.nodes : freshInitialNodes();
      const nextEdges = project.edges?.length ? project.edges : freshInitialEdges();

      setProjectId(project.id || "default-project");
      setProjectName(project.name || appName);
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(nextNodes[0]?.id ?? "");
      setPrompt(defaultPrompt);
      setJobs([]);
      setAssets([]);
      setSaveStatus(project.saved ? "Loaded" : "Unsaved");
    },
    [setEdges, setNodes]
  );

  const loadProject = useCallback(
    async (id = "default-project") => {
      setSaveStatus("Loading...");
      const response = await fetch(`/api/project?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const project = (await response.json()) as ProjectPayload;
      applyProject(project);
      await loadAssets(project.id || id).catch(() => undefined);
      await loadProjects().catch(() => undefined);
    },
    [applyProject, loadAssets, loadProjects]
  );

  useEffect(() => {
    loadProject("default-project")
      .catch(() => setSaveStatus("Load failed"));
  }, [loadProject]);

  useEffect(() => {
    const options = modelOptionsForKind(selectedNode?.data.kind, models);
    if (options.some((model) => model.id === selectedModelId)) return;
    setSelectedModelId(options[0]?.id ?? "");
  }, [models, selectedModelId, selectedNode?.id, selectedNode?.data.kind]);

  const markDirty = useCallback(() => setSaveStatus("Unsaved changes"), []);

  const onConnect = useCallback(
    (connection: Connection) => {
      markDirty();
      setEdges((currentEdges) => addEdge(connection, currentEdges));
    },
    [markDirty, setEdges]
  );

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      markDirty();
      onNodesChange(changes);
    },
    [markDirty, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      markDirty();
      onEdgesChange(changes);
    },
    [markDirty, onEdgesChange]
  );

  const updateNodeData = useCallback(
    (nodeId: string, patch: Partial<GenerationNodeData>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...patch
                }
              }
            : node
        )
      );
      markDirty();
    },
    [markDirty, setNodes]
  );

  const updateNodeStatus = useCallback(
    (nodeId: string, status: GenerationNodeData["status"], summary?: string, model?: string) => {
      const patch: Partial<GenerationNodeData> = { status };
      if (summary !== undefined) patch.summary = summary;
      if (model !== undefined) patch.model = model;
      updateNodeData(nodeId, patch);
    },
    [updateNodeData]
  );

  const handleAddNode = useCallback(
    (item: { kind: NodeKind; title: string }) => {
      const defaults = nodeDefaults[item.kind];
      const id = `${item.kind}-${Date.now()}`;
      const x = 120 + nodes.length * 34;
      const y = 140 + nodes.length * 22;
      const node: Node<GenerationNodeData> = {
        id,
        type: "generation",
        position: { x, y },
        data: {
          title: item.title,
          kind: defaults.kind,
          model: defaults.model,
          status: "idle",
          summary: defaults.summary
        }
      };

      setNodes((currentNodes) => [...currentNodes, node]);
      setSelectedNodeId(id);
      markDirty();
    },
    [markDirty, nodes.length, setNodes]
  );

  const assetToNodeKind = useCallback((asset: Asset): GenerationNodeData["kind"] => {
    if (asset.type === "image") return "image";
    if (asset.type === "video") return "video";
    if (asset.type === "voice") return "voice";
    if (asset.type === "character") return "character";
    return "script";
  }, []);

  const makeNodeFromAsset = useCallback(
    (asset: Asset, position: { x: number; y: number }, idSuffix = "") => {
      const kind = assetToNodeKind(asset);
      const id = `${kind}-asset-${Date.now()}${idSuffix}`;

      const node: Node<GenerationNodeData> = {
        id,
        type: "generation",
        position,
        data: {
          title: asset.title,
          kind,
          model: asset.payload?.local ? "Local asset" : "Asset",
          status: "succeeded",
          summary: asset.preview,
          ...assetPatch(asset)
        }
      };

      return node;
    },
    [assetToNodeKind]
  );

  const handleAssetDrop = useCallback(
    async (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const bounds = event.currentTarget.getBoundingClientRect();
      const flowPosition = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      }) ?? {
        x: event.clientX - bounds.left - 110,
        y: event.clientY - bounds.top - 60
      };

      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length) {
        const formData = new FormData();
        formData.append("projectId", projectId);
        files.forEach((file) => formData.append("files", file));

        const response = await fetch("/api/assets/upload", {
          method: "POST",
          body: formData
        });
        const result = await response.json();
        const uploadedAssets = Array.isArray(result.assets) ? (result.assets as Asset[]) : [];
        if (!uploadedAssets.length) return;

        const newNodes = uploadedAssets.map((asset, index) =>
          makeNodeFromAsset(
            asset,
            {
              x: flowPosition.x + index * 34,
              y: flowPosition.y + index * 34
            },
            `-${index}`
          )
        );

        setAssets((current) => [...uploadedAssets, ...current]);
        setNodes((currentNodes) => [...currentNodes, ...newNodes]);
        setSelectedNodeId(newNodes[0]?.id ?? selectedNodeId);
        markDirty();
        return;
      }

      const raw = event.dataTransfer.getData("application/x-ai-video-asset");
      if (!raw) return;

      const asset = JSON.parse(raw) as Asset;
      const node = makeNodeFromAsset(
        asset,
        flowPosition
      );

      setNodes((currentNodes) => [...currentNodes, node]);
      setSelectedNodeId(node.id);
      markDirty();
    },
    [makeNodeFromAsset, markDirty, projectId, reactFlowInstance, selectedNodeId, setNodes]
  );

  const handleAssetDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    if (
      event.dataTransfer.types.includes("application/x-ai-video-asset") ||
      event.dataTransfer.types.includes("Files")
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDuplicateNode = useCallback(() => {
    if (!selectedNode) return;
    const id = `${selectedNode.data.kind}-${Date.now()}`;
    const clone: Node<GenerationNodeData> = {
      ...selectedNode,
      id,
      selected: false,
      position: {
        x: selectedNode.position.x + 36,
        y: selectedNode.position.y + 36
      },
      data: {
        ...selectedNode.data,
        title: `${selectedNode.data.title} Copy`,
        status: "idle"
      }
    };

    setNodes((currentNodes) => [...currentNodes, clone]);
    setSelectedNodeId(id);
    markDirty();
  }, [markDirty, selectedNode, setNodes]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNode.id));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)
    );
    const fallback = nodes.find((node) => node.id !== selectedNode.id)?.id ?? "";
    setSelectedNodeId(fallback);
    markDirty();
  }, [markDirty, nodes, selectedNode, setEdges, setNodes]);

  const handleNodeInputChange = useCallback(
    (value: string) => {
      setPrompt(value);
      if (selectedNode) {
        updateNodeData(selectedNode.id, { input: value });
      }
    },
    [selectedNode, updateNodeData]
  );

  const handleUseUpstreamInput = useCallback(() => {
    if (!selectedNode || !upstreamText) return;
    updateNodeData(selectedNode.id, { input: upstreamText });
    setPrompt(upstreamText);
  }, [selectedNode, updateNodeData, upstreamText]);

  const createWorkflowNode = useCallback(
    (
      kind: GenerationNodeData["kind"],
      sourceNode: Node<GenerationNodeData>,
      input: string,
      offset: { x: number; y: number },
      title?: string
    ) => {
      const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const node: Node<GenerationNodeData> = {
        id,
        type: "generation",
        position: {
          x: sourceNode.position.x + offset.x,
          y: sourceNode.position.y + offset.y
        },
        data: {
          title: title ?? workflowTitle(kind),
          kind,
          model: noModelLabel,
          status: "idle",
          summary: workflowSummary(kind),
          input,
          sourceNodeId: sourceNode.id,
          sourceAssetUrl: kind === "video" ? sourceNode.data.assetUrl : undefined
        }
      };

      setNodes((currentNodes) => [...currentNodes, node]);
      setEdges((currentEdges) => [
        ...currentEdges,
        { id: `e-${sourceNode.id}-${id}`, source: sourceNode.id, target: id }
      ]);
      setSelectedNodeId(id);
      markDirty();
      return node;
    },
    [markDirty, setEdges, setNodes]
  );

  const handleCreateNextNode = useCallback(() => {
    if (!selectedNode) return;
    const kind = nextWorkflowKind(selectedNode.data.kind);
    if (!kind) return;
    const input = nodeOutputText(selectedNode) || selectedNode.data.input || prompt;
    createWorkflowNode(kind, selectedNode, input, { x: 320, y: 0 });
  }, [createWorkflowNode, prompt, selectedNode]);

  const handleCreateImageNodesFromStoryboard = useCallback(() => {
    if (!selectedNode || selectedNode.data.kind !== "storyboard") return;
    const sourceText = nodeOutputText(selectedNode) || selectedNode.data.input || prompt;
    const prompts = extractStoryboardPrompts(sourceText);
    if (!prompts.length) {
      updateNodeStatus(
        selectedNode.id,
        "failed",
        "No shot prompts found. Edit the storyboard text, then try splitting again."
      );
      return;
    }

    const createdNodes = prompts.map((shotPrompt, index) =>
      createWorkflowNode("image", selectedNode, shotPrompt, {
        x: 320,
        y: index * 168 - Math.min(prompts.length - 1, 3) * 84
      }, `Image Shot ${index + 1}`)
    );
    setSelectedNodeId(createdNodes[0]?.id ?? selectedNode.id);
  }, [createWorkflowNode, prompt, selectedNode, updateNodeStatus]);

  const handleSave = useCallback(async () => {
    setSaveStatus("Saving...");
    const response = await fetch(`/api/project?id=${encodeURIComponent(projectId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: projectId,
        name: projectName,
        nodes,
        edges,
        settings: {
          aspectRatio: "9:16",
          workspace: "local"
        }
      })
    });

    setSaveStatus(response.ok ? "Saved" : "Save failed");
    if (response.ok) {
      await loadProjects().catch(() => undefined);
    }
  }, [edges, loadProjects, nodes, projectId, projectName]);

  const exportBundle = useMemo(
    () => buildExportBundle({ name: projectName, nodes, edges, assets, jobs }),
    [assets, edges, jobs, nodes, projectName]
  );

  const exportMarkdown = useMemo(() => buildExportMarkdown(exportBundle), [exportBundle]);

  const handleDownloadExport = useCallback(
    (format: "json" | "markdown" | "storyboard" | "timeline" | "edl" | "fcpxml") => {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const baseName = `${safeFilename(projectName)}-${timestamp}`;
      if (format === "json") {
        downloadTextFile(
          `${baseName}.json`,
          JSON.stringify(exportBundle, null, 2),
          "application/json;charset=utf-8"
        );
        return;
      }
      if (format === "storyboard") {
        downloadTextFile(`${baseName}-storyboard.csv`, exportBundle.storyboardCsv, "text/csv;charset=utf-8");
        return;
      }
      if (format === "timeline") {
        downloadTextFile(`${baseName}-timeline.csv`, exportBundle.timelineCsv, "text/csv;charset=utf-8");
        return;
      }
      if (format === "edl") {
        downloadTextFile(`${baseName}.edl`, buildEdl(assets), "text/plain;charset=utf-8");
        return;
      }
      if (format === "fcpxml") {
        downloadTextFile(`${baseName}.fcpxml`, buildFcpxml(assets, projectName), "application/xml;charset=utf-8");
        return;
      }

      downloadTextFile(`${baseName}.md`, exportMarkdown, "text/markdown;charset=utf-8");
    },
    [assets, exportBundle, exportMarkdown, projectName]
  );

  const handleCreateProject = useCallback(
    async (name: string) => {
      setProjectsMessage("Creating project...");
      const response = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nodes: freshInitialNodes(),
          edges: freshInitialEdges(),
          settings: {
            aspectRatio: "9:16",
            workspace: "local"
          }
        })
      });

      if (!response.ok) {
        setProjectsMessage("Create failed");
        return;
      }

      const project = (await response.json()) as ProjectPayload;
      applyProject(project);
      await loadProjects().catch(() => undefined);
      setProjectsMessage("Project created");
    },
    [applyProject, loadProjects]
  );

  const handleOpenProject = useCallback(
    async (id: string) => {
      setProjectsMessage("Opening project...");
      await loadProject(id);
      setProjectsMessage("Project opened");
      setProjectsOpen(false);
    },
    [loadProject]
  );

  const handleRenameProject = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        setProjectsMessage("Project name cannot be empty");
        return;
      }

      setProjectsMessage("Renaming project...");
      const response = await fetch("/api/project", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: trimmed })
      });

      if (!response.ok) {
        setProjectsMessage("Rename failed");
        return;
      }

      if (id === projectId) {
        setProjectName(trimmed);
        setSaveStatus("Saved");
      }
      await loadProjects().catch(() => undefined);
      setProjectsMessage("Project renamed");
    },
    [loadProjects, projectId]
  );

  const handleDeleteProject = useCallback(
    async (id: string) => {
      setProjectsMessage("Deleting project...");
      const response = await fetch(`/api/project?id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        setProjectsMessage("Delete failed");
        return;
      }

      const nextProjects = (await loadProjects().catch(() => [])) as ProjectSummary[];
      if (id === projectId) {
        const fallback = nextProjects.find((project) => project.id !== id);
        if (fallback) {
          await loadProject(fallback.id);
        } else {
          await handleCreateProject(appName);
        }
      }
      setProjectsMessage("Project deleted");
    },
    [handleCreateProject, loadProject, loadProjects, projectId]
  );

  const openNodePreview = useCallback((node: Node<GenerationNodeData>) => {
    const data = node.data;
    if (!data.assetId && !data.assetUrl && !data.assetContent && !data.assetPreview) return;
    setPreviewAsset({
      id: data.assetId ?? node.id,
      nodeId: node.id,
      type: data.kind,
      title: data.title,
      preview: data.assetPreview ?? data.summary,
      url: data.assetUrl,
      payload: {
        rawText: data.assetContent
      }
    });
  }, []);

  const handleOpenImageEditor = useCallback(() => {
    if (!selectedNode || selectedNode.data.kind !== "image" || !selectedNode.data.assetUrl) return;
    const params = new URLSearchParams({
      projectId,
      nodeId: selectedNode.id,
      assetId: selectedNode.data.assetId ?? selectedNode.id,
      title: selectedNode.data.title,
      imageUrl: selectedNode.data.assetUrl
    });
    window.open(`/image-editor?${params.toString()}`, "_blank", "width=1320,height=860");
  }, [projectId, selectedNode]);

  const handleSavePreviewAsset = useCallback(
    async (asset: Asset, draftText: string) => {
      const nextPreview = draftText.trim() ? draftText.trim().slice(0, 180) : asset.preview;
      const nextAsset: Asset = {
        ...asset,
        projectId,
        preview: nextPreview,
        payload: {
          ...(asset.payload ?? {}),
          ...(asset.url ? { url: asset.url } : {}),
          ...(asset.type === "video" && asset.url ? { videoUrl: asset.url } : {}),
          rawText: draftText
        }
      };

      setAssets((current) =>
        current.map((item) =>
          item.id === nextAsset.id
            ? {
                ...item,
                preview: nextAsset.preview,
                payload: nextAsset.payload,
                url: nextAsset.url
              }
            : item
        )
      );

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          const shouldUpdate = node.id === asset.nodeId || node.data.assetId === asset.id;
          return shouldUpdate
            ? {
                ...node,
                data: {
                  ...node.data,
                  summary: nextAsset.preview,
                  assetPreview: nextAsset.preview,
                  assetContent: draftText
                }
              }
            : node;
        })
      );

      if (assets.some((item) => item.id === nextAsset.id)) {
        await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...nextAsset, projectId })
        }).catch(() => undefined);
      }

      setPreviewAsset(nextAsset);
      markDirty();
    },
    [assets, markDirty, projectId, setNodes]
  );

  const applyAssetToNode = useCallback(
    (nodeId: string, asset: Asset) => {
      updateNodeData(nodeId, assetPatch(asset));
    },
    [updateNodeData]
  );

  const applyEditedImageEvent = useCallback(
    (data: EditedImageEvent | null | undefined) => {
      if (data?.type !== editedImageEventType || !data.nodeId || !data.asset) return;
      const savedAt = Number(data.savedAt ?? 0);
      if (savedAt && savedAt <= lastEditedImageSavedAtRef.current) return;
      if (savedAt) lastEditedImageSavedAtRef.current = savedAt;

      setAssets((current) => [data.asset!, ...current.filter((asset) => asset.id !== data.asset!.id)]);
      applyAssetToNode(data.nodeId, data.asset);
      setSelectedNodeId(data.nodeId);
      markDirty();
      window.localStorage.removeItem(editedImageStorageKey);
    },
    [applyAssetToNode, markDirty]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      applyEditedImageEvent(event.data as EditedImageEvent);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== editedImageStorageKey || !event.newValue) return;
      try {
        applyEditedImageEvent(JSON.parse(event.newValue) as EditedImageEvent);
      } catch {
        // Ignore malformed cross-window notifications.
      }
    };

    const handleFocus = () => {
      const raw = window.localStorage.getItem(editedImageStorageKey);
      if (!raw) return;
      try {
        applyEditedImageEvent(JSON.parse(raw) as EditedImageEvent);
      } catch {
        // Ignore malformed saved notifications.
      }
    };

    const channel = "BroadcastChannel" in window ? new BroadcastChannel(editedImageEventType) : null;
    channel?.addEventListener("message", (event) => applyEditedImageEvent(event.data as EditedImageEvent));
    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    return () => {
      channel?.close();
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [applyEditedImageEvent]);

  const handleAssetsUploaded = useCallback((uploadedAssets: Asset[]) => {
    setAssets((current) => [...uploadedAssets, ...current]);
  }, []);

  const handleAssetsDeleted = useCallback((assetIds: string[]) => {
    const deleted = new Set(assetIds);
    setAssets((current) => current.filter((asset) => !deleted.has(asset.id)));
    setPreviewAsset((current) => (current && deleted.has(current.id) ? null : current));
  }, []);

  const handleCreateLibraryAsset = useCallback(
    async (asset: { type: "character" | "scene"; title: string; content: string }) => {
      const nextAsset: Asset = {
        id: `${asset.type}_${Date.now()}`,
        projectId,
        type: asset.type,
        title: asset.title.trim() || (asset.type === "character" ? "New Character" : "New Scene"),
        preview: asset.content.trim().slice(0, 180),
        payload: {
          rawText: asset.content
        }
      };

      await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...nextAsset, projectId })
      });
      setAssets((current) => [nextAsset, ...current]);
    },
    [projectId]
  );

  const handleApplyLibraryAsset = useCallback(
    (asset: Asset) => {
      if (!selectedNode) return;
      const text = assetText(asset);
      const nextInput = [selectedNode.data.input || prompt, `${asset.type}: ${asset.title}\n${text}`]
        .filter(Boolean)
        .join("\n\n");
      updateNodeData(selectedNode.id, { input: nextInput });
      setPrompt(nextInput);
    },
    [prompt, selectedNode, updateNodeData]
  );

  const loadApiLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch("/api/debug/logs", { cache: "no-store" });
      const data = (await response.json()) as ApiLogRecord[];
      setApiLogs(Array.isArray(data) ? data : []);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const clearApiLogs = useCallback(async () => {
    await fetch("/api/debug/logs", { method: "DELETE" });
    setApiLogs([]);
  }, []);

  const loadPromptTemplates = useCallback(async () => {
    const response = await fetch(`/api/prompt-templates?projectId=${encodeURIComponent(projectId)}`, {
      cache: "no-store"
    });
    const data = (await response.json()) as PromptTemplateRecord[];
    setPromptTemplates(Array.isArray(data) ? data : []);
  }, [projectId]);

  const savePromptTemplate = useCallback(
    async (input: { kind: string; title: string; content: string; scope: "project" | "global" }) => {
      const response = await fetch("/api/prompt-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, projectId })
      });
      if (response.ok) {
        await loadPromptTemplates();
      }
    },
    [loadPromptTemplates, projectId]
  );

  const deletePromptTemplate = useCallback(
    async (id: string) => {
      await fetch(`/api/prompt-templates?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadPromptTemplates();
    },
    [loadPromptTemplates]
  );

  const applyPromptTemplate = useCallback(
    (template: PromptTemplateRecord) => {
      if (!selectedNode) return;
      const nextInput = [selectedNode.data.input || prompt, template.content].filter(Boolean).join("\n\n");
      updateNodeData(selectedNode.id, { input: nextInput });
      setPrompt(nextInput);
      setTemplatesOpen(false);
    },
    [prompt, selectedNode, updateNodeData]
  );

  const pollJob = useCallback(
    async (job: JobRecord, nodeId: string) => {
      const endpoint = job.kind === "image" ? `/api/image/jobs/${job.id}` : `/api/video/jobs/${job.id}`;
      const timer = window.setInterval(async () => {
        const response = await fetch(endpoint);
        const nextJob = (await response.json()) as JobRecord;
        setJobs((current) => current.map((item) => (item.id === nextJob.id ? nextJob : item)));

        if (nextJob.status === "succeeded" || nextJob.status === "failed") {
          window.clearInterval(timer);
          if (nextJob.assets?.length) {
            setAssets((current) => [...nextJob.assets!, ...current]);
            applyAssetToNode(nodeId, nextJob.assets[0] as Asset);
          }
          updateNodeStatus(
            nodeId,
            nextJob.status,
            nextJob.status === "succeeded"
              ? "Generation completed. Result added to assets."
              : nextJob.error || "Generation failed. Check the external API config.",
            nextJob.model
          );
        }
      }, job.kind === "video" ? 3000 : 700);
    },
    [applyAssetToNode, updateNodeStatus]
  );

  const generateImageNode = useCallback(
    async (node: Node<GenerationNodeData>, model: ExternalModelOption) => {
      const input =
        node.data.input?.trim() ||
        node.data.assetContent ||
        node.data.assetPreview ||
        node.data.summary ||
        prompt;
      const displayModel = `${model.sourceName} / ${model.model}`;

      updateNodeStatus(node.id, "queued", "Batch image job submitted...", displayModel);
      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: model.id, projectId, input: { prompt: input, projectId } })
      });
      const job = (await response.json()) as JobRecord & { hint?: string };

      if (!response.ok) {
        updateNodeStatus(node.id, "failed", errorMessage(job, "External image API failed."), displayModel);
        return false;
      }

      setJobs((current) => [job, ...current]);
      if (job.assets?.length) {
        setAssets((current) => [...job.assets!, ...current]);
        applyAssetToNode(node.id, job.assets[0] as Asset);
      }

      updateNodeStatus(
        node.id,
        job.status === "failed" ? "failed" : "succeeded",
        job.status === "failed"
          ? job.error || "Image generation failed."
          : "Image generated from storyboard shot.",
        displayModel
      );

      return job.status !== "failed";
    },
    [applyAssetToNode, projectId, prompt, updateNodeStatus]
  );

  const handleGenerateImageChildren = useCallback(async () => {
    if (!selectedNode) return;
    const imageModel = models.image?.[0];
    if (!imageModel) {
      updateNodeStatus(selectedNode.id, "failed", "Configure at least one image API model first.");
      setSettingsOpen(true);
      return;
    }

    const imageChildren = edges
      .filter((edge) => edge.source === selectedNode.id)
      .map((edge) => nodes.find((node) => node.id === edge.target))
      .filter((node): node is Node<GenerationNodeData> => Boolean(node && node.data.kind === "image"));

    if (!imageChildren.length) {
      updateNodeStatus(selectedNode.id, "failed", "Create image nodes from this storyboard first.");
      return;
    }

    setBatchRunning(true);
    updateNodeStatus(
      selectedNode.id,
      "running",
      `Generating ${imageChildren.length} image node${imageChildren.length > 1 ? "s" : ""} in order...`
    );

    let successCount = 0;
    for (const child of imageChildren) {
      const ok = await generateImageNode(child, imageModel);
      if (ok) successCount += 1;
    }

    updateNodeStatus(
      selectedNode.id,
      successCount === imageChildren.length ? "succeeded" : "failed",
      `Batch image generation finished: ${successCount}/${imageChildren.length} succeeded.`
    );
    setBatchRunning(false);
  }, [edges, generateImageNode, models.image, nodes, selectedNode, updateNodeStatus]);

  const handleGenerate = useCallback(async () => {
    if (!selectedNode) return;

    const kind = selectedNode.data.kind;
    const isImageEditRun = kind === "image" && selectedNode.data.imageEditMode === true;
    const nodeInput = isImageEditRun
      ? selectedNode.data.imageEditPrompt || selectedNode.data.assetContent || selectedNode.data.summary
      : selectedNode.data.input?.trim() || upstreamText || prompt;
    const selectedModel = findModel(selectedModelId, models);
    if (!selectedModelId || !selectedModel) {
      updateNodeStatus(selectedNode.id, "failed", "Configure and select an external model first.", noModelLabel);
      setSettingsOpen(true);
      return;
    }

    const displayModel = `${selectedModel.sourceName} / ${selectedModel.model}`;

    if (kind === "script" || kind === "storyboard" || kind === "character") {
      updateNodeStatus(selectedNode.id, "running", "Calling external script API...", displayModel);
      const response = await fetch("/api/script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: selectedModelId, projectId, input: { theme: nodeInput, kind, projectId } })
      });
      const result = await response.json();
      if (!response.ok) {
        updateNodeStatus(selectedNode.id, "failed", errorMessage(result, "External script API failed."), displayModel);
        return;
      }
      const nextAsset = {
        id: result.id,
        projectId,
        type: kind === "character" ? "character" : "script",
        title: result.output.title,
        preview: result.output.logline,
        payload: result.output
      };
      setAssets((current) => [nextAsset, ...current.filter((asset) => asset.id !== nextAsset.id)]);
      updateNodeData(selectedNode.id, {
        ...assetPatch(nextAsset),
        model: displayModel
      });
      return;
    }

    if (kind === "voice" || kind === "export") {
      updateNodeStatus(selectedNode.id, "failed", "Only script, image, and video API categories are configured.", displayModel);
      return;
    }

    const endpoint = kind === "video" ? "/api/video/generate" : "/api/image/generate";
    const mediaInput =
      kind === "video"
        ? {
            prompt: nodeInput,
            imageUrl: sourceImageUrl,
            ratio: selectedNode.data.ratio ?? "9:16",
            duration: selectedNode.data.duration ?? 5,
            camera: selectedNode.data.camera ?? "slow push-in",
            variants: selectedNode.data.variants ?? 1
          }
        : {
            prompt: nodeInput,
            ...(isImageEditRun
              ? {
                  imageUrl: selectedNode.data.imageEditReferenceUrl || selectedNode.data.assetUrl,
                  editMode: true
                }
              : {})
          };
    if (kind === "video" && sourceImageUrl && selectedNode.data.sourceAssetUrl !== sourceImageUrl) {
      updateNodeData(selectedNode.id, { sourceAssetUrl: sourceImageUrl });
    }
    updateNodeStatus(
      selectedNode.id,
      "queued",
      isImageEditRun
        ? "Image edit brief submitted. Reading the saved edit canvas..."
        : "Job submitted. Waiting for the external API...",
      displayModel
    );
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: selectedModelId, projectId, input: { ...mediaInput, projectId } })
    });
    const job = (await response.json()) as JobRecord & { hint?: string };
    if (!response.ok) {
      updateNodeStatus(selectedNode.id, "failed", errorMessage(job, "External API failed."), displayModel);
      return;
    }
    setJobs((current) => [job, ...current]);
    if (job.status === "succeeded") {
      if (job.assets?.length) {
        setAssets((current) => [...job.assets!, ...current]);
        applyAssetToNode(selectedNode.id, job.assets[0] as Asset);
      }
      updateNodeStatus(selectedNode.id, "succeeded", "Generation completed. Result added to assets.", displayModel);
      return;
    }
    pollJob(job, selectedNode.id);
  }, [applyAssetToNode, models, pollJob, projectId, prompt, selectedModelId, selectedNode, sourceImageUrl, updateNodeData, updateNodeStatus, upstreamText]);

  return (
    <main className="workspace-shell">
      <header className="top-bar">
        <div>
          <img className="app-logo" src="/xiaoqing-logo.jpg" alt={appName} />
          <strong>{appName}</strong>
          <small>{localizedSaveStatus}</small>
        </div>
        <div className="top-actions">
          <div className="toolbar-group">
            <span>{t.projectGroup}</span>
            <button type="button" onClick={() => {
              setProjectsOpen(true);
              loadProjects().catch(() => undefined);
            }}>
              <FolderOpen size={16} />
              {t.projects}
            </button>
            <button type="button" onClick={handleSave}>
              <Save size={16} />
              {t.save}
            </button>
          </div>
          <div className="toolbar-group">
            <span>{t.createGroup}</span>
            <button type="button" onClick={() => setStoryboardOpen(true)}>
              <Clapperboard size={16} />
              {t.storyboard}
            </button>
            <button type="button" onClick={() => setLibraryOpen(true)}>
              <Library size={16} />
              {t.library}
            </button>
            <button type="button" onClick={() => {
              setTemplatesOpen(true);
              loadPromptTemplates().catch(() => undefined);
            }}>
              <FileText size={16} />
              {t.templates}
            </button>
          </div>
          <div className="toolbar-group">
            <span>{t.flowGroup}</span>
            <button type="button" onClick={() => setPipelineOpen(true)}>
              <GitBranch size={16} />
              {t.pipeline}
            </button>
            <button type="button" onClick={() => setTimelineOpen(true)}>
              <ListVideo size={16} />
              {t.timeline}
            </button>
          </div>
          <div className="toolbar-group">
            <span>{t.systemGroup}</span>
            <button type="button" onClick={() => {
              setDebugOpen(true);
              loadApiLogs().catch(() => undefined);
            }}>
              <Bug size={16} />
              {t.debug}
            </button>
            <button type="button" onClick={() => setSettingsOpen(true)}>
              <KeyRound size={16} />
              {t.apiConfig}
            </button>
            <button
              className="update-action-button"
              type="button"
              onClick={handleUpdaterAction}
              disabled={updaterBusy}
              title={updaterMessage || t.checkUpdates}
            >
              <CloudDownload size={16} />
              {updaterButtonLabel}
            </button>
            {updaterMessage ? <small className="update-status-text">{updaterMessage}</small> : null}
          </div>
          <div className="toolbar-group toolbar-preferences">
            <button className="preference-button" type="button" onClick={() => setLocale((current) => (current === "zh" ? "en" : "zh"))}>
              <Languages size={16} />
              {t.language}
            </button>
            <button className="preference-button" type="button" onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              {theme === "dark" ? t.light : t.dark}
            </button>
          </div>
          <div className="toolbar-group toolbar-export">
            <span>{t.exportGroup}</span>
            <button className="primary-action" type="button" onClick={() => setExportOpen(true)}>
              <Download size={16} />
              {t.export}
            </button>
          </div>
        </div>
      </header>

      <div className="workspace-body">
        <LeftPanel locale={locale} activeKind={selectedNode?.data.kind} onAddNode={handleAddNode} />
        <section className="canvas-area">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onNodeDoubleClick={(_, node) => openNodePreview(node as Node<GenerationNodeData>)}
            onDrop={handleAssetDrop}
            onDragOver={handleAssetDragOver}
            fitView
          >
            <Background color={t.canvasGrid} gap={22} size={1} />
            <Controls position="bottom-left" />
            <MiniMap pannable zoomable position="bottom-right" />
          </ReactFlow>
        </section>
        <RightPanel
          selectedNode={selectedNode}
          models={models}
          loadingModels={loadingModels}
          prompt={selectedInput}
          upstreamText={upstreamText}
          imageChildCount={selectedImageChildCount}
          batchRunning={batchRunning}
          selectedModelId={selectedModelId}
          onPromptChange={handleNodeInputChange}
          onModelChange={setSelectedModelId}
          onRefreshModels={loadModels}
          onNodeDataChange={(patch) => selectedNode && updateNodeData(selectedNode.id, patch)}
          onDuplicateNode={handleDuplicateNode}
          onDeleteNode={handleDeleteNode}
          onGenerate={handleGenerate}
          onUseUpstreamInput={handleUseUpstreamInput}
          onCreateNextNode={handleCreateNextNode}
          onCreateImageNodesFromStoryboard={handleCreateImageNodesFromStoryboard}
          onGenerateImageChildren={handleGenerateImageChildren}
          onOpenNodePreview={() => selectedNode && openNodePreview(selectedNode)}
          onOpenImageEditor={handleOpenImageEditor}
          onOpenModelConfig={() => setSettingsOpen(true)}
          locale={locale}
        />
      </div>
      <BottomPanel
        assets={assets}
        jobs={jobs}
        projectId={projectId}
        onOpenAsset={setPreviewAsset}
        onAssetsUploaded={handleAssetsUploaded}
        onAssetsDeleted={handleAssetsDeleted}
        locale={locale}
      />
      <ProjectModal
        open={projectsOpen}
        projects={projects}
        activeProjectId={projectId}
        message={projectsMessage}
        locale={locale}
        onClose={() => setProjectsOpen(false)}
        onCreateProject={handleCreateProject}
        onOpenProject={handleOpenProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
      />
      <StoryboardModal
        open={storyboardOpen}
        selectedNode={selectedNode}
        locale={locale}
        onClose={() => setStoryboardOpen(false)}
        onSaveRows={(rows) => {
          if (!selectedNode) return;
          const text = storyboardRowsToText(rows);
          updateNodeData(selectedNode.id, {
            assetContent: text,
            assetPreview: text.slice(0, 180),
            summary: "Storyboard table updated."
          });
          setPrompt(text);
        }}
        onCreateImageNodes={(rows) => {
          if (!selectedNode) return;
          rows
            .filter((row) => row.prompt || row.visual)
            .slice(0, 20)
            .forEach((row, index) => {
              createWorkflowNode(
                "image",
                selectedNode,
                row.prompt || row.visual,
                { x: 320, y: index * 168 - Math.min(rows.length - 1, 3) * 84 },
                `Image Shot ${row.shot || index + 1}`
              );
            });
        }}
      />
      <LibraryModal
        open={libraryOpen}
        assets={assets}
        locale={locale}
        onClose={() => setLibraryOpen(false)}
        onCreate={handleCreateLibraryAsset}
        onApply={handleApplyLibraryAsset}
        onOpenAsset={setPreviewAsset}
      />
      <PromptTemplateModal
        open={templatesOpen}
        templates={promptTemplates}
        selectedKind={selectedNode?.data.kind ?? "script"}
        currentInput={selectedNode?.data.input || prompt}
        locale={locale}
        onClose={() => setTemplatesOpen(false)}
        onSave={savePromptTemplate}
        onDelete={deletePromptTemplate}
        onApply={applyPromptTemplate}
      />
      <PipelineModal
        open={pipelineOpen}
        selectedNode={selectedNode}
        imageChildCount={selectedImageChildCount}
        batchRunning={batchRunning}
        locale={locale}
        onClose={() => setPipelineOpen(false)}
        onGenerate={handleGenerate}
        onCreateNextNode={handleCreateNextNode}
        onSplitStoryboard={handleCreateImageNodesFromStoryboard}
        onGenerateImageChildren={handleGenerateImageChildren}
        onSave={handleSave}
      />
      <TimelineModal
        open={timelineOpen}
        assets={assets}
        locale={locale}
        onClose={() => setTimelineOpen(false)}
        onDownloadCsv={() =>
          downloadTextFile(`${safeFilename(projectName)}-timeline.csv`, buildTimelineCsv(assets), "text/csv;charset=utf-8")
        }
      />
      <DebugModal
        open={debugOpen}
        logs={apiLogs}
        loading={loadingLogs}
        locale={locale}
        onClose={() => setDebugOpen(false)}
        onRefresh={loadApiLogs}
        onClear={clearApiLogs}
      />
      <SettingsModal open={settingsOpen} locale={locale} onClose={() => setSettingsOpen(false)} onChanged={loadModels} />
      <ExportModal
        open={exportOpen}
        bundle={exportBundle}
        markdown={exportMarkdown}
        locale={locale}
        onClose={() => setExportOpen(false)}
        onDownload={handleDownloadExport}
      />
      <AssetPreviewModal
        asset={previewAsset}
        locale={locale}
        onClose={() => setPreviewAsset(null)}
        onSave={handleSavePreviewAsset}
      />
    </main>
  );
}

function StoryboardModal({
  open,
  selectedNode,
  locale,
  onClose,
  onSaveRows,
  onCreateImageNodes
}: {
  open: boolean;
  selectedNode?: Node<GenerationNodeData>;
  locale: Locale;
  onClose: () => void;
  onSaveRows: (rows: StoryboardRow[]) => void;
  onCreateImageNodes: (rows: StoryboardRow[]) => void;
}) {
  const [rows, setRows] = useState<StoryboardRow[]>([]);
  const t = uiText[locale];

  useEffect(() => {
    if (!open) return;
    const source = selectedNode ? nodeText(selectedNode.data) : "";
    setRows(parseStoryboardRows(source));
  }, [open, selectedNode]);

  if (!open) return null;

  const updateRow = (id: string, patch: Partial<StoryboardRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <div className="modal-backdrop studio-modal-backdrop" role="presentation">
      <section className="studio-modal storyboard-modal" role="dialog" aria-modal="true" aria-label="Storyboard editor">
        <header>
          <div>
            <strong>{t.storyboardTitle}</strong>
            <small>{t.storyboardSubtitle}</small>
          </div>
          <button type="button" onClick={onClose}>{t.close}</button>
        </header>
        <div className="storyboard-table">
          <div className="storyboard-row storyboard-row-head">
            <span>{t.shot}</span>
            <span>{t.visual}</span>
            <span>{t.dialogue}</span>
            <span>{t.camera}</span>
            <span>{t.prompt}</span>
            <span>{t.sec}</span>
          </div>
          {rows.map((row) => (
            <div className="storyboard-row" key={row.id}>
              <input value={row.shot} onChange={(event) => updateRow(row.id, { shot: event.target.value })} />
              <textarea value={row.visual} onChange={(event) => updateRow(row.id, { visual: event.target.value })} />
              <textarea value={row.dialogue} onChange={(event) => updateRow(row.id, { dialogue: event.target.value })} />
              <textarea value={row.camera} onChange={(event) => updateRow(row.id, { camera: event.target.value })} />
              <textarea value={row.prompt} onChange={(event) => updateRow(row.id, { prompt: event.target.value })} />
              <input value={row.duration} onChange={(event) => updateRow(row.id, { duration: event.target.value })} />
            </div>
          ))}
        </div>
        <footer>
          <span>{selectedNode ? `Editing ${selectedNode.data.title}` : t.selectStoryboard}</span>
          <div>
            <button
              type="button"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  {
                    id: `shot_${Date.now()}`,
                    shot: String(current.length + 1),
                    visual: "",
                    dialogue: "",
                    camera: "",
                    prompt: "",
                    duration: "5"
                  }
                ])
              }
            >
              <Plus size={16} />
              {t.row}
            </button>
            <button type="button" onClick={() => downloadTextFile("storyboard.csv", buildStoryboardCsv(rows), "text/csv;charset=utf-8")}>
              CSV
            </button>
            <button type="button" onClick={() => onCreateImageNodes(rows)}>
              {t.createImageNodes}
            </button>
            <button className="primary-action" type="button" onClick={() => onSaveRows(rows)}>
              {t.saveTable}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function LibraryModal({
  open,
  assets,
  locale,
  onClose,
  onCreate,
  onApply,
  onOpenAsset
}: {
  open: boolean;
  assets: AssetRecord[];
  locale: Locale;
  onClose: () => void;
  onCreate: (asset: { type: "character" | "scene"; title: string; content: string }) => Promise<void>;
  onApply: (asset: Asset) => void;
  onOpenAsset: (asset: Asset) => void;
}) {
  const [type, setType] = useState<"character" | "scene">("character");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const libraryAssets = assets.filter((asset) => asset.type === "character" || asset.type === "scene");
  const t = uiText[locale];

  if (!open) return null;

  return (
    <div className="modal-backdrop studio-modal-backdrop" role="presentation">
      <section className="studio-modal library-modal" role="dialog" aria-modal="true" aria-label="Character and scene library">
        <header>
          <div>
            <strong>{t.libraryTitle}</strong>
            <small>{t.librarySubtitle}</small>
          </div>
          <button type="button" onClick={onClose}>{t.close}</button>
        </header>
        <div className="library-modal-body">
          <section className="library-create">
            <select value={type} onChange={(event) => setType(event.target.value as "character" | "scene")}>
              <option value="character">Character</option>
              <option value="scene">Scene</option>
            </select>
            <input value={title} placeholder={t.name} onChange={(event) => setTitle(event.target.value)} />
            <textarea value={content} placeholder={t.libraryPlaceholder} onChange={(event) => setContent(event.target.value)} />
            <button
              type="button"
              onClick={async () => {
                await onCreate({ type, title, content });
                setTitle("");
                setContent("");
              }}
            >
              <Plus size={16} />
              {t.saveToLibrary}
            </button>
          </section>
          <section className="library-list">
            {libraryAssets.length === 0 ? (
              <span className="empty-text">{t.noLibrary}</span>
            ) : (
              libraryAssets.map((asset) => (
                <div className="library-card" key={asset.id}>
                  <span>{asset.type}</span>
                  <strong>{asset.title}</strong>
                  <p>{asset.preview}</p>
                  <div>
                    <button type="button" onClick={() => onApply(asset as Asset)}>{t.apply}</button>
                    <button type="button" onClick={() => onOpenAsset(asset as Asset)}>{t.open}</button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function PromptTemplateModal({
  open,
  templates,
  selectedKind,
  currentInput,
  locale,
  onClose,
  onSave,
  onDelete,
  onApply
}: {
  open: boolean;
  templates: PromptTemplateRecord[];
  selectedKind: string;
  currentInput: string;
  locale: Locale;
  onClose: () => void;
  onSave: (input: { kind: string; title: string; content: string; scope: "project" | "global" }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onApply: (template: PromptTemplateRecord) => void;
}) {
  const [kind, setKind] = useState(selectedKind);
  const [scope, setScope] = useState<"project" | "global">("project");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const t = uiText[locale];

  useEffect(() => {
    if (!open) return;
    setKind(selectedKind);
    setContent(currentInput || "");
  }, [currentInput, open, selectedKind]);

  if (!open) return null;

  const filtered = templates.filter((template) => {
    const matchesKind = kind === "all" || template.kind === kind;
    const matchesQuery =
      !query.trim() ||
      `${template.title} ${template.content} ${template.kind}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesKind && matchesQuery;
  });

  return (
    <div className="modal-backdrop studio-modal-backdrop" role="presentation">
      <section className="studio-modal template-modal" role="dialog" aria-modal="true" aria-label="Prompt templates">
        <header>
          <div>
            <strong>{t.templateTitle}</strong>
            <small>{t.templateSubtitle}</small>
          </div>
          <button type="button" onClick={onClose}>{t.close}</button>
        </header>
        <div className="template-modal-body">
          <section className="template-editor">
            <div className="template-editor-grid">
              <select value={kind} onChange={(event) => setKind(event.target.value)}>
                <option value="script">Script</option>
                <option value="storyboard">Storyboard</option>
                <option value="character">Character</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="voice">Voice</option>
              </select>
              <select value={scope} onChange={(event) => setScope(event.target.value as "project" | "global")}>
                <option value="project">Project</option>
                <option value="global">Global</option>
              </select>
            </div>
            <input value={title} placeholder={t.templateName} onChange={(event) => setTitle(event.target.value)} />
            <textarea
              value={content}
              placeholder={t.templatePlaceholder}
              onChange={(event) => setContent(event.target.value)}
            />
            <button
              type="button"
              onClick={async () => {
                await onSave({ kind, title, content, scope });
                setTitle("");
              }}
            >
              <Plus size={16} />
              {t.saveTemplate}
            </button>
          </section>
          <section className="template-list-wrap">
            <div className="template-filter-row">
              <select value={kind} onChange={(event) => setKind(event.target.value)}>
                <option value="all">{t.allKinds}</option>
                <option value="script">Script</option>
                <option value="storyboard">Storyboard</option>
                <option value="character">Character</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="voice">Voice</option>
              </select>
              <input value={query} placeholder={t.searchTemplates} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="template-list">
              {filtered.length === 0 ? (
                <span className="empty-text">{t.noTemplates}</span>
              ) : (
                filtered.map((template) => (
                  <div className="template-card" key={template.id}>
                    <div>
                      <span>{template.kind}</span>
                      <em>{template.scope}</em>
                    </div>
                    <strong>{template.title}</strong>
                    <p>{template.content}</p>
                    <div>
                      <button type="button" onClick={() => onApply(template)}>{t.apply}</button>
                      <button className="icon-danger" type="button" onClick={() => onDelete(template.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function PipelineModal({
  open,
  selectedNode,
  imageChildCount,
  batchRunning,
  locale,
  onClose,
  onGenerate,
  onCreateNextNode,
  onSplitStoryboard,
  onGenerateImageChildren,
  onSave
}: {
  open: boolean;
  selectedNode?: Node<GenerationNodeData>;
  imageChildCount: number;
  batchRunning: boolean;
  locale: Locale;
  onClose: () => void;
  onGenerate: () => void;
  onCreateNextNode: () => void;
  onSplitStoryboard: () => void;
  onGenerateImageChildren: () => void;
  onSave: () => Promise<void>;
}) {
  if (!open) return null;
  const kind = selectedNode?.data.kind;
  const t = uiText[locale];

  return (
    <div className="modal-backdrop studio-modal-backdrop" role="presentation">
      <section className="studio-modal pipeline-modal" role="dialog" aria-modal="true" aria-label="Pipeline">
        <header>
          <div>
            <strong>{t.pipelineTitle}</strong>
            <small>{t.pipelineSubtitle}</small>
          </div>
          <button type="button" onClick={onClose}>{t.close}</button>
        </header>
        <div className="pipeline-steps">
          <button type="button" onClick={onGenerate} disabled={!selectedNode}>
            <strong>{t.runSelected}</strong>
            <small>{t.runSelectedDesc}</small>
          </button>
          <button type="button" onClick={onCreateNextNode} disabled={!selectedNode || !["script", "storyboard", "image"].includes(kind ?? "")}>
            <strong>{t.createNext}</strong>
            <small>{t.createNextDesc}</small>
          </button>
          <button type="button" onClick={onSplitStoryboard} disabled={kind !== "storyboard"}>
            <strong>{t.splitStoryboard}</strong>
            <small>{t.splitStoryboardDesc}</small>
          </button>
          <button type="button" onClick={onGenerateImageChildren} disabled={kind !== "storyboard" || imageChildCount === 0 || batchRunning}>
            <strong>{t.batchImages} ({imageChildCount})</strong>
            <small>{t.batchImagesDesc}</small>
          </button>
          <button type="button" onClick={onSave}>
            <strong>{t.saveProject}</strong>
            <small>{t.saveProjectDesc}</small>
          </button>
        </div>
      </section>
    </div>
  );
}

function TimelineModal({
  open,
  assets,
  locale,
  onClose,
  onDownloadCsv
}: {
  open: boolean;
  assets: AssetRecord[];
  locale: Locale;
  onClose: () => void;
  onDownloadCsv: () => void;
}) {
  if (!open) return null;
  const videoAssets = assets.filter((asset) => asset.type === "video");
  const t = uiText[locale];

  return (
    <div className="modal-backdrop studio-modal-backdrop" role="presentation">
      <section className="studio-modal timeline-modal" role="dialog" aria-modal="true" aria-label="Timeline">
        <header>
          <div>
            <strong>Timeline</strong>
            <small>{t.timelineSubtitle}</small>
          </div>
          <button type="button" onClick={onClose}>{t.close}</button>
        </header>
        <div className="timeline-strip">
          {videoAssets.length === 0 ? (
            <span className="empty-text">{t.noVideos}</span>
          ) : (
            videoAssets.map((asset, index) => (
              <div className="timeline-clip" key={asset.id}>
                <em>{index + 1}</em>
                {asset.url ? <video src={asset.url} muted playsInline /> : <div />}
                <strong>{asset.title}</strong>
                <p>{asset.preview}</p>
              </div>
            ))
          )}
        </div>
        <footer>
          <span>{videoAssets.length} {t.videoClips}</span>
          <button className="primary-action" type="button" onClick={onDownloadCsv}>{t.exportCsv}</button>
        </footer>
      </section>
    </div>
  );
}

function DebugModal({
  open,
  logs,
  loading,
  locale,
  onClose,
  onRefresh,
  onClear
}: {
  open: boolean;
  logs: ApiLogRecord[];
  loading: boolean;
  locale: Locale;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onClear: () => Promise<void>;
}) {
  if (!open) return null;
  const t = uiText[locale];

  return (
    <div className="modal-backdrop studio-modal-backdrop" role="presentation">
      <section className="studio-modal debug-modal" role="dialog" aria-modal="true" aria-label="Debug logs">
        <header>
          <div>
            <strong>{t.debugTitle}</strong>
            <small>{t.debugSubtitle}</small>
          </div>
          <button type="button" onClick={onClose}>{t.close}</button>
        </header>
        <div className="debug-log-actions">
          <button type="button" onClick={onRefresh}>{loading ? t.loading : t.refresh}</button>
          <button type="button" onClick={onClear}>{t.clearLogs}</button>
        </div>
        <div className="debug-log-list">
          {logs.length === 0 ? (
            <span className="empty-text">{t.noLogs}</span>
          ) : (
            logs.map((log) => (
              <details className={log.ok ? "debug-log-row is-ok" : "debug-log-row"} key={log.id}>
                <summary>
                  <span>{log.ok ? "OK" : "ERR"}</span>
                  <strong>{log.capability} / {log.provider} / {log.model}</strong>
                  <em>HTTP {log.status} / {log.elapsedMs}ms</em>
                </summary>
                <small>{log.endpoint}</small>
                {log.error ? <p>{log.error}</p> : null}
                <pre>{`REQUEST\n${log.requestJson}\n\nRESPONSE\n${log.responseText}`}</pre>
              </details>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ProjectModal({
  open,
  projects,
  activeProjectId,
  message,
  locale,
  onClose,
  onCreateProject,
  onOpenProject,
  onRenameProject,
  onDeleteProject
}: {
  open: boolean;
  projects: ProjectSummary[];
  activeProjectId: string;
  message: string;
  locale: Locale;
  onClose: () => void;
  onCreateProject: (name: string) => Promise<void>;
  onOpenProject: (id: string) => Promise<void>;
  onRenameProject: (id: string, name: string) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}) {
  const t = uiText[locale];
  const [newProjectName, setNewProjectName] = useState(t.projectDefaultName);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setDraftNames(
      projects.reduce<Record<string, string>>((acc, project) => {
        acc[project.id] = project.name;
        return acc;
      }, {})
    );
  }, [open, projects]);

  if (!open) return null;

  return (
    <div className="modal-backdrop project-modal-backdrop" role="presentation">
      <section className="project-modal" role="dialog" aria-modal="true" aria-label="Project manager">
        <header>
          <div>
            <strong>{t.projects}</strong>
            <small>{t.projectSubtitle}</small>
          </div>
          <button type="button" onClick={onClose}>
            {t.close}
          </button>
        </header>

        <div className="project-create-row">
          <input
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            placeholder={t.projectName}
          />
          <button type="button" onClick={() => onCreateProject(newProjectName)}>
            <Plus size={16} />
            {t.new}
          </button>
        </div>

        <div className="project-list">
          {projects.length === 0 ? (
            <span className="empty-text">{t.noProjects}</span>
          ) : (
            projects.map((project) => {
              const isActive = project.id === activeProjectId;
              return (
                <div className={isActive ? "project-row is-active" : "project-row"} key={project.id}>
                  <div className="project-row-main">
                    <input
                      value={draftNames[project.id] ?? project.name}
                      onChange={(event) =>
                        setDraftNames((current) => ({
                          ...current,
                          [project.id]: event.target.value
                        }))
                      }
                    />
                    <small>
                      {project.nodeCount} nodes / {project.edgeCount} edges / {new Date(project.updatedAt).toLocaleString()}
                    </small>
                  </div>
                  <div className="project-row-actions">
                    <button type="button" onClick={() => onOpenProject(project.id)} disabled={isActive}>
                      {t.open}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRenameProject(project.id, draftNames[project.id] ?? project.name)}
                    >
                      {t.rename}
                    </button>
                    <button
                      className="icon-danger"
                      type="button"
                      onClick={() => onDeleteProject(project.id)}
                      aria-label={`Delete ${project.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer>
          <span>{message || t.localStorage}</span>
        </footer>
      </section>
    </div>
  );
}

function ExportModal({
  open,
  bundle,
  markdown,
  locale,
  onClose,
  onDownload
}: {
  open: boolean;
  bundle: ReturnType<typeof buildExportBundle>;
  markdown: string;
  locale: Locale;
  onClose: () => void;
  onDownload: (format: "json" | "markdown" | "storyboard" | "timeline" | "edl" | "fcpxml") => void;
}) {
  if (!open) return null;
  const t = uiText[locale];

  return (
    <div className="modal-backdrop export-backdrop" role="presentation">
      <section className="export-modal" role="dialog" aria-modal="true" aria-label="Export package">
        <header>
          <div>
            <strong>{t.exportTitle}</strong>
            <small>{t.exportSubtitle}</small>
          </div>
          <button type="button" onClick={onClose}>
            {t.close}
          </button>
        </header>

        <div className="export-summary-grid">
          <div>
            <span>{t.nodes}</span>
            <strong>{bundle.summary.nodeCount}</strong>
          </div>
          <div>
            <span>{t.assets}</span>
            <strong>{bundle.summary.assetCount}</strong>
          </div>
          <div>
            <span>{t.done}</span>
            <strong>{bundle.summary.completedNodes}</strong>
          </div>
          <div>
            <span>{t.edges}</span>
            <strong>{bundle.summary.edgeCount}</strong>
          </div>
        </div>

        <div className="export-body">
          <section className="export-preview-list">
            <div className="panel-section-title">{t.packageContents}</div>
            {bundle.workflow.map((node) => (
              <div className="export-preview-row" key={node.id}>
                <span>{node.kind}</span>
                <div>
                  <strong>{node.title}</strong>
                  <small>{node.status} / {node.model}</small>
                </div>
              </div>
            ))}
          </section>
          <section className="export-markdown-preview">
            <div className="panel-section-title">{t.markdownPreview}</div>
            <pre>{markdown}</pre>
          </section>
        </div>

        <footer>
          <span>{t.exportNotice}</span>
          <div>
            <button type="button" onClick={() => onDownload("json")}>
              <FileJson size={16} />
              JSON
            </button>
            <button type="button" onClick={() => onDownload("storyboard")}>
              Storyboard CSV
            </button>
            <button type="button" onClick={() => onDownload("timeline")}>
              Timeline CSV
            </button>
            <button type="button" onClick={() => onDownload("edl")}>
              EDL
            </button>
            <button type="button" onClick={() => onDownload("fcpxml")}>
              FCPXML
            </button>
            <button className="primary-action" type="button" onClick={() => onDownload("markdown")}>
              <FileText size={16} />
              Markdown
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function AssetPreviewModal({
  asset,
  locale,
  onClose,
  onSave
}: {
  asset: Asset | null;
  locale: Locale;
  onClose: () => void;
  onSave: (asset: Asset, draftText: string) => Promise<void>;
}) {
  const t = uiText[locale];
  const [draftText, setDraftText] = useState("");
  const [saveLabel, setSaveLabel] = useState(t.saveChanges);

  useEffect(() => {
    if (!asset) return;
    setDraftText(asset.payload?.rawText || asset.payload?.dialogue || asset.preview || "");
    setSaveLabel(t.saveChanges);
  }, [asset, t.saveChanges]);

  if (!asset) return null;

  return (
    <div className="modal-backdrop asset-preview-backdrop" role="presentation">
      <section className="asset-preview-modal" role="dialog" aria-modal="true" aria-label="Asset preview">
        <header>
          <div>
            <strong>{asset.title}</strong>
            <small>{asset.type} {t.assetType}</small>
          </div>
          <div className="asset-preview-actions">
            <button
              type="button"
              onClick={async () => {
                setSaveLabel(t.savingChanges);
                await onSave(asset, draftText);
                setSaveLabel(t.savedChanges);
              }}
            >
              {saveLabel}
            </button>
            <button type="button" onClick={onClose}>
              {t.close}
            </button>
          </div>
        </header>

        {asset.type === "image" && asset.url ? (
          <div className="asset-preview-image-wrap">
            <img src={asset.url} alt={asset.title} />
          </div>
        ) : asset.type === "video" && asset.url ? (
          <div className="asset-preview-video-wrap">
            <video src={asset.url} controls playsInline />
          </div>
        ) : asset.type === "voice" && asset.url ? (
          <div className="asset-preview-audio-wrap">
            <audio src={asset.url} controls />
          </div>
        ) : (
          <textarea
            className="asset-preview-editor"
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
          />
        )}

        {(asset.type === "image" || asset.type === "video" || asset.type === "voice") && asset.url ? (
          <textarea
            className="asset-preview-caption"
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
          />
        ) : null}
      </section>
    </div>
  );
}
