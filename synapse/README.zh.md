# Synapse

[English](README.md)

**让每一个研发环节紧密相连。**

Synapse 是一个开源、AI-first 的一站式 DevOps 平台——使用 Go 重新构建，产品形态受 [OneDev](https://github.com/theonedev/onedev) 启发。它将代码托管、需求/Issue 管理、看板、代码评审、CI/CD、制品库以及 Agent 工作流整合进同一套系统，原生打通各环节之间的衔接。

> 研发流程的「神经突触」—— 让需求、代码、构建、发布之间的每一环都紧密相连。

## 为什么选择 Synapse？

组织规模变大后，常见问题是工具割裂：Issue 一套、Git 一套、CI/CD 又一套，各 BG 各自为政，集成薄弱。在 AI-first 研发模式下，这种割裂的成本更高——Agent 需要跨环节的统一上下文，而不是在多个系统之间拼凑信息。

Synapse 从设计上解决这个问题：

| 能力 | 说明 |
|---|---|
| **Git 托管** | Smart HTTP、SSH、LFS、分支保护 |
| **Issue 与看板** | 需求管理、迭代、看板、跨实体关联 |
| **代码评审** | Pull Request、行内评论、合并策略 |
| **CI/CD** | Buildspec 驱动流水线，支持 Kubernetes / Shell 执行器 |
| **制品库** | Maven、npm、Docker 等 |
| **AI 原生** | 统一上下文 API 与 CLI Skills，供 Agent 调用 |
| **插件体系** | 可扩展的执行器、认证方式、数据导入 |

## 为什么用 Go？

- **性能**：低内存占用，适合 Git 协议与 CI 负载
- **云原生**：单一静态二进制，容器与 K8s 部署友好
- **开放**：无 Oracle JDK 等授权顾虑，工具链完全自由
- **并发**：适合构建调度、日志流式传输等高并发场景

**前端**将保留 OneDev 已验证的 UX 模式（基于 Wicket 的 UI 可逐步替换或封装；API 兼容是设计目标之一）。

## 快速开始

```bash
cd synapse
make build
./bin/synapse server --dev
```

浏览器访问 http://localhost:6610/~health 确认服务已启动。

```bash
# CLI
cd ../synapse-cli
make build
./bin/cli version
```

## 项目结构

```
synapse/
├── cmd/
│   ├── synapse/          # 服务端
├── internal/
│   ├── agent/            # AI-first 工作流集成
│   ├── security/         # 认证与授权
│   ├── build/            # 构建与 CI/CD 流水线
│   ├── config/           # 配置
│   ├── git/              # Git 协议服务
│   ├── issue/            # Issue 与看板
│   ├── plugin/           # 插件系统
│   ├── project/          # 项目管理
│   ├── pullrequest/      # 代码评审
│   ├── server/           # HTTP 服务与路由
│   ├── persistence/      # 持久化层
│   └── version/
├── pkg/                  # 可对外复用的包
├── web/                  # 前端（目标：兼容 OneDev UI）
├── deploy/               # Docker 与 Kubernetes 部署
└── docs/                 # 愿景、架构、路线图
```

CLI 模块独立维护在 `../synapse-cli`，命令名为 `cli`。

## 文档

- [愿景与命名](docs/VISION.md)
- [架构设计](docs/ARCHITECTURE.md)
- [路线图](docs/ROADMAP.md)

## 与 OneDev 的关系

Synapse 站在 OneDev 优秀的产品设计与用户体验之上。我们**不是** Fork，而是用 Go 从零重写后端，并在此基础上：

1. 以 API 与 UX 兼容作为迁移路径
2. 从第一天起将 AI-first 工作流作为一等公民
3. 以云原生部署为默认形态
4. 采用完全开放的技术栈（无 JDK、无厂商锁定）

## 许可证

Apache License 2.0 — 详见 [LICENSE](LICENSE)。
