"use client";

import { useEffect, useState } from "react";
import { KeyRound, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import type { Locale } from "@/components/canvas/canvas-workspace";

type Capability = "script" | "image" | "video";

type ModelCredential = {
  id: string;
  capability: Capability;
  label: string;
  provider: string;
  model: string;
  baseUrl: string;
  modelsPath: string;
  generatePath: string;
  statusPath: string;
  requestTemplateJson: string;
  responseContentPath: string;
  responseUrlPath: string;
  responseTaskIdPath: string;
  responseStatusPath: string;
  responseErrorPath: string;
  enabled: boolean;
  hasKey: boolean;
  maskedKey: string;
};

type EditorState = {
  id: string;
  capability: Capability;
  label: string;
  provider: string;
  model: string;
  baseUrl: string;
  modelsPath: string;
  generatePath: string;
  statusPath: string;
  requestTemplateJson: string;
  responseContentPath: string;
  responseUrlPath: string;
  responseTaskIdPath: string;
  responseStatusPath: string;
  responseErrorPath: string;
  apiKey: string;
  enabled: boolean;
};

type TestResult = {
  ok: boolean;
  status: number;
  statusText: string;
  elapsedMs: number;
  preview: string;
};

const capabilityGroups: Array<{
  key: Capability;
  title: string;
  description: string;
  icon: string;
  providerPlaceholder: string;
  modelPlaceholder: string;
  baseUrlPlaceholder: string;
  generatePathPlaceholder: string;
  statusPathPlaceholder: string;
  templatePlaceholder: string;
}> = [
  {
    key: "script",
    title: "Script API",
    description: "Scripts, storyboards, characters",
    icon: "T",
    providerPlaceholder: "openai / anthropic / google / deepseek",
    modelPlaceholder: "Optional fallback, e.g. gpt-4.1",
    baseUrlPlaceholder: "https://api.openai.com/v1",
    generatePathPlaceholder: "/chat/completions",
    statusPathPlaceholder: "Usually empty for script APIs",
    templatePlaceholder:
      '{\n  "model": "{{model}}",\n  "messages": [{"role": "user", "content": "{{prompt}}"}],\n  "temperature": 0.8\n}'
  },
  {
    key: "image",
    title: "Image API",
    description: "Characters, scenes, key frames",
    icon: "I",
    providerPlaceholder: "openai / replicate / fal / stability",
    modelPlaceholder: "Optional fallback, e.g. gpt-image-1",
    baseUrlPlaceholder: "https://api.openai.com/v1",
    generatePathPlaceholder: "/images/generations",
    statusPathPlaceholder: "Usually empty for image APIs",
    templatePlaceholder:
      '{\n  "model": "{{model}}",\n  "prompt": "{{prompt}}",\n  "size": "{{size}}",\n  "n": {{count}}\n}'
  },
  {
    key: "video",
    title: "Video API",
    description: "Text-to-video and image-to-video",
    icon: "V",
    providerPlaceholder: "runway / kling / pika / google",
    modelPlaceholder: "Optional fallback, e.g. gen-3",
    baseUrlPlaceholder: "https://api.dev.runwayml.com",
    generatePathPlaceholder: "/videos/generations",
    statusPathPlaceholder: "/videos/generations/{id}",
    templatePlaceholder:
      '{\n  "model": "{{model}}",\n  "prompt": "{{prompt}}",\n  "image_url": "{{imageUrl}}",\n  "duration": {{duration}},\n  "ratio": "{{ratio}}"\n}'
  }
];

const apiFormatTemplates: Array<{
  capability: Capability;
  name: string;
  generatePath: string;
  statusPath?: string;
  requestTemplateJson: string;
  responseContentPath?: string;
  responseUrlPath?: string;
  responseTaskIdPath?: string;
  responseStatusPath?: string;
  responseErrorPath?: string;
}> = [
  {
    capability: "script",
    name: "OpenAI-compatible chat",
    generatePath: "/chat/completions",
    requestTemplateJson:
      '{\n  "model": "{{model}}",\n  "messages": [\n    {"role": "system", "content": "{{roleHint}}"},\n    {"role": "user", "content": "{{prompt}}"}\n  ],\n  "temperature": 0.8\n}',
    responseContentPath: "choices[0].message.content",
    responseErrorPath: "error.message"
  },
  {
    capability: "image",
    name: "OpenAI-compatible image",
    generatePath: "/images/generations",
    requestTemplateJson:
      '{\n  "model": "{{model}}",\n  "prompt": "{{prompt}}",\n  "size": "{{size}}",\n  "n": {{count}}\n}',
    responseUrlPath: "data[0].url",
    responseErrorPath: "error.message"
  },
  {
    capability: "video",
    name: "Sync video URL",
    generatePath: "/videos/generations",
    requestTemplateJson:
      '{\n  "model": "{{model}}",\n  "prompt": "{{prompt}}",\n  "image_url": "{{imageUrl}}",\n  "duration": {{duration}},\n  "ratio": "{{ratio}}"\n}',
    responseUrlPath: "data[0].url",
    responseErrorPath: "error.message"
  },
  {
    capability: "video",
    name: "Async task polling",
    generatePath: "/videos/generations",
    statusPath: "/videos/generations/{id}",
    requestTemplateJson:
      '{\n  "model": "{{model}}",\n  "prompt": "{{prompt}}",\n  "image_url": "{{imageUrl}}",\n  "duration": {{duration}},\n  "ratio": "{{ratio}}"\n}',
    responseTaskIdPath: "id",
    responseStatusPath: "status",
    responseUrlPath: "output.url",
    responseErrorPath: "error.message"
  }
];

type Props = {
  open: boolean;
  locale: Locale;
  onClose: () => void;
  onChanged?: () => void;
};

const labels = {
  zh: {
    title: "API 配置中心",
    subtitle: "配置外部 API 服务。画布模型会从 /models 实时同步。",
    tab: "API 配置",
    categories: "分类",
    script: "剧本生成",
    scriptDesc: "剧本、分镜、角色设定",
    image: "图像生成",
    imageDesc: "角色图、场景图、关键帧",
    video: "视频生成",
    videoDesc: "文生视频和图生视频",
    search: "搜索 API、供应商或 Base URL...",
    empty: "还没有配置外部 API",
    add: "添加",
    edit: "编辑外部 API 服务",
    fill: "填写信息并保存新的 API 服务",
    enabled: "启用",
    templates: "格式模板",
    displayName: "显示名称",
    provider: "供应商",
    fallback: "备用模型",
    apiKey: "API Key",
    keepKey: "留空则保留已保存密钥",
    baseUrl: "Base URL",
    modelsPath: "Models path",
    generatePath: "Generate path",
    statusPath: "Status path",
    statusHelp: "异步视频 API 可用 {id} 作为外部任务 ID 占位符。",
    requestTemplate: "请求体模板",
    requestHelp: "可选 JSON 模板。变量：{{model}}, {{prompt}}, {{imageUrl}}, {{duration}}, {{ratio}}, {{size}}, {{count}}。",
    contentPath: "文本结果路径",
    urlPath: "URL 结果路径",
    taskPath: "任务 ID 路径",
    statusResponsePath: "状态结果路径",
    errorPath: "错误信息路径",
    save: "保存配置",
    delete: "删除",
    debugger: "API 调试器",
    debuggerDesc: "测试 Base URL、密钥、/models 和生成接口是否可用。",
    testBase: "测试 Base URL",
    syncModels: "同步模型",
    testGenerate: "测试生成",
    testing: "测试中...",
    debugEmpty: "先保存 API，然后在这里测试连通性。",
    done: "完成",
    footer: "保存后，画布节点会从这些 API 同步模型列表。"
  },
  en: {
    title: "API Config Center",
    subtitle: "Configure external API services. Canvas models sync live from /models.",
    tab: "API Config",
    categories: "Categories",
    script: "Script API",
    scriptDesc: "Scripts, storyboards, characters",
    image: "Image API",
    imageDesc: "Characters, scenes, key frames",
    video: "Video API",
    videoDesc: "Text-to-video and image-to-video",
    search: "Search API, provider, or Base URL...",
    empty: "No external APIs configured",
    add: "Add",
    edit: "Edit external API service",
    fill: "Fill details and save a new API service",
    enabled: "Enabled",
    templates: "Format templates",
    displayName: "Display name",
    provider: "Provider",
    fallback: "Fallback model",
    apiKey: "API Key",
    keepKey: "Leave blank to keep saved key",
    baseUrl: "Base URL",
    modelsPath: "Models path",
    generatePath: "Generate path",
    statusPath: "Status path",
    statusHelp: "For async video APIs, use {id} as the external task id placeholder.",
    requestTemplate: "Request body template",
    requestHelp: "Optional JSON template. Variables: {{model}}, {{prompt}}, {{imageUrl}}, {{duration}}, {{ratio}}, {{size}}, {{count}}.",
    contentPath: "Response content path",
    urlPath: "Response URL path",
    taskPath: "Task ID path",
    statusResponsePath: "Status response path",
    errorPath: "Error response path",
    save: "Save config",
    delete: "Delete",
    debugger: "API Debugger",
    debuggerDesc: "Test Base URL, key, /models, and generation connectivity.",
    testBase: "Test Base URL",
    syncModels: "Sync models",
    testGenerate: "Test generate",
    testing: "Testing...",
    debugEmpty: "Save an API first, then test connectivity here.",
    done: "Done",
    footer: "After saving, canvas nodes will sync model lists from these APIs."
  }
} as const;

function makeEmptyEditor(capability: Capability): EditorState {
  return {
    id: "",
    capability,
    label: "",
    provider: "",
    model: "",
    baseUrl: "",
    modelsPath: "/models",
    generatePath: capabilityGroups.find((group) => group.key === capability)?.generatePathPlaceholder ?? "",
    statusPath: "",
    requestTemplateJson: "",
    responseContentPath: "",
    responseUrlPath: "",
    responseTaskIdPath: "",
    responseStatusPath: "",
    responseErrorPath: "",
    apiKey: "",
    enabled: true
  };
}

function toEditor(item: ModelCredential): EditorState {
  return {
    id: item.id,
    capability: item.capability,
    label: item.label,
    provider: item.provider,
    model: item.model,
    baseUrl: item.baseUrl,
    modelsPath: item.modelsPath || "/models",
    generatePath: item.generatePath,
    statusPath: item.statusPath,
    requestTemplateJson: item.requestTemplateJson,
    responseContentPath: item.responseContentPath,
    responseUrlPath: item.responseUrlPath,
    responseTaskIdPath: item.responseTaskIdPath,
    responseStatusPath: item.responseStatusPath,
    responseErrorPath: item.responseErrorPath,
    apiKey: "",
    enabled: item.enabled
  };
}

export function SettingsModal({ open, locale, onClose, onChanged }: Props) {
  const t = labels[locale];
  const [activeCapability, setActiveCapability] = useState<Capability>("script");
  const [credentials, setCredentials] = useState<ModelCredential[]>([]);
  const [editor, setEditor] = useState<EditorState>(() => makeEmptyEditor("script"));
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [testPrompt, setTestPrompt] = useState("Reply OK. This is a connection test.");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const activeGroup = capabilityGroups.find((group) => group.key === activeCapability)!;
  const activeCredentials = credentials
    .filter((item) => item.capability === activeCapability)
    .filter((item) => {
      const text = `${item.label} ${item.provider} ${item.model} ${item.baseUrl}`.toLowerCase();
      return text.includes(query.toLowerCase());
    });

  useEffect(() => {
    if (!open) return;
    loadCredentials();
  }, [open]);

  async function loadCredentials() {
    const response = await fetch("/api/settings/model-credentials");
    const data = await response.json();
    if (Array.isArray(data)) {
      setCredentials(data);
      const first = data.find((item) => item.capability === activeCapability);
      setEditor(first ? toEditor(first) : makeEmptyEditor(activeCapability));
    }
  }

  if (!open) return null;

  const selectCapability = (capability: Capability) => {
    setActiveCapability(capability);
    const first = credentials.find((item) => item.capability === capability);
    setEditor(first ? toEditor(first) : makeEmptyEditor(capability));
    setQuery("");
    setTestResult(null);
    setMessage("");
  };

  const updateEditor = (patch: Partial<EditorState>) => {
    setEditor((current) => ({ ...current, ...patch }));
  };

  const closeAndRefresh = () => {
    onChanged?.();
    onClose();
  };

  const applyFormatTemplate = (template: (typeof apiFormatTemplates)[number]) => {
    updateEditor({
      generatePath: template.generatePath,
      statusPath: template.statusPath ?? editor.statusPath,
      requestTemplateJson: template.requestTemplateJson,
      responseContentPath: template.responseContentPath ?? "",
      responseUrlPath: template.responseUrlPath ?? "",
      responseTaskIdPath: template.responseTaskIdPath ?? "",
      responseStatusPath: template.responseStatusPath ?? "",
      responseErrorPath: template.responseErrorPath ?? ""
    });
    setMessage(`Applied format template: ${template.name}`);
  };

  const saveModelCredential = async () => {
    setMessage("Saving...");
    const response = await fetch("/api/settings/model-credentials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editor)
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setMessage(result.error ?? "Save failed. Check name, provider, API key, and Base URL.");
      return;
    }

    const saved = await response.json();
    setCredentials((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    setEditor(toEditor(saved));
    setMessage("API config saved. Model list will sync from this endpoint.");
    onChanged?.();
  };

  const deleteModelCredential = async () => {
    if (!editor.id) return;
    setMessage("Deleting...");
    const response = await fetch(`/api/settings/model-credentials?id=${encodeURIComponent(editor.id)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      setMessage("Delete failed");
      return;
    }

    setCredentials((current) => current.filter((item) => item.id !== editor.id));
    setEditor(makeEmptyEditor(activeCapability));
    setMessage("API config deleted");
    setTestResult(null);
    onChanged?.();
  };

  const testModel = async (mode: "base" | "models" | "chat") => {
    if (!editor.id) {
      setMessage("Save the API config before testing.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    const startedAt = Date.now();
    try {
      const response = await fetch("/api/settings/model-credentials/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editor.id, mode, prompt: testPrompt })
      });
      const result = await response.json().catch(() => ({
        ok: false,
        status: response.status,
        statusText: response.statusText || "INVALID_RESPONSE",
        elapsedMs: Date.now() - startedAt,
        preview: "The API test endpoint returned a non-JSON response."
      }));
      setTestResult(result);
      if (mode === "models" && result.ok) {
        onChanged?.();
      }
    } catch (error) {
      setTestResult({
        ok: false,
        status: 0,
        statusText: "REQUEST_FAILED",
        elapsedMs: Date.now() - startedAt,
        preview: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="settings-modal provider-config-modal" role="dialog" aria-modal="true" aria-label="API config">
        <header className="settings-head">
          <div>
            <strong>{t.title}</strong>
            <small>{t.subtitle}</small>
          </div>
          <button type="button" onClick={closeAndRefresh} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="settings-tabs">
          <button className="is-active" type="button">
            <KeyRound size={15} />
            {t.tab}
          </button>
        </div>

        <div className="provider-config-layout">
          <aside className="provider-category-panel">
            <div className="panel-section-title">{t.categories}</div>
            {capabilityGroups.map((group) => {
              const count = credentials.filter((item) => item.capability === group.key).length;
              const groupTitle = group.key === "script" ? t.script : group.key === "image" ? t.image : t.video;
              const groupDescription =
                group.key === "script" ? t.scriptDesc : group.key === "image" ? t.imageDesc : t.videoDesc;
              return (
                <button
                  className={activeCapability === group.key ? "is-active" : ""}
                  key={group.key}
                  type="button"
                  onClick={() => selectCapability(group.key)}
                >
                  <span>{group.icon}</span>
                  <div>
                    <strong>{groupTitle}</strong>
                    <small>{groupDescription}</small>
                  </div>
                  <em>{count}</em>
                </button>
              );
            })}
          </aside>

          <section className="provider-list-panel">
            <div className="provider-search">
              <Search size={16} />
              <input
                value={query}
                placeholder={t.search}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="configured-provider-list">
              {activeCredentials.length === 0 ? (
                <span className="empty-text">{t.empty}</span>
              ) : (
                activeCredentials.map((item) => (
                  <button
                    className={editor.id === item.id ? "is-active" : ""}
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setEditor(toEditor(item));
                      setTestResult(null);
                      setMessage("");
                    }}
                  >
                    <span className="provider-avatar">{item.label.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <small>
                        {item.provider} / {item.baseUrl}
                      </small>
                    </div>
                    <em>{item.enabled ? "ON" : "OFF"}</em>
                  </button>
                ))
              )}
            </div>
            <button
              className="add-provider-button"
              type="button"
              onClick={() => {
                setEditor(makeEmptyEditor(activeCapability));
                setTestResult(null);
                setMessage("");
              }}
            >
              <Plus size={17} />
              {t.add} {activeCapability === "script" ? t.script : activeCapability === "image" ? t.image : t.video}
            </button>
          </section>

          <section className="provider-detail-panel">
            <header>
              <div>
                <strong>{editor.label || `New ${activeGroup.title}`}</strong>
                <small>{editor.id ? t.edit : t.fill}</small>
              </div>
              <label className="toggle-field">
                <input
                  checked={editor.enabled}
                  type="checkbox"
                  onChange={(event) => updateEditor({ enabled: event.target.checked })}
                />
                {t.enabled}
              </label>
            </header>

            <div className="api-template-row">
              <span>{t.templates}</span>
              {apiFormatTemplates
                .filter((template) => template.capability === activeCapability)
                .map((template) => (
                  <button key={template.name} type="button" onClick={() => applyFormatTemplate(template)}>
                    {template.name}
                  </button>
                ))}
            </div>

            <div className="provider-detail-form">
              <label>
                {t.displayName}
                <input
                  value={editor.label}
                  placeholder={`New ${activeGroup.title}`}
                  onChange={(event) => updateEditor({ label: event.target.value })}
                />
              </label>
              <label>
                {t.provider}
                <input
                  value={editor.provider}
                  placeholder={activeGroup.providerPlaceholder}
                  onChange={(event) => updateEditor({ provider: event.target.value })}
                />
              </label>
              <label>
                {t.fallback}
                <input
                  value={editor.model}
                  placeholder={activeGroup.modelPlaceholder}
                  onChange={(event) => updateEditor({ model: event.target.value })}
                />
              </label>
              <label>
                {t.apiKey}
                <input
                  type="password"
                  value={editor.apiKey}
                  placeholder={editor.id ? t.keepKey : t.apiKey}
                  onChange={(event) => updateEditor({ apiKey: event.target.value })}
                />
              </label>
              <label className="wide-field">
                {t.baseUrl}
                <input
                  value={editor.baseUrl}
                  placeholder={activeGroup.baseUrlPlaceholder}
                  onChange={(event) => updateEditor({ baseUrl: event.target.value })}
                />
              </label>
              <label>
                {t.modelsPath}
                <input
                  value={editor.modelsPath}
                  placeholder="/models"
                  onChange={(event) => updateEditor({ modelsPath: event.target.value })}
                />
              </label>
              <label>
                {t.generatePath}
                <input
                  value={editor.generatePath}
                  placeholder={activeGroup.generatePathPlaceholder}
                  onChange={(event) => updateEditor({ generatePath: event.target.value })}
                />
              </label>
              <label className="wide-field">
                {t.statusPath}
                <input
                  value={editor.statusPath}
                  placeholder={activeGroup.statusPathPlaceholder}
                  onChange={(event) => updateEditor({ statusPath: event.target.value })}
                />
                <small>{t.statusHelp}</small>
              </label>
              <label className="wide-field">
                {t.requestTemplate}
                <textarea
                  value={editor.requestTemplateJson}
                  placeholder={activeGroup.templatePlaceholder}
                  rows={8}
                  onChange={(event) => updateEditor({ requestTemplateJson: event.target.value })}
                />
                <small>
                  {t.requestHelp}
                </small>
              </label>
              <label>
                {t.contentPath}
                <input
                  value={editor.responseContentPath}
                  placeholder="choices[0].message.content / data.text"
                  onChange={(event) => updateEditor({ responseContentPath: event.target.value })}
                />
              </label>
              <label>
                {t.urlPath}
                <input
                  value={editor.responseUrlPath}
                  placeholder="data[0].url / result.video_url"
                  onChange={(event) => updateEditor({ responseUrlPath: event.target.value })}
                />
              </label>
              <label>
                {t.taskPath}
                <input
                  value={editor.responseTaskIdPath}
                  placeholder="id / data.task_id / result.jobId"
                  onChange={(event) => updateEditor({ responseTaskIdPath: event.target.value })}
                />
              </label>
              <label>
                {t.statusResponsePath}
                <input
                  value={editor.responseStatusPath}
                  placeholder="status / data.state"
                  onChange={(event) => updateEditor({ responseStatusPath: event.target.value })}
                />
              </label>
              <label>
                {t.errorPath}
                <input
                  value={editor.responseErrorPath}
                  placeholder="error.message / message"
                  onChange={(event) => updateEditor({ responseErrorPath: event.target.value })}
                />
              </label>
            </div>

            <div className="detail-actions">
              <button type="button" onClick={saveModelCredential}>
                {t.save}
              </button>
              <button type="button" onClick={deleteModelCredential} disabled={!editor.id}>
                <Trash2 size={15} />
                {t.delete}
              </button>
            </div>

            <div className="api-debugger">
              <header>
                <div>
                  <strong>{t.debugger}</strong>
                  <small>{t.debuggerDesc}</small>
                </div>
              </header>
              <textarea value={testPrompt} onChange={(event) => setTestPrompt(event.target.value)} rows={3} />
              <div className="debug-actions">
                <button type="button" onClick={() => testModel("base")} disabled={testing || !editor.id}>
                  <RefreshCw size={15} />
                  {t.testBase}
                </button>
                <button type="button" onClick={() => testModel("models")} disabled={testing || !editor.id}>
                  {t.syncModels}
                </button>
                <button type="button" onClick={() => testModel("chat")} disabled={testing || !editor.id}>
                  {t.testGenerate}
                </button>
              </div>
              <pre className={testResult?.ok ? "debug-result is-ok" : "debug-result"}>
                {testing
                  ? t.testing
                  : testResult
                    ? `HTTP ${testResult.status} ${testResult.statusText}\nTime ${testResult.elapsedMs}ms\n\n${testResult.preview}`
                    : t.debugEmpty}
              </pre>
            </div>
          </section>
        </div>

        <footer className="settings-foot">
          <span>{message || t.footer}</span>
          <button type="button" onClick={closeAndRefresh}>
            {t.done}
          </button>
        </footer>
      </section>
    </div>
  );
}
