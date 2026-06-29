"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CheckCircle2, Clock3, Film, Image, Loader2, Mic2, PenLine, Plus, Sparkles, UserRound } from "lucide-react";

export type GenerationNodeData = {
  title: string;
  kind: "script" | "storyboard" | "image" | "video" | "voice" | "export" | "character";
  model: string;
  status: "idle" | "queued" | "running" | "succeeded" | "failed";
  summary: string;
  input?: string;
  sourceNodeId?: string;
  sourceAssetUrl?: string;
  assetId?: string;
  assetUrl?: string;
  assetPreview?: string;
  assetContent?: string;
  imageEditMode?: boolean;
  imageEditPrompt?: string;
  imageEditReferenceUrl?: string;
  ratio?: string;
  size?: string;
  resolution?: string;
  variants?: number;
  duration?: number;
  camera?: string;
  style?: string;
  length?: string;
  language?: string;
  temperature?: number;
  skillId?: string;
  onQuickAdd?: (kind: GenerationNodeData["kind"]) => void;
};

const iconMap = {
  script: PenLine,
  storyboard: Sparkles,
  image: Image,
  video: Film,
  voice: Mic2,
  export: CheckCircle2,
  character: UserRound
};

const statusText = {
  idle: "Ready",
  queued: "Queued",
  running: "Running",
  succeeded: "Done",
  failed: "Failed"
};

export function GenerationNode({ data, selected }: NodeProps) {
  const nodeData = data as GenerationNodeData;
  const Icon = iconMap[nodeData.kind] ?? Sparkles;
  const isBusy = nodeData.status === "queued" || nodeData.status === "running";
  const recommendedKind = nextKind(nodeData.kind);
  const quickKinds = recommendedKind
    ? [recommendedKind, ...allQuickKinds.filter((kind) => kind !== recommendedKind)]
    : allQuickKinds;

  return (
    <div className={`generation-node ${selected ? "is-selected" : ""} node-${nodeData.kind}`}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <div className="node-header">
        <span className="node-icon">
          <Icon size={16} />
        </span>
        <div>
          <div className="node-title">{nodeData.title}</div>
          <div className="node-model">{nodeData.model}</div>
        </div>
      </div>
      {nodeData.kind === "voice" && nodeData.assetUrl ? (
        <audio className="node-preview-audio" src={nodeData.assetUrl} controls />
      ) : nodeData.kind === "video" && nodeData.assetUrl ? (
        <video className="node-preview-video" src={nodeData.assetUrl} muted playsInline controls />
      ) : nodeData.kind === "video" && nodeData.sourceAssetUrl ? (
        <img className="node-preview-image" src={nodeData.sourceAssetUrl} alt={`${nodeData.title} source`} />
      ) : nodeData.assetUrl ? (
        <img className="node-preview-image" src={nodeData.assetUrl} alt={nodeData.title} />
      ) : nodeData.assetPreview || nodeData.assetContent ? (
        <div className="node-preview-text">{nodeData.assetContent || nodeData.assetPreview}</div>
      ) : (
        <div className="node-summary">{nodeData.summary}</div>
      )}
      <div className={`node-status status-${nodeData.status}`}>
        {isBusy ? <Loader2 size={13} className="spin" /> : <Clock3 size={13} />}
        {statusText[nodeData.status]}
      </div>
      <div className="node-quick-add" onPointerDown={(event) => event.stopPropagation()}>
        <button className="node-quick-add-button" type="button" aria-label="Add connected node">
          <Plus size={16} />
        </button>
        <div className="node-quick-menu">
          {quickKinds.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                nodeData.onQuickAdd?.(kind);
              }}
            >
              {kindLabel[kind]}
            </button>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
}

const allQuickKinds: GenerationNodeData["kind"][] = ["script", "storyboard", "character", "image", "video", "voice", "export"];

const kindLabel: Record<GenerationNodeData["kind"], string> = {
  script: "剧本",
  storyboard: "分镜",
  image: "图片",
  video: "视频",
  voice: "语音",
  export: "导出",
  character: "角色"
};

function nextKind(kind: GenerationNodeData["kind"]): GenerationNodeData["kind"] | null {
  if (kind === "script") return "storyboard";
  if (kind === "storyboard") return "image";
  if (kind === "image") return "video";
  if (kind === "video" || kind === "voice") return "export";
  if (kind === "character") return "image";
  return null;
}
