"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CheckCircle2, Clock3, Film, Image, Loader2, Mic2, PenLine, Sparkles, UserRound } from "lucide-react";

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
  skillIds?: string[];
  autoSkillEnabled?: boolean;
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
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
}
