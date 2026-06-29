"use client";

import {
  Archive,
  Boxes,
  Film,
  Folder,
  Image,
  LibraryBig,
  MessageSquareText,
  Mic2,
  PenLine,
  Rows3,
  Scissors,
  Trash2,
  UserRound,
  Volume2
} from "lucide-react";
import type { GenerationNodeData } from "@/components/nodes/generation-node";
import type { Locale } from "@/components/canvas/canvas-workspace";

export type NodeKind = GenerationNodeData["kind"];

type LibraryItem = {
  kind: NodeKind;
  title: string;
  icon: typeof PenLine;
  description: string;
};

const nodeLibrary: LibraryItem[] = [
  { kind: "script", title: "Script", icon: PenLine, description: "Generate story scripts" },
  { kind: "storyboard", title: "Storyboard", icon: Rows3, description: "Break script into shots" },
  { kind: "image", title: "Image", icon: Image, description: "Create characters and frames" },
  { kind: "video", title: "Video", icon: Film, description: "Generate video clips" },
  { kind: "character", title: "Character", icon: UserRound, description: "Keep character settings" },
  { kind: "voice", title: "Voice", icon: Mic2, description: "Voice API can be added later" },
  { kind: "export", title: "Export", icon: Scissors, description: "Assemble final output" }
];

type Props = {
  locale: Locale;
  activeKind?: NodeKind;
  onAddNode: (item: LibraryItem) => void;
  onOpenSkillLibrary: () => void;
};

type StaticNavItem = {
  key: string;
  icon: typeof Folder;
  title: string;
};

const labels = {
  zh: {
    nodeLibrary: "节点库",
    creationNodes: "创作节点",
    assetNodes: "资产节点",
    project: "项目",
    assetLibrary: "素材库",
    characterLibrary: "角色库",
    skillLibrary: "Skill 库",
    promptLibrary: "提示词库",
    modelLibrary: "模型库",
    soundLibrary: "音效库",
    currentProject: "夏日小镇的奇遇",
    recycleBin: "回收站",
    ratio: "画幅",
    type: "类型",
    add: "添加",
    items: {
      script: ["剧本", "生成故事剧本"],
      storyboard: ["分镜", "拆分剧本镜头"],
      image: ["图片", "生成角色和画面"],
      video: ["视频", "生成视频片段"],
      character: ["角色", "保存角色设定"],
      voice: ["声音", "语音 API 后续可扩展"],
      export: ["导出", "组装最终输出"]
    }
  },
  en: {
    nodeLibrary: "Node Library",
    creationNodes: "Creation Nodes",
    assetNodes: "Asset Nodes",
    project: "Project",
    assetLibrary: "Asset Library",
    characterLibrary: "Character Library",
    skillLibrary: "Skill Library",
    promptLibrary: "Prompt Library",
    modelLibrary: "Model Library",
    soundLibrary: "Sound Library",
    currentProject: "Summer Town Story",
    recycleBin: "Recycle Bin",
    ratio: "Ratio",
    type: "Type",
    add: "Add",
    items: {
      script: ["Script", "Generate story scripts"],
      storyboard: ["Storyboard", "Break script into shots"],
      image: ["Image", "Create characters and frames"],
      video: ["Video", "Generate video clips"],
      character: ["Character", "Keep character settings"],
      voice: ["Voice", "Voice API can be added later"],
      export: ["Export", "Assemble final output"]
    }
  }
} as const;

export function LeftPanel({ locale, activeKind = "script", onAddNode, onOpenSkillLibrary }: Props) {
  const t = labels[locale];
  const assetNav: StaticNavItem[] = [
    { key: "assets", icon: Folder, title: t.assetLibrary },
    { key: "characters", icon: UserRound, title: t.characterLibrary },
    { key: "skills", icon: LibraryBig, title: t.skillLibrary },
    { key: "prompts", icon: MessageSquareText, title: t.promptLibrary },
    { key: "models", icon: Boxes, title: t.modelLibrary },
    { key: "sounds", icon: Volume2, title: t.soundLibrary }
  ];
  const projectNav: StaticNavItem[] = [
    { key: "current-project", icon: Archive, title: t.currentProject },
    { key: "trash", icon: Trash2, title: t.recycleBin }
  ];

  const renderLibraryItem = (item: LibraryItem) => {
    const Icon = item.icon;
    const [title, description] = t.items[item.kind];
    return (
      <button
        className={`library-item library-${item.kind} ${item.kind === activeKind ? "is-active" : ""}`}
        key={item.title}
        type="button"
        aria-pressed={item.kind === activeKind}
        onClick={() => onAddNode(item)}
        title={`${t.add} ${title}`}
      >
        <span className="library-icon" aria-hidden="true">
          <Icon size={14} />
        </span>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
      </button>
    );
  };

  const renderStaticItem = (item: StaticNavItem) => {
    const Icon = item.icon;
    return (
      <button
        className={`side-nav-item side-nav-${item.key}`}
        key={item.key}
        type="button"
        onClick={item.key === "skills" ? onOpenSkillLibrary : undefined}
      >
        <span className="side-nav-icon" aria-hidden="true">
          <Icon size={14} />
        </span>
        <strong>{item.title}</strong>
      </button>
    );
  };

  return (
    <aside className="left-panel">
      <section className="side-nav-section">
        <div className="panel-section-title">{t.creationNodes}</div>
        <div className="node-library">
          {nodeLibrary.map(renderLibraryItem)}
        </div>
      </section>

      <section className="side-nav-section">
        <div className="panel-section-title">{t.assetNodes}</div>
        <div className="side-nav-list">
          {assetNav.map(renderStaticItem)}
        </div>
      </section>

      <section className="side-nav-section">
        <div className="panel-section-title">{t.project}</div>
        <div className="side-nav-list project-nav-list">
          {projectNav.map(renderStaticItem)}
        </div>
      </section>
    </aside>
  );
}
