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
    empty: "AI generated results will appear here",
    title: "Click to preview. Drag to canvas."
  }
} as const;

export function BottomPanel({ locale, assets, jobs, onOpenAsset, onAssetsUploaded, projectId }: Props) {
  const t = labels[locale];
  const [assetQuery, setAssetQuery] = useState("");
  const [assetType, setAssetType] = useState("all");

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
    event.dataTransfer.setData("application/x-ai-video-asset", JSON.stringify(asset));
    event.dataTransfer.effectAllowed = "copy";
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
        <div className="asset-list">
          {filteredAssets.length === 0 ? (
            <span className="empty-text">{t.empty}</span>
          ) : (
            filteredAssets.map((asset) => (
              <div
                className={`asset-card asset-${asset.type}`}
                draggable
                key={asset.id}
                onClick={() => onOpenAsset(asset)}
                onDragStart={(event) => handleDragStart(event, asset)}
                role="button"
                tabIndex={0}
                title={t.title}
              >
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
