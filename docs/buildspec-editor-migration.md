# Buildspec 编辑器迁移任务书

与 OneDev 对齐的 `.onedev-buildspec.yml` 可视化 / YAML 双模式编辑器进度与后续工作清单。

OneDev 参考（只读）：

- `references/onedev/server-core/src/main/java/io/onedev/server/web/page/project/blob/render/renderers/buildspec/BuildSpecRenderer.java`
- `.../BuildSpecEditPanel.java` / `BuildSpecEditPanel.html`
- `.../BuildSpecBlobEditPanel.java`
- `.../BuildSpecBlobViewPanel.java` / `BuildSpecBlobViewPanel.html`
- `references/onedev/server-core/src/main/java/io/onedev/server/buildspec/BuildSpec.java`

相关文档：

- 页面路由：[buildx-web-migration.md](buildx-web-migration.md) Wave 2（`ProjectBlobPage`）
- 概念说明：[onedev-builds-concepts.md](onedev-builds-concepts.md)
- REST 验证 API：[buildx-server-api-migration.md](buildx-server-api-migration.md)
- 阶段里程碑：[ROADMAP.md](ROADMAP.md) Phase 3 / Phase 6

---

## 续做入口（从这里开始）

**建议下一批（按依赖排序）**

| # | 任务 | 状态 | 阻塞 | OneDev 参考 |
|---|------|------|------|-------------|
| R1 | **Bean 校验错误 → 字段路径导航** | ⬜ | — | `BuildSpecEditPanel` save feedback + `BeanEditor` path |
| R2 | **逐步骤类型完整 BeanEditor 嵌套字段** | ⬜ | — | 各 `*Step.java` + step editor panels |
| R3 | **Import 元素解析与跨项目链接** | ⬜ | import 解析 API | `Import.java`, `BuildSpec.getJobMap()` |
| R4 | **插件 Job 建议菜单**（Maven/Gradle/Node…） | ⬜ | buildspec 插件 + repo 分析 API | `JobSuggestionResource`, plugin contributions |
| R5 | **查看模式 Run Job 按钮** | ⬜ | JobRun / trigger-job API | `BuildSpecBlobViewPanel`, `JobRunSelector` |
| R6 | **截图 DoD 验收** | ⬜ | R1–R2 视觉收尾 | 对照 Wicket HTML/CSS |

---

## 本批已完成（2026-06-26）

### buildx-web

| 能力 | 落点 |
|------|------|
| 项目 Files 页 CI/CD 引导 | `ProjectBlobPage.tsx` — `BuildSupportNote`（无 buildspec 时提示添加 `.onedev-buildspec.yml`） |
| 查看模式：Visual / Plain YAML 切换 | `BuildSpecBlobViewPanel.tsx`, `BuildSpecViewPanel.tsx` |
| 编辑模式：Edit \| YAML \| Changes \| Save 标签 | `BuildSpecBlobEditPanel.tsx` |
| 双模式编辑：Visual（五 Tab）+ YAML | `BuildSpecEditPanel.tsx` — Jobs / Services / Step Templates / Properties / Imports |
| Job BeanEditor（触发器、paramSpecs、依赖、步骤、post-build 等） | `JobEditorPanel.tsx`, `JobsEditorPanel.tsx` |
| Pipeline DAG（依赖 SVG） | `BuildSpecPipelinePanel.tsx` |
| 拖拽排序（jobs / properties / imports / steps） | `JobsEditorPanel`, `PropertiesEditorPanel`, `ImportsEditorPanel`, `StepListEditor` |
| Job 建议菜单 UI（占位，待插件） | `JobsEditorPanel` suggestions dropdown |
| 步骤编辑器（表格 + 类型选择 modal） | `StepListEditor.tsx` |
| Property / Import 编辑器 | `PropertiesEditorPanel.tsx`, `ImportsEditorPanel.tsx` |
| Service / StepTemplate 编辑器 | `ServiceEditorPanel.tsx`, `StepTemplateEditorPanel.tsx` |
| YAML ↔ visual 同步 | `src/buildspec/yaml.ts`, `types.ts` |
| 深度链接 `?position=buildspec-jobs/CI` | `src/buildspec/position.ts` |
| 单元测试 | `src/buildspec/buildspec.test.ts` |

### buildx-server

| 能力 | 落点 |
|------|------|
| `POST /~api/buildspec/validate` | `internal/server/api/buildspec.go`（`buildspec.Parse` + `Validate`） |
| 测试 | `internal/server/api/buildspec_test.go` |

---

## 当前状态

**可跑通的主流程**：浏览项目 Files → 打开或新建 `.onedev-buildspec.yml` → 查看模式切换 Visual/YAML → 进入编辑 → Visual 五 Tab 或 YAML 编辑 → Changes 预览 diff → Save 提交（走现有 blob commit API）→ 服务端 YAML 校验。

**尚未达到 OneDev DoD**：无截图验收（`✓`）；插件 job 建议、import 解析、Run Job、逐步骤完整嵌套 BeanEditor、校验错误字段导航等待补。

| 层 | 完成度 | 说明 |
|----|--------|------|
| 后端 buildspec 解析 | ~80% | `internal/buildspec/` 已有 Parse/Validate；无 import 跨项目 merge API |
| REST 验证 | ~30% | 仅 `POST /buildspec/validate`；无独立 BuildSpec CRUD（存储走 Repository files API） |
| Web 编辑器 | ~70% | 双模式 + 五 Tab + Job/Step/Property/Import 主流程；复杂 step 嵌套对象部分仍为 JSON modal |
| 1:1 视觉/交互 | ~50% | DOM/CSS 大体对齐 `buildspec/` Wicket panels；细节与插件交互未齐 |

---

## 与 OneDev 的主要差距

| 优先级 | 任务 | OneDev 参考 | 建议落点 |
|--------|------|-------------|----------|
| **P1** | Bean 校验错误 → 字段路径高亮/跳转 | `BuildSpecEditPanel` save handler | `BuildSpecBlobEditPanel` + `BeanViewer` feedback |
| **P1** | 逐步骤类型完整嵌套 BeanEditor | `web/component/buildspec/step/` 各 Panel | `StepListEditor` modal → 按 step type 专用子表单 |
| **P2** | Import 元素解析（跨项目链接、import notice） | `Import.java`, `BuildSpecAware` | 新 API `GET .../buildspec/imports/resolve` + `ImportsViewPanel` |
| **P2** | 插件 Job 建议（Maven/Gradle/Node…） | buildspec 插件 contributions | Phase 5 插件系统 + repo 分析 API；`JobsEditorPanel` 已留 UI stub |
| **P2** | 查看模式 Run Job | `BuildSpecBlobViewPanel`, `JobRunSelector` | `JobRunResource` / `trigger-job` + view panel 按钮 |
| **P3** | BuildSpecRenderer 边角（PlainTabHead、schema 提示等） | `BuildSpecRenderer.java`, `BuildSpecPlainTabHead` | 对照 HTML/CSS 补漏 |
| **P3** | AI buildspec 编辑辅助 | `GetBuildSpecEditInstructions.java` | Phase 4 AI |

---

## 代码地图（BuildX）

```
buildx-web/src/
  pages/ProjectBlobPage.tsx              # Files 页；buildspec 路由到 view/edit panels
  api/buildspec.ts                       # validateBuildSpec()
  buildspec/                             # types, yaml, position, path
  components/buildspec/
    BuildSpecBlobViewPanel.tsx           # 查看：Edit 按钮 + view panel
    BuildSpecBlobEditPanel.tsx           # 编辑：Edit|YAML|Changes|Save tabs
    BuildSpecEditPanel.tsx               # Visual 五 Tab 容器
    BuildSpecViewPanel.tsx               # 查看模式 Visual
    JobsEditorPanel.tsx / JobEditorPanel.tsx
    StepListEditor.tsx
    PropertiesEditorPanel.tsx / ImportsEditorPanel.tsx
    ServiceEditorPanel.tsx / StepTemplateEditorPanel.tsx
    BuildSpecPipelinePanel.tsx

buildx-server/internal/
  buildspec/                             # Parse, Validate, job/step/trigger 模型
  server/api/buildspec.go                # POST /~api/buildspec/validate
```

---

## 验收提醒

Buildspec 编辑器挂在 **Wave 2 `ProjectBlobPage`**，**复刻 = `~`**。接 API / 补交互不等于完成；须对照 OneDev `buildspec/` Wicket HTML/CSS 做 1:1 截图验收（见 [buildx-web-design.md](buildx-web-design.md)）。
