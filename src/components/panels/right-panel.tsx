"use client";

import { useEffect, useMemo, useState } from "react";
import type { Node } from "@xyflow/react";
import { ArrowRight, Copy, Images, ListPlus, Paintbrush, RefreshCw, Search, Trash2, Wand2 } from "lucide-react";
import type { GenerationNodeData } from "@/components/nodes/generation-node";
import type { ExternalModelOption, Locale } from "@/components/canvas/canvas-workspace";

type ModelsResponse = {
  script?: ExternalModelOption[];
  image?: ExternalModelOption[];
  video?: ExternalModelOption[];
};

type Props = {
  locale: Locale;
  selectedNode?: Node<GenerationNodeData>;
  models: ModelsResponse;
  loadingModels: boolean;
  prompt: string;
  upstreamText: string;
  imageChildCount: number;
  batchRunning: boolean;
  selectedModelId: string;
  onPromptChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onRefreshModels: () => void;
  onNodeDataChange: (patch: Partial<GenerationNodeData>) => void;
  onDuplicateNode: () => void;
  onDeleteNode: () => void;
  onGenerate: () => void;
  onUseUpstreamInput: () => void;
  onCreateNextNode: () => void;
  onCreateImageNodesFromStoryboard: () => void;
  onGenerateImageChildren: () => void;
  onOpenNodePreview: () => void;
  onOpenImageEditor: () => void;
  onOpenModelConfig: () => void;
};

const labels = {
  zh: {
    inspector: "检查器",
    currentNode: "当前节点",
    outputPreview: "输出预览",
    editImage: "修图",
    noNode: "未选择节点",
    hint: "右侧输入需求并点击生成；底部资产区显示 AI 输出结果。",
    copy: "复制",
    delete: "删除",
    nodeTitle: "节点标题",
    nodeNotes: "节点备注 / 最新输出摘要",
    nodeContent: "节点内容 / 可编辑文本",
    sourceImage: "源图片",
    workflow: "工作流",
    upstreamReady: "上游输出已准备",
    useInput: "用作输入",
    noUpstream: "没有连接的上游输出",
    createNext: "创建下一个节点",
    splitImages: "拆成图片",
    generatingImages: "正在生成图片...",
    runImageChildren: "生成图片子节点",
    model: "AI模型 / 选择模型",
    sync: "同步",
    searchModels: "搜索模型...",
    tags: "标签",
    syncing: "正在从已配置 API 同步模型...",
    noModels: "当前节点类型没有可用模型。",
    configureApi: "配置API",
    noMatching: "没有匹配的模型",
    noSelected: "未选择模型",
    aiInput: "AI 输入 / 在这里输入需求",
    aiInputHelp: "例如：要生成的剧情、画面、风格、镜头运动或视频要求。",
    ratio: "画幅",
    variants: "变体",
    duration: "时长",
    camera: "镜头",
    runAi: "生成当前节点 / Run AI",
    outputNote: "输出位置：生成后结果会出现在底部 AI Output / Assets 区域。"
  },
  en: {
    inspector: "Inspector",
    currentNode: "Current Node",
    outputPreview: "Output Preview",
    editImage: "Edit image",
    noNode: "No node selected",
    hint: "Enter requirements on the right and generate; AI outputs appear in the bottom Assets area.",
    copy: "Copy",
    delete: "Delete",
    nodeTitle: "Node title",
    nodeNotes: "Node notes / latest output summary",
    nodeContent: "Node content / editable text",
    sourceImage: "Source image",
    workflow: "Workflow",
    upstreamReady: "Upstream output ready",
    useInput: "Use as input",
    noUpstream: "No upstream output connected",
    createNext: "Create next node",
    splitImages: "Split to images",
    generatingImages: "Generating images...",
    runImageChildren: "Run image children",
    model: "AI Model / Select model",
    sync: "Sync",
    searchModels: "Search models...",
    tags: "Tags",
    syncing: "Syncing models from configured APIs...",
    noModels: "No models available for this node type.",
    configureApi: "Configure API",
    noMatching: "No matching models",
    noSelected: "No model selected",
    aiInput: "AI Input / enter requirements here",
    aiInputHelp: "For example: plot, image, style, camera movement, or video requirements.",
    ratio: "Ratio",
    variants: "Variants",
    duration: "Duration",
    camera: "Camera",
    runAi: "Run current node / Run AI",
    outputNote: "Output location: generated results appear in the bottom AI Output / Assets area."
  }
} as const;

const tagClass: Record<string, string> = {
  text: "tag-text",
  visual: "tag-vision",
  video: "tag-video",
  reasoning: "tag-reason",
  web: "tag-web",
  tools: "tag-tool",
  free: "tag-free"
};

function getOptions(kind: GenerationNodeData["kind"] | undefined, models: ModelsResponse) {
  if (kind === "image") return models.image ?? [];
  if (kind === "video") return models.video ?? [];
  if (kind === "script" || kind === "storyboard" || kind === "character") return models.script ?? [];
  return [];
}

function groupBySource(options: ExternalModelOption[]) {
  return options.reduce<Record<string, ExternalModelOption[]>>((acc, model) => {
    const key = model.sourceName || model.provider || "External API";
    acc[key] = acc[key] ? [...acc[key], model] : [model];
    return acc;
  }, {});
}

function modelInitial(model: ExternalModelOption) {
  const text = model.model.toLowerCase();
  if (text.includes("image")) return "I";
  if (text.includes("video")) return "V";
  if (text.includes("gpt")) return "5";
  if (text.includes("qwen")) return "Q";
  if (text.includes("deepseek")) return "D";
  return model.model.slice(0, 1).toUpperCase();
}

export function RightPanel({
  locale,
  selectedNode,
  models,
  loadingModels,
  prompt,
  upstreamText,
  imageChildCount,
  batchRunning,
  selectedModelId,
  onPromptChange,
  onModelChange,
  onRefreshModels,
  onNodeDataChange,
  onDuplicateNode,
  onDeleteNode,
  onGenerate,
  onUseUpstreamInput,
  onCreateNextNode,
  onCreateImageNodesFromStoryboard,
  onGenerateImageChildren,
  onOpenNodePreview,
  onOpenImageEditor,
  onOpenModelConfig
}: Props) {
  const t = labels[locale];
  const [modelQuery, setModelQuery] = useState("");
  const data = selectedNode?.data;
  const selectedNodeId = selectedNode?.id;
  const options = getOptions(data?.kind, models);
  const selectedModel = options.find((model) => model.id === selectedModelId);
  const requiresModel =
    data?.kind === "script" ||
    data?.kind === "storyboard" ||
    data?.kind === "character" ||
    data?.kind === "image" ||
    data?.kind === "video";
  const canGenerate = Boolean(selectedNode && selectedModelId && options.length > 0 && requiresModel);
  const canCreateNext =
    data?.kind === "script" || data?.kind === "storyboard" || data?.kind === "image";
  const canSplitStoryboard = data?.kind === "storyboard" && Boolean(data.assetContent || data.assetPreview || prompt);
  const canGenerateImageChildren = data?.kind === "storyboard" && imageChildCount > 0 && !batchRunning;
  const canEditImage = data?.kind === "image" && Boolean(data.assetUrl);
  const nodeRatio = data?.ratio ?? "9:16";
  const nodeVariants = data?.variants ?? 1;
  const nodeDuration = data?.duration ?? 5;
  const nodeCamera = data?.camera ?? "slow push-in";

  const filteredOptions = useMemo(() => {
    const query = modelQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter((model) => {
      const text = `${model.model} ${model.provider} ${model.sourceName} ${model.tags.join(" ")}`.toLowerCase();
      return text.includes(query);
    });
  }, [modelQuery, options]);

  const grouped = groupBySource(filteredOptions);

  useEffect(() => {
    setModelQuery("");
  }, [selectedNodeId, data?.kind]);

  return (
    <aside className="right-panel">
      <section className="inspector-section current-node-section">
        <div className="inspector-head">
          <span>{t.currentNode}</span>
          <strong>{data?.title ?? t.noNode}</strong>
          <small>{t.hint}</small>
        </div>

        <div className="inspector-actions">
          <button type="button" onClick={onDuplicateNode} disabled={!selectedNode}>
            <Copy size={15} />
            {t.copy}
          </button>
          <button type="button" onClick={onDeleteNode} disabled={!selectedNode}>
            <Trash2 size={15} />
            {t.delete}
          </button>
        </div>

        <label className="field">
          <span>{t.nodeTitle}</span>
          <input
            value={data?.title ?? ""}
            onChange={(event) => onNodeDataChange({ title: event.target.value })}
            disabled={!selectedNode}
          />
        </label>

        <label className="field">
          <span>{t.nodeNotes}</span>
          <textarea
            value={data?.summary ?? ""}
            onChange={(event) => onNodeDataChange({ summary: event.target.value })}
            disabled={!selectedNode}
            rows={3}
          />
        </label>
      </section>

      {(data?.assetUrl || data?.sourceAssetUrl || data?.assetContent !== undefined) ? (
        <section className="inspector-section output-preview-section">
          <div className="panel-section-title">{t.outputPreview}</div>
          {data?.assetUrl ? (
            <>
              <button className="node-side-preview" type="button" onClick={onOpenNodePreview}>
                {data.kind === "video" ? (
                  <video src={data.assetUrl} muted playsInline />
                ) : (
                  <img src={data.assetUrl} alt={data.title} />
                )}
              </button>
              {canEditImage ? (
                <button className="image-edit-button" type="button" onClick={onOpenImageEditor}>
                  <Paintbrush size={15} />
                  {t.editImage}
                </button>
              ) : null}
            </>
          ) : null}

          {!data?.assetUrl && data?.kind === "video" && data.sourceAssetUrl ? (
            <div className="node-source-preview">
              <span>{t.sourceImage}</span>
              <img src={data.sourceAssetUrl} alt={`${data.title} source`} />
            </div>
          ) : null}

          {data?.assetContent !== undefined && !data.assetUrl ? (
            <label className="field">
              <span>{t.nodeContent}</span>
              <textarea
                value={data.assetContent ?? ""}
                onChange={(event) => onNodeDataChange({ assetContent: event.target.value })}
                disabled={!selectedNode}
                rows={6}
              />
            </label>
          ) : null}
        </section>
      ) : null}

      <section className="inspector-section workflow-panel">
        <div className="panel-section-title">{t.workflow}</div>
        {upstreamText ? (
          <div className="workflow-upstream">
            <span>{t.upstreamReady}</span>
            <button type="button" onClick={onUseUpstreamInput}>
              {t.useInput}
            </button>
          </div>
        ) : (
          <span className="workflow-empty">{t.noUpstream}</span>
        )}
        <div className="workflow-actions">
          <button type="button" onClick={onCreateNextNode} disabled={!selectedNode || !canCreateNext}>
            <ArrowRight size={15} />
            {t.createNext}
          </button>
          <button type="button" onClick={onCreateImageNodesFromStoryboard} disabled={!canSplitStoryboard}>
            <ListPlus size={15} />
            {t.splitImages}
          </button>
        </div>
        <button
          className="workflow-wide-action"
          type="button"
          onClick={onGenerateImageChildren}
          disabled={!canGenerateImageChildren}
        >
          <Images size={15} />
          {batchRunning ? t.generatingImages : `${t.runImageChildren} (${imageChildCount})`}
        </button>
      </section>

      <section className="inspector-section model-picker">
        <div className="model-picker-head">
          <span>{t.model}</span>
          <button type="button" onClick={onRefreshModels} disabled={loadingModels}>
            <RefreshCw size={14} className={loadingModels ? "spin" : ""} />
            {t.sync}
          </button>
        </div>

        <div className="model-search">
          <Search size={16} />
          <input
            value={modelQuery}
            placeholder={t.searchModels}
            onChange={(event) => setModelQuery(event.target.value)}
          />
        </div>

        <div className="model-filter-tags">
          <span>{t.tags}</span>
          {["visual", "reasoning", "tools", "web", "free"].map((tag) => (
            <button key={tag} type="button" onClick={() => setModelQuery(tag)}>
              {tag}
            </button>
          ))}
        </div>

        <div className="live-model-list">
          {loadingModels ? (
            <span className="empty-text">{t.syncing}</span>
          ) : options.length === 0 ? (
            <div className="model-empty-state">
              <span>{t.noModels}</span>
              <button type="button" onClick={onOpenModelConfig}>
                {t.configureApi}
              </button>
            </div>
          ) : filteredOptions.length === 0 ? (
            <span className="empty-text">{t.noMatching}</span>
          ) : (
            Object.entries(grouped).map(([sourceName, sourceModels]) => (
              <div className="model-source-group" key={sourceName}>
                <div className="model-source-title">{sourceName}</div>
                {sourceModels.map((model) => (
                  <button
                    className={selectedModelId === model.id ? "model-option is-active" : "model-option"}
                    key={model.id}
                    type="button"
                    onClick={() => onModelChange(model.id)}
                  >
                    <span className="model-avatar">{modelInitial(model)}</span>
                    <strong>{model.model}</strong>
                    <span className="model-tags">
                      {model.tags.map((tag) => (
                        <em className={tagClass[tag] ?? ""} key={tag}>
                          {tag}
                        </em>
                      ))}
                      {model.status === "fallback" ? <em>fallback</em> : null}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="selected-model-line">
          {selectedModel ? `${selectedModel.sourceName} / ${selectedModel.model}` : t.noSelected}
        </div>
      </section>

      <section className="inspector-section ai-input-section">
        <label className="field">
          <span>{t.aiInput}</span>
          <textarea value={prompt} onChange={(event) => onPromptChange(event.target.value)} rows={6} />
          <small className="field-help">
            {t.aiInputHelp}
          </small>
        </label>

        <div className="parameter-grid">
          <label>
            {t.ratio}
            <select
              value={nodeRatio}
              onChange={(event) => onNodeDataChange({ ratio: event.target.value })}
              disabled={!selectedNode}
            >
              <option>9:16</option>
              <option>16:9</option>
              <option>1:1</option>
            </select>
          </label>
          <label>
            {t.variants}
            <input
              value={nodeVariants}
              type="number"
              min="1"
              max="8"
              disabled={!selectedNode}
              onChange={(event) => onNodeDataChange({ variants: Number(event.target.value) || 1 })}
            />
          </label>
          <label>
            {t.duration}
            <input
              value={nodeDuration}
              type="number"
              min="1"
              max="15"
              disabled={!selectedNode}
              onChange={(event) => onNodeDataChange({ duration: Number(event.target.value) || 5 })}
            />
          </label>
          <label>
            {t.camera}
            <select
              value={nodeCamera}
              onChange={(event) => onNodeDataChange({ camera: event.target.value })}
              disabled={!selectedNode}
            >
              <option>slow push-in</option>
              <option>static</option>
              <option>handheld</option>
            </select>
          </label>
        </div>

        <button className="generate-button" type="button" onClick={onGenerate} disabled={!canGenerate}>
          <Wand2 size={17} />
          {t.runAi}
        </button>

        <div className="model-note">
          {t.outputNote}
        </div>
      </section>
    </aside>
  );
}
