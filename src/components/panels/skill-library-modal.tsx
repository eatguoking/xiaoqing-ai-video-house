"use client";

import { useMemo, useState } from "react";
import { Copy, Plus, Save, Trash2, X } from "lucide-react";
import type { GenerationNodeData } from "@/components/nodes/generation-node";
import type { Locale } from "@/components/canvas/canvas-workspace";

export type SkillRecord = {
  id: string;
  name: string;
  appliesTo: Array<GenerationNodeData["kind"] | "all">;
  enabled: boolean;
  systemPrompt: string;
  promptTemplate: string;
  outputFormat: string;
  tags: string[];
};

type Props = {
  open: boolean;
  locale: Locale;
  skills: SkillRecord[];
  onClose: () => void;
  onChange: (skills: SkillRecord[]) => void;
};

const labels = {
  zh: {
    title: "Skill 库",
    subtitle: "管理可复用的生成策略、风格模板和输出格式。",
    newSkill: "新建",
    copy: "复制",
    delete: "删除",
    save: "保存",
    enabled: "启用",
    name: "名称",
    appliesTo: "适用节点",
    tags: "标签",
    systemPrompt: "系统提示词",
    promptTemplate: "用户提示词包装模板",
    outputFormat: "输出格式要求",
    empty: "还没有 Skill。",
    all: "全部"
  },
  en: {
    title: "Skill Library",
    subtitle: "Manage reusable generation strategies, style templates, and output rules.",
    newSkill: "New",
    copy: "Copy",
    delete: "Delete",
    save: "Save",
    enabled: "Enabled",
    name: "Name",
    appliesTo: "Applies to",
    tags: "Tags",
    systemPrompt: "System prompt",
    promptTemplate: "User prompt wrapper",
    outputFormat: "Output format",
    empty: "No skills yet.",
    all: "All"
  }
} as const;

const kinds: Array<GenerationNodeData["kind"] | "all"> = ["all", "script", "storyboard", "character", "image", "video"];

export const defaultSkills: SkillRecord[] = [
  {
    id: "skill_short_drama",
    name: "短剧剧本增强",
    appliesTo: ["script"],
    enabled: true,
    systemPrompt: "强化短剧冲突、钩子、反转和爽点，避免空泛叙述。",
    promptTemplate: "请基于用户输入创作短剧内容，要求开场3秒有冲突，中段升级，结尾有反转。\n\n用户输入：\n{{input}}",
    outputFormat: "输出标题、梗概、人物、分场剧情、对白、反转结尾。",
    tags: ["短剧", "反转", "爽点"]
  },
  {
    id: "skill_storyboard_table",
    name: "分镜拆解",
    appliesTo: ["storyboard"],
    enabled: true,
    systemPrompt: "把剧本文本拆成可直接生成图片和视频的镜头表。",
    promptTemplate: "请把以下内容拆成分镜表，每行包含 Shot、Visual、Dialogue、Camera、Image Prompt、Duration。\n\n{{input}}",
    outputFormat: "只输出 Markdown 表格，保证每个镜头都有 Image Prompt。",
    tags: ["分镜", "镜头", "表格"]
  },
  {
    id: "skill_image_prompt",
    name: "图片提示词优化",
    appliesTo: ["image"],
    enabled: true,
    systemPrompt: "把剧情描述改写为清晰的 AI 图像生成提示词。",
    promptTemplate: "请优化为图片生成提示词，包含主体、场景、镜头、光线、服装、风格，不要解释。\n\n{{input}}",
    outputFormat: "输出一段完整图片提示词。",
    tags: ["图片", "视觉", "电影感"]
  },
  {
    id: "skill_video_motion",
    name: "视频镜头运动优化",
    appliesTo: ["video"],
    enabled: true,
    systemPrompt: "把画面描述改写为适合视频生成的运动提示。",
    promptTemplate: "请优化为视频生成提示词，强调主体动作、镜头运动、节奏、时长和画面连续性。\n\n{{input}}",
    outputFormat: "输出一段视频 prompt，不要解释。",
    tags: ["视频", "运镜", "动作"]
  },
  {
    id: "skill_character_consistency",
    name: "角色一致性",
    appliesTo: ["character", "image"],
    enabled: true,
    systemPrompt: "提炼角色外貌、服装、气质和可复用视觉设定。",
    promptTemplate: "请提炼角色一致性设定，确保后续图片和视频能保持同一人物。\n\n{{input}}",
    outputFormat: "输出外貌、年龄、发型、服装、气质、识别特征、负面约束。",
    tags: ["角色", "一致性"]
  }
];

function newSkill(): SkillRecord {
  return {
    id: `skill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: "New Skill",
    appliesTo: ["all"],
    enabled: true,
    systemPrompt: "",
    promptTemplate: "{{input}}",
    outputFormat: "",
    tags: []
  };
}

export function SkillLibraryModal({ open, locale, skills, onClose, onChange }: Props) {
  const t = labels[locale];
  const [activeId, setActiveId] = useState(skills[0]?.id ?? "");
  const active = useMemo(() => skills.find((skill) => skill.id === activeId) ?? skills[0], [activeId, skills]);

  if (!open) return null;

  const updateActive = (patch: Partial<SkillRecord>) => {
    if (!active) return;
    onChange(skills.map((skill) => (skill.id === active.id ? { ...skill, ...patch } : skill)));
  };

  const addSkill = () => {
    const skill = newSkill();
    onChange([skill, ...skills]);
    setActiveId(skill.id);
  };

  const duplicateSkill = () => {
    if (!active) return;
    const clone = { ...active, id: newSkill().id, name: `${active.name} Copy` };
    onChange([clone, ...skills]);
    setActiveId(clone.id);
  };

  const deleteSkill = () => {
    if (!active) return;
    const next = skills.filter((skill) => skill.id !== active.id);
    onChange(next);
    setActiveId(next[0]?.id ?? "");
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="skill-modal" role="dialog" aria-modal="true" aria-label={t.title}>
        <header>
          <div>
            <strong>{t.title}</strong>
            <small>{t.subtitle}</small>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="skill-modal-body">
          <aside className="skill-list">
            <button className="primary-action" type="button" onClick={addSkill}>
              <Plus size={16} />
              {t.newSkill}
            </button>
            {skills.length === 0 ? <span className="empty-text">{t.empty}</span> : null}
            {skills.map((skill) => (
              <button
                className={skill.id === active?.id ? "skill-card is-active" : "skill-card"}
                key={skill.id}
                type="button"
                onClick={() => setActiveId(skill.id)}
              >
                <strong>{skill.name}</strong>
                <span>{skill.appliesTo.join(" / ")}</span>
                <small>{skill.tags.join(" ")}</small>
              </button>
            ))}
          </aside>
          {active ? (
            <section className="skill-editor">
              <div className="skill-editor-actions">
                <button type="button" onClick={duplicateSkill}><Copy size={15} />{t.copy}</button>
                <button type="button" onClick={deleteSkill}><Trash2 size={15} />{t.delete}</button>
                <button className="primary-action" type="button" onClick={onClose}><Save size={15} />{t.save}</button>
              </div>
              <label className="toggle-field">
                <input type="checkbox" checked={active.enabled} onChange={(event) => updateActive({ enabled: event.target.checked })} />
                {t.enabled}
              </label>
              <label className="field">
                <span>{t.name}</span>
                <input value={active.name} onChange={(event) => updateActive({ name: event.target.value })} />
              </label>
              <label className="field">
                <span>{t.appliesTo}</span>
                <select
                  value={active.appliesTo[0] ?? "all"}
                  onChange={(event) => updateActive({ appliesTo: [event.target.value as SkillRecord["appliesTo"][number]] })}
                >
                  {kinds.map((kind) => <option key={kind} value={kind}>{kind === "all" ? t.all : kind}</option>)}
                </select>
              </label>
              <label className="field">
                <span>{t.tags}</span>
                <input value={active.tags.join(", ")} onChange={(event) => updateActive({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
              </label>
              <label className="field">
                <span>{t.systemPrompt}</span>
                <textarea rows={4} value={active.systemPrompt} onChange={(event) => updateActive({ systemPrompt: event.target.value })} />
              </label>
              <label className="field">
                <span>{t.promptTemplate}</span>
                <textarea rows={6} value={active.promptTemplate} onChange={(event) => updateActive({ promptTemplate: event.target.value })} />
              </label>
              <label className="field">
                <span>{t.outputFormat}</span>
                <textarea rows={4} value={active.outputFormat} onChange={(event) => updateActive({ outputFormat: event.target.value })} />
              </label>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
