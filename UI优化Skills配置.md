# Skills 配置

本项目后续协作先启用前三个工作流 skill / 方法能力，第四个 `spreadsheets` 暂不启用。

## 启用清单

1. `planning-with-files-zh`
2. `browser-use` / `control-in-app-browser`
3. `gorden-ppt-skill`（本机未发现精确同名 skill，当前用 `Presentations`、`pptx-manipulation`、`ppt-visual` 作为 PPT 能力兜底）

暂不启用：

- `spreadsheets`

## 0. superpowers 工作方法

`superpowers` 作为默认工作方法，不依赖独立 skill 文件：

1. 先选工具：开始前确认任务更适合用文件规划、浏览器、PPT、表格、代码工具还是普通回答。
2. 先规划：多步骤任务先写清楚目标、阶段和验收标准。
3. 先排查：遇到问题先看现状、日志、文件和已有配置。
4. 先验证：完成后用构建、测试、截图、文件检查或人工可读结果做确认。

## 1. planning-with-files-zh

用途：

- 把长任务的计划、发现和进度落到文件里。
- 避免上下文压缩、会话中断后接不上。
- 适合 3 步以上、多工具、多轮迭代的任务。

使用方式：

1. 开始复杂任务时创建或读取 `task_plan.md`、`findings.md`、`progress.md`。
2. 每个阶段完成后更新 `progress.md`。
3. 有关键发现时写入 `findings.md`。
4. 阶段状态变化时同步更新 `task_plan.md`。

当前可用路径：

```text
C:\Users\qin\.agents\skills\planning-with-files-zh\SKILL.md
```

## 2. browser-use / control-in-app-browser

用途：

- 打开、检查、点击、输入、截图本地或网页目标。
- 适合登录、填表、抓取页面数据、复现 UI 问题、验证前端页面。
- 本项目做前端 UI 修改后，优先用浏览器打开本地页面检查结果。

使用方式：

1. 本地 Web 目标优先打开 `http://localhost:3000` 或实际开发服务器地址。
2. 页面验证时截图并检查布局、文字溢出、交互状态和错误信息。
3. 对需要重复点击、输入、抓数据的流程，用 browser-use 执行。

当前可用路径：

```text
C:\Users\qin\.codex\plugins\cache\openai-bundled\browser\26.609.41114\skills\control-in-app-browser\SKILL.md
```

## 3. gorden-ppt-skill / PPT 兜底能力

状态：

- 未在本机 skill 目录中找到精确同名的 `gorden-ppt-skill`。
- 当前先配置为 PPT 工作流入口，实际执行时使用已存在的 PPT / 演示文稿能力兜底。

可用兜底：

- `Presentations`：创建、编辑、渲染、验证并导出 PowerPoint PPTX。
- `pptx-manipulation`：程序化创建和修改 PPTX。
- `ppt-visual`：设计演示文稿视觉和版式。
- `html-to-ppt`：把 HTML / Markdown 转成 PowerPoint。

用途：

- 中文 PPT 汇报、复盘、述职、方案。
- 保留版式、替换内容、优化结构。
- 输出可编辑 `.pptx` 文件，并做基础 QA。

当前可用路径：

```text
C:\Users\qin\.codex\plugins\cache\openai-primary-runtime\presentations\26.614.11602\skills\presentations\SKILL.md
C:\Users\qin\.agents\skills\pptx-manipulation\SKILL.md
C:\Users\qin\.agents\skills\ppt-visual\SKILL.md
C:\Users\qin\.agents\skills\html-to-ppt\SKILL.md
```

## 4. spreadsheets

当前状态：暂不启用。

说明：

- 已确认本机存在 `Spreadsheets` 插件能力。
- 由于本轮要求“第四个先不要”，后续任务默认不主动调用它。
- 只有用户明确要求处理 Excel、CSV、表格分析、公式、图表或导出时，再启用。

可用路径（仅记录，不启用）：

```text
C:\Users\qin\.codex\plugins\cache\openai-primary-runtime\spreadsheets\26.614.11602\skills\spreadsheets\SKILL.md
```

## 默认执行顺序

后续复杂任务默认按这个顺序走：

1. 用 `superpowers` 判断任务类型和工具选择。
2. 需要多步骤时启用 `planning-with-files-zh`。
3. 需要网页或本地前端验证时启用 `browser-use`。
4. 需要 PPT 交付物时启用 PPT 兜底能力。
5. 暂不使用 `spreadsheets`，除非用户明确要求。
