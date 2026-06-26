# OneDev Builds / CI 概念说明

OneDev 的 **Builds** 模块是内置 CI/CD 流水线系统。流水线配置存放在仓库根目录的 **`.onedev-buildspec.yml`** 中；Web UI 里编辑该文件时，顶部的 **Jobs / Services / Step Templates / Properties / Imports** 五个 Tab 与 YAML 顶层结构一一对应。

本文说明各概念含义、彼此关系及设计动机，供 BuildX 迁移与日常使用参考。

**OneDev 参考源码**

| 概念 | Java 类 |
|------|---------|
| 构建规范根对象 | `references/onedev/server-core/src/main/java/io/onedev/server/buildspec/BuildSpec.java` |
| Job 定义 | `.../buildspec/job/Job.java` |
| Sidecar 服务 | `.../buildspec/Service.java` |
| 步骤模板 | `.../buildspec/step/StepTemplate.java` |
| 构建属性 | `.../model/support/build/JobProperty.java` |
| 跨项目导入 | `.../buildspec/Import.java` |
| Build 实例（一次运行） | `.../model/Build.java` |
| 示例 buildspec | `references/onedev/.onedev-buildspec.yml` |

**BuildX 对应实现（进行中）**

| OneDev | BuildX |
|--------|--------|
| `io.onedev.server.buildspec` | `buildx-server/internal/buildspec/` |
| `io.onedev.server.job` / `...build` | `buildx-server/internal/job/`、`internal/build/`（规划中） |

---

## Job 与 Build：两个容易混淆的词

| 术语 | 含义 | 类比 |
|------|------|------|
| **Job** | 流水线**定义**（模板） | GitHub Actions 的 `job:`、GitLab CI 的一个 job entry |
| **Build** | 某次 Job 在特定 commit 上的**运行实例** | 「#42 CI 构建成功」里的那次运行 |

触发器或手动提交时，系统读取 commit 上的 `.onedev-buildspec.yml`，按其中的 Job 定义 **submit** 一次 Build。Builds 列表页展示的是 Build 实例；buildspec 编辑器配置的是 Job 蓝图。

---

## 配置文件结构概览

`.onedev-buildspec.yml` 顶层包含五类元素（外加 `version` 版本号）：

```yaml
version: 47
imports:        # 从其他项目继承配置
- projectPath: onedev
  revision: main
jobs:           # 流水线定义（核心）
- name: CI
  steps: [...]
  triggers: [...]
services:       # Sidecar 容器（可选）
- name: postgres
  image: postgres:16
  readinessCheckCommand: ...
stepTemplates:  # 可复用步骤组（可选）
- name: scan vulnerabilities
  steps: [...]
  paramSpecs: [...]
properties:     # 构建级变量（可选）
- name: buildEnvironment
  value: maven:3.9-eclipse-temurin-17
```

Web UI 的五个 Tab 即编辑上述五段；切换到 **YAML** Tab 可看到等价文本。

---

## 五个 Tab 分别是什么

### 1. Jobs — 流水线主干

**Job 是一条完整的 CI/CD 流水线定义**，通常包含：

- **Steps**：顺序执行的步骤（Checkout、Command、BuildImage、PublishArtifact 等）
- **Triggers**：自动触发条件（分支 push、定时 cron、PR 更新等）
- **Parameters（paramSpecs）**：手动触发时可填的参数
- **Job Dependencies**：依赖同项目其他 Job 的产物（如 Release 完成后才 Publish Site）
- **Required Services**：声明需要哪些 sidecar 容器
- **Timeout / Retry / Post-build Actions**：超时、重试、失败通知等

OneDev 自身仓库中的 Job 示例：`CI`（主分支持续集成）、`Release`（发版）、`Publish Site`（发布文档站）、`Scan Vulnerabilities`（定时漏洞扫描）等。详见 `references/onedev/.onedev-buildspec.yml`。

**类比**：GitHub Actions 的一个 workflow job；GitLab CI 的单个 job。

---

### 2. Services — 伴随 Job 的 Sidecar 容器

**Service 是 Job 执行期间额外拉起的 Docker 容器**，供集成测试等场景使用（MySQL、Redis、消息队列等）。

要点：

- Service 的 **name 即 hostname**，Job 内可通过 `postgres:5432` 等形式访问
- 需配置 **readiness check** 命令，agent 会轮询直到返回 0 才认为就绪
- Job 通过 `requiredServices: [postgres, redis]` 声明依赖；执行时与主 Job 容器一起编排

OneDev 主仓库的 buildspec 未定义 services，因其 Job 不需要 sidecar；有数据库集成测试的项目才会用到。

**类比**：GitHub Actions 的 `services:`；GitLab CI 的 `services:`。

---

### 3. Step Templates — 可复用的步骤片段

**Step Template 是一组 Steps 的命名模板**，避免在多个 Job 中复制相同逻辑。

- 模板可定义 **paramSpecs**（参数规格）
- Job 内通过 **`UseTemplateStep`** 引用：`templateName: set up cache`
- 支持 **paramMatrix** 对同一模板批量传入多组参数（如扫描多个路径）

OneDev 示例（`scan vulnerabilities` 模板）：

```yaml
stepTemplates:
- name: scan vulnerabilities
  steps:
  - type: TrivyCacheStep
    name: cache
  - type: RootFSScannerStep
    name: scan
    scanPath: '@param:Scan Path@'
  paramSpecs:
  - type: TextParam
    name: Scan Path
```

多个 Job（`CI`、`Release`、`Scan Vulnerabilities`）共用 `set up cache`、`scan vulnerabilities` 等模板，只改参数，不重复写 Trivy 逻辑。

**类比**：GitHub Composite Action；GitLab 的 `extends` / hidden job；比「整份 workflow 复用」粒度更细。

---

### 4. Properties — 构建级配置变量（非敏感）

**Property 是 buildspec 内的键值对**，在步骤中通过 `@property:名字@` 引用。

示例（OneDev 多处使用构建镜像属性）：

```yaml
- type: CommandStep
  name: build
  runInContainer: true
  image: '@property:buildEnvironment@'
```

要点：

- **子项目继承父项目的 properties**，同名可被覆盖（项目树向下传递）
- 与 **Job Secrets**（`@secret:xxx@`）分离：Properties 是普通配置；Secrets 是敏感凭据且按项目层级解析
- 可标记 **archived**：当前 spec 已不用，但旧 Build 复现仍需要该值

**类比**：GitHub `vars`；GitLab CI variables（非 masked）。

---

### 5. Imports — 从其他项目复用配置

**Import 从指定项目的分支 / 标签 / commit 读取对方的 buildspec 元素**，合并进当前项目，效果等同本地定义。

OneDev 主仓库开头：

```yaml
imports:
- projectPath: onedev
  revision: main
  accessTokenSecret: onedev-token   # 私有仓库时用 job secret 作访问令牌
```

合并规则（`BuildSpec.getJobMap()` 等）：

1. 递归解析 import 链，合并 **jobs、services、stepTemplates、properties**
2. **本地同名定义覆盖导入项**（后写优先）
3. 检测 **循环 import**（A→B→A），校验失败

因此子项目 buildspec 可以很短：只写 `imports` + 少量 override；`buildEnvironment`、`set up cache` 等模板和属性可在父项目统一维护。

**类比**：无 GitHub Actions 一等公民等价物；接近 monorepo 共享 CI 基线 + 各子项目微调。

---

## 元素关系

```
┌─────────────────────────────────────────────────────────────┐
│                  .onedev-buildspec.yml                       │
├──────────┬──────────┬──────────────┬────────────┬───────────┤
│ Imports  │Properties│  Services    │Step        │   Jobs    │
│ 跨项目   │ @property│  sidecar     │ Templates  │ 流水线定义 │
│ 继承     │ :xxx@    │  容器        │ 步骤复用   │           │
└────┬─────┴────┬─────┴──────┬───────┴─────┬──────┴─────┬─────┘
     │          │            │             │            │
     └──────────┴────────────┴─────────────┴────────────┘
                              │
                    Job 引用 Templates / Services / Properties
                    Job 包含 Steps（Checkout, Command, …）
                              │
                    Triggers / 手动提交
                              ▼
                         Build 实例
                    （某 commit 上的一次运行）
```

**执行时**：YAML 不直接运行。Job Service（OneDev `DefaultJobService.execute`）解析 buildspec、插值变量，将 Steps 编译为 Action 计划、Services 转为 sidecar facade，再交给可插拔 **Job Executor**（本机 shell/docker、远程 **Agent** 或 K8s）执行。详见 [onedev-builds-execution.md](onedev-builds-execution.md)。

---

## 为什么这么设计

OneDev 按 **复用粒度** 和 **职责** 分层，而不是把所有内容塞进 Job：

| 层级 | 解决的问题 |
|------|------------|
| **Job** | 跑什么、何时跑、依赖谁 — 流水线编排 |
| **Steps（Job 内）** | 具体怎么做 — 单次执行的命令与动作 |
| **Step Templates** | 多 Job 共享相同步骤（缓存、扫描、发版检查） |
| **Services** | 基础设施依赖与构建步骤解耦 |
| **Properties** | 环境/镜像/版本等配置与逻辑解耦，支持项目树继承 |
| **Imports** | 跨项目 / 跨 repo 共享整套 CI 资产 |

与 GitHub Actions 常见做法对比：

| 需求 | GitHub Actions | OneDev |
|------|----------------|--------|
| 流水线单元 | workflow → job → step | buildspec → job → step |
| 步骤复用 | composite action / 复制 | Step Templates |
| 跨 repo 复用 | `workflow_call` | Imports |
| 变量 | `env` / `vars` | Properties + Job Secrets |
| 测试用 DB | `services:` | Services + `requiredServices` |

GUI 五 Tab 与 YAML schema 对齐，降低「可视化编辑 ↔ 版本控制」之间的认知成本。

---

## 上手建议

| 项目规模 | 建议 |
|----------|------|
| 小项目 / 首次配置 | 只配 **Jobs**：Checkout + Command + Trigger |
| 相同步骤出现 ≥2 次 | 抽到 **Step Templates** |
| 集成测试需要数据库等 | 定义 **Services**，Job 填 `requiredServices` |
| 镜像名、JDK 版本等常改 | 放 **Properties**，步骤写 `@property:xxx@` |
| 多子项目共用 CI | 父项目维护完整 buildspec，子项目 **Imports** + 少量 override |

最小 Job 骨架示例：

```yaml
version: 1
jobs:
- name: CI
  steps:
  - type: CheckoutStep
    name: checkout
  - type: CommandStep
    name: test
    runInContainer: true
    image: golang:1.22
    interpreter:
      type: DefaultInterpreter
      commands: |
        go test ./...
  triggers:
  - type: BranchUpdateTrigger
    branches: main
  timeout: 3600
```

---

## 相关文档

- [onedev-builds-execution.md](onedev-builds-execution.md) — 谁执行 buildspec、Executor / Agent 架构、BuildX 迁移进度
- [ARCHITECTURE.md](ARCHITECTURE.md) — BuildX 模块映射（`buildspec`、`build`、`job`）
- [ROADMAP.md](ROADMAP.md) — CI/Build 模块迁移阶段
- [buildspec-editor-migration.md](buildspec-editor-migration.md) — buildspec 编辑器迁移进度与待办
- [buildx-web-migration.md](buildx-web-migration.md) — buildspec 编辑器页面迁移（Wave 2）
- OneDev 官方：[CI/CD 概念](https://docs.onedev.io/concepts)、[Job secrets 教程](https://docs.onedev.io/tutorials/cicd/job-secrets)
