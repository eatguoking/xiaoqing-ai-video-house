"use client";

import { useCallback, useRef, useState } from "react";
import {
  DefaultToolbar,
  DrawToolbarItem,
  Editor,
  EllipseToolbarItem,
  EraserToolbarItem,
  HandToolbarItem,
  LineToolbarItem,
  RectangleToolbarItem,
  SelectToolbarItem,
  Tldraw,
  TextToolbarItem,
  ArrowToolbarItem,
  createShapeId,
  type TLAssetId,
  type TLImageAsset,
  type TLShapeId
} from "tldraw";
import "tldraw/tldraw.css";
import { ArrowLeft, Maximize2, Save } from "lucide-react";

type EditorAsset = {
  id: string;
  projectId?: string;
  type: string;
  title: string;
  preview: string;
  url?: string;
  payload?: Record<string, unknown>;
};

type ImageEditorParams = {
  projectId: string;
  nodeId: string;
  assetId: string;
  title: string;
  imageUrl: string;
};

const editedImageEventType = "xiaoqing:image-edited";
const editedImageStorageKey = "xiaoqing.imageEdited";

function readParam(params: URLSearchParams, key: string) {
  return params.get(key)?.trim() ?? "";
}

function readEditorParams(): ImageEditorParams {
  if (typeof window === "undefined") {
    return {
      projectId: "default-project",
      nodeId: "",
      assetId: "",
      title: "Edited image",
      imageUrl: ""
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    projectId: readParam(params, "projectId") || "default-project",
    nodeId: readParam(params, "nodeId"),
    assetId: readParam(params, "assetId"),
    title: readParam(params, "title") || "Edited image",
    imageUrl: readParam(params, "imageUrl")
  };
}

function resolveImageSource(imageUrl: string) {
  const source = imageUrl.trim();
  if (!source) return "";
  if (source.startsWith("data:") || source.startsWith("blob:") || source.startsWith("/")) {
    return source;
  }

  try {
    const url = new URL(source);
    if (typeof window !== "undefined" && url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    if (url.protocol === "http:" || url.protocol === "https:") {
      return `/api/assets/proxy-image?url=${encodeURIComponent(source)}`;
    }
  } catch {
    return source;
  }

  return source;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function loadImageSize(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve({ width: image.naturalWidth || 960, height: image.naturalHeight || 540 });
    image.onerror = () => reject(new Error("图片加载失败，请确认图片仍可访问。"));
    image.src = src;
  });
}

function EditorToolbar(props: Parameters<typeof DefaultToolbar>[0]) {
  return (
    <DefaultToolbar {...props} maxItems={9}>
      <SelectToolbarItem />
      <HandToolbarItem />
      <DrawToolbarItem />
      <ArrowToolbarItem />
      <LineToolbarItem />
      <TextToolbarItem />
      <RectangleToolbarItem />
      <EllipseToolbarItem />
      <EraserToolbarItem />
    </DefaultToolbar>
  );
}

const components = {
  Toolbar: EditorToolbar
};

export function ImageEditorWorkspace() {
  const [params] = useState(readEditorParams);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const editorRef = useRef<Editor | null>(null);
  const sourceShapeIdRef = useRef<TLShapeId | null>(null);

  const insertSourceImage = useCallback(
    async (editor: Editor) => {
      if (!params.imageUrl) {
        setMessage("未提供图片。");
        return;
      }

      const sourceUrl = resolveImageSource(params.imageUrl);
      try {
        setMessage("正在载入图片...");
        const size = await loadImageSize(sourceUrl);
        const maxWidth = 880;
        const scale = Math.min(maxWidth / size.width, 1);
        const width = Math.max(120, Math.round(size.width * scale));
        const height = Math.max(90, Math.round(size.height * scale));
        const assetId = `asset:${params.assetId || "source-image"}` as TLAssetId;
        const shapeId = createShapeId("source-image");
        const asset: TLImageAsset = {
          id: assetId,
          typeName: "asset",
          type: "image",
          meta: {},
          props: {
            src: sourceUrl,
            w: width,
            h: height,
            name: params.title,
            mimeType: "image/png",
            isAnimated: false
          }
        };

        editor.createAssets([asset]);
        editor.createShapes([
          {
            id: shapeId,
            type: "image",
            x: 0,
            y: 0,
            props: {
              w: width,
              h: height,
              url: sourceUrl,
              assetId,
              playing: true,
              crop: null,
              flipX: false,
              flipY: false,
              altText: params.title
            }
          }
        ]);
        sourceShapeIdRef.current = shapeId;
        editor.select(shapeId);
        editor.zoomToSelection({ animation: { duration: 220 } });
        setMessage("图片已放入画板。可移动缩放图片，也可添加文字、箭头、线条和手绘标注。");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      }
    },
    [params.assetId, params.imageUrl, params.title]
  );

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      insertSourceImage(editor);
    },
    [insertSourceImage]
  );

  const handleFit = useCallback(() => {
    editorRef.current?.zoomToFit({ animation: { duration: 220 } });
  }, []);

  const handleSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (!shapeIds.length) {
      setMessage("画板里还没有可保存的内容。");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const exported = await editor.toImage(shapeIds, {
        format: "png",
        background: true,
        padding: 32,
        scale: 2
      });
      const dataUrl = await blobToDataUrl(exported.blob);
      const response = await fetch("/api/assets/rendered-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: params.projectId,
          sourceAssetId: params.assetId,
          title: `${params.title} 修图`,
          dataUrl
        })
      });
      const result = (await response.json()) as { asset?: EditorAsset; error?: string };
      if (!response.ok || !result.asset) {
        throw new Error(result.error || "保存失败");
      }

      const payload = {
        type: editedImageEventType,
        nodeId: params.nodeId,
        asset: result.asset,
        savedAt: Date.now()
      };
      window.opener?.postMessage(payload, window.location.origin);
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel(editedImageEventType);
        channel.postMessage(payload);
        channel.close();
      }
      window.localStorage.setItem(editedImageStorageKey, JSON.stringify(payload));
      setMessage("已保存为新图片资产，并回填到图片节点。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }, [params.assetId, params.nodeId, params.projectId, params.title]);

  return (
    <main className="image-editor-shell image-editor-tldraw-shell">
      <header className="image-editor-topbar">
        <div>
          <strong>{params.title}</strong>
          <small>{message || "对象化修图画板：图片、文字、箭头和线条都可以单独选择、移动、缩放。"}</small>
        </div>
        <div className="image-editor-actions">
          <button type="button" onClick={() => window.close()}>
            <ArrowLeft size={16} />
            返回
          </button>
          <button type="button" onClick={handleFit}>
            <Maximize2 size={16} />
            适应视图
          </button>
          <button className="primary-action" type="button" onClick={handleSave} disabled={saving || !params.imageUrl}>
            <Save size={16} />
            {saving ? "保存中..." : "保存到节点"}
          </button>
        </div>
      </header>
      <section className="image-editor-tldraw-stage">
        <Tldraw components={components} onMount={handleMount} />
      </section>
    </main>
  );
}
