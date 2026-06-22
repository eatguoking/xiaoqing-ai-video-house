"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/components/canvas/canvas-workspace";

export type Asset = {
  id: string;
  projectId?: string;
  type: string;
  title: string;
  preview: string;
  url?: string;
  nodeId?: string;
  payload?: {
    rawText?: string;
    prompt?: string;
    dialogue?: string;
    url?: string;
    videoUrl?: string;
    audioUrl?: string;
    thumbnailUrl?: string;
    [key: string]: unknown;
  };
};

type Props = {
  locale: Locale;
  assets: Asset[];
  jobs: Array<{
    id: string;
    kind: string;
    status: string;
    model: string;
  }>;
  onOpenAsset: (asset: Asset) => void;
  onAssetsUploaded: (assets: Asset[]) => void;
  onAssetsDeleted: (assetIds: string[]) => void;
  projectId: string;
};

const labels = {
  zh: {
    jobs: "AI任务",
    noJobs: "暂无任务",
    outputAssets: "AI输出 / 资产",
    search: "搜索资产...",
    all: "全部",
    script: "剧本",
    character: "角色",
    scene: "场景",
    image: "图片",
    video: "视频",
    audio: "音频",
    upload: "上传",
    batchClean: "批量清理",
    selectAll: "全选当前",
    clearSelected: "清理选中",
    clearFiltered: "清理当前筛选",
    cancel: "取消",
    selected: "已选",
    clearing: "清理中...",
    cleanConfirm: "确定要清理这些资产吗？会从当前项目资产库中删除，并清理本地文件。",
    empty: "AI 生成结果会显示在这里",
    title: "点击预览，拖拽到画布"
  },
  en: {
    jobs: "AI Jobs",
    noJobs: "No jobs yet",
    outputAssets: "AI Output / Assets",
    search: "Search assets...",
    all: "All",
    script: "Script",
    character: "Character",
    scene: "Scene",
    image: "Image",
    video: "Video",
    audio: "Audio",
    upload: "Upload",
    batchClean: "Batch clean",
    selectAll: "Select visible",
    clearSelected: "Clean selected",
    clearFiltered: "Clean filtered",
    cancel: "Cancel",
    selected: "selected",
    clearing: "Cleaning...",
    cleanConfirm: "Clean these assets? They will be removed from this project library and local files will be deleted.",
    empty: "AI generated results will appear here",
    title: "Click to preview. Drag to canvas."
  }
} as const;

export function BottomPanel({ locale, assets, jobs, onOpenAsset, onAssetsUploaded, onAssetsDeleted, projectId }: Props) {
  const t = labels[locale];
  const [assetQuery, setAssetQuery] = useState("");
  const [assetType, setAssetType] = useState("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(() => new Set());
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState("");

  const filteredAssets = useMemo(() => {
    const query = assetQuery.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesType = assetType === "all" || asset.type === assetType;
      const matchesQuery =
        !query || `${asset.title} ${asset.preview} ${asset.type}`.toLowerCase().includes(query);
      return matchesType && matchesQuery;
    });
  }, [assetQuery, assetType, assets]);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, asset: Asset) => {
    if (selectionMode) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("application/x-ai-video-asset", JSON.stringify(asset));
    event.dataTransfer.effectAllowed = "copy";
  };

  const selectedCount = useMemo(
    () => assets.filter((asset) => selectedAssetIds.has(asset.id)).length,
    [assets, selectedAssetIds]
  );

  const toggleAssetSelected = (assetId: string) => {
    setSelectedAssetIds((current) => {
      const next = new Set(current);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedAssetIds((current) => {
      const next = new Set(current);
      filteredAssets.forEach((asset) => next.add(asset.id));
      return next;
    });
  };

  const cleanAssets = async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
    if (!uniqueIds.length || cleaning) return;
    if (!window.confirm(t.cleanConfirm)) return;

    setCleaning(true);
    setMessage("");
    try {
      const response = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ids: uniqueIds })
      });
      const result = (await response.json().catch(() => ({}))) as { ids?: string[]; error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Clean assets failed.");
      }
      const deletedIds = Array.isArray(result.ids) ? result.ids : uniqueIds;
      onAssetsDeleted(deletedIds);
      setSelectedAssetIds((current) => {
        const next = new Set(current);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setCleaning(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const formData = new FormData();
    formData.append("projectId", projectId);
    files.forEach((file) => formData.append("files", file));
    const response = await fetch("/api/assets/upload", {
      method: "POST",
      body: formData
    });
    const result = await response.json();
    if (Array.isArray(result.assets)) {
      onAssetsUploaded(result.assets);
    }
    event.target.value = "";
  };

  return (
    <section className="bottom-panel">
      <div className="bottom-column">
        <div className="panel-section-title">{t.jobs}</div>
        <div className="job-list">
          {jobs.length === 0 ? (
            <span className="empty-text">{t.noJobs}</span>
          ) : (
            jobs.map((job) => (
              <div className="job-row" key={job.id}>
                <span className={`dot dot-${job.status}`} />
                <strong>{job.kind}</strong>
                <small>{job.model}</small>
                <em>{job.status}</em>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="asset-strip">
        <div className="asset-strip-head">
          <div className="panel-section-title">{t.outputAssets}</div>
          <div className="asset-tools">
            <input
              value={assetQuery}
              placeholder={t.search}
              onChange={(event) => setAssetQuery(event.target.value)}
            />
            <select value={assetType} onChange={(event) => setAssetType(event.target.value)}>
              <option value="all">{t.all}</option>
              <option value="script">{t.script}</option>
              <option value="character">{t.character}</option>
              <option value="scene">{t.scene}</option>
              <option value="image">{t.image}</option>
              <option value="video">{t.video}</option>
              <option value="voice">{t.audio}</option>
            </select>
            {selectionMode ? (
              <>
                <span className="asset-clean-count">{selectedCount} {t.selected}</span>
                <button className="asset-action-button" type="button" onClick={selectAllFiltered} disabled={!filteredAssets.length || cleaning}>
                  {t.selectAll}
                </button>
                <button
                  className="asset-action-button danger"
                  type="button"
                  onClick={() => cleanAssets(Array.from(selectedAssetIds))}
                  disabled={!selectedCount || cleaning}
                >
                  {cleaning ? t.clearing : t.clearSelected}
                </button>
                <button
                  className="asset-action-button danger"
                  type="button"
                  onClick={() => cleanAssets(filteredAssets.map((asset) => asset.id))}
                  disabled={!filteredAssets.length || cleaning}
                >
                  {t.clearFiltered}
                </button>
                <button
                  className="asset-action-button"
                  type="button"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedAssetIds(new Set());
                    setMessage("");
                  }}
                  disabled={cleaning}
                >
                  {t.cancel}
                </button>
              </>
            ) : (
              <button
                className="asset-action-button"
                type="button"
                onClick={() => setSelectionMode(true)}
                disabled={!assets.length}
              >
                {t.batchClean}
              </button>
            )}
          </div>
          <label className="asset-upload-button">
            {t.upload}
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*,text/plain,.md,.json"
              onChange={handleUpload}
            />
          </label>
        </div>
        {message ? <div className="asset-clean-message">{message}</div> : null}
        <div className="asset-list">
          {filteredAssets.length === 0 ? (
            <span className="empty-text">{t.empty}</span>
          ) : (
            filteredAssets.map((asset) => (
              <div
                className={`asset-card asset-${asset.type}${selectionMode ? " is-selecting" : ""}${selectedAssetIds.has(asset.id) ? " is-selected" : ""}`}
                draggable={!selectionMode}
                key={asset.id}
                onClick={() => (selectionMode ? toggleAssetSelected(asset.id) : onOpenAsset(asset))}
                onDragStart={(event) => handleDragStart(event, asset)}
                role="button"
                tabIndex={0}
                title={t.title}
              >
                {selectionMode ? (
                  <input
                    className="asset-select-check"
                    type="checkbox"
                    checked={selectedAssetIds.has(asset.id)}
                    onChange={() => toggleAssetSelected(asset.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`${t.selected}: ${asset.title}`}
                  />
                ) : null}
                {asset.type === "image" && asset.url ? (
                  <img className="asset-thumb" src={asset.url} alt={asset.title} />
                ) : null}
                {asset.type === "video" ? (
                  asset.url ? (
                    <video className="asset-thumb asset-video-thumb" src={asset.url} muted playsInline />
                  ) : (
                    <div className="asset-video-placeholder">VIDEO</div>
                  )
                ) : null}
                {asset.type === "voice" ? (
                  <div className="asset-video-placeholder">AUDIO</div>
                ) : null}
                <strong>{asset.title}</strong>
                <p>{asset.preview}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
