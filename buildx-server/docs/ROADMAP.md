# Roadmap

## Phase 0 — Foundation (current)

- [x] Project scaffold and naming
- [x] Module boundaries aligned with OneDev domains
- [x] HTTP server with health/info endpoints
- [x] CLI skeleton (`syn`)
- [x] Documentation (vision, architecture, roadmap)
- [ ] `go mod tidy` and CI pipeline

## Phase 1 — Core platform (MVP)

- [ ] Storage layer (SQLite + migrations)
- [ ] User authentication (local accounts + access tokens)
- [ ] Project CRUD and hierarchy
- [ ] Git smart HTTP (clone, push, pull)
- [ ] Git SSH
- [ ] Basic REST API (project, user, repo)

**Milestone**: Can create a project, push code via HTTP/SSH.

## Phase 2 — Collaboration

- [ ] Issue tracking (CRUD, states, assignees, labels)
- [ ] Kanban board views
- [ ] Pull requests (create, review, merge)
- [ ] Code comments (inline + file-level)
- [ ] Cross-linking (issue ↔ commit ↔ PR ↔ build)
- [ ] Notifications (email, webhook)

**Milestone**: Full issue-to-PR workflow without leaving Synapse.

## Phase 3 — CI/CD

- [ ] Buildspec parser (`.synapse-buildspec.yml`, OneDev-compatible)
- [ ] Job scheduler and build queue
- [ ] Server shell executor
- [ ] Server Docker executor
- [ ] Kubernetes executor
- [ ] Build log streaming
- [ ] Job cache and artifacts

**Milestone**: Push code → CI runs → status reported on PR.

## Phase 4 — AI-first

- [ ] Unified agent context API
- [ ] `cli` CLI parity with legacy `tod` (issue, pr, build commands)
- [ ] Agent skills (`skills/` directory)
- [ ] Local CI runs (`cli build run --local`)
- [ ] PR checkout (`cli pr checkout`)

**Milestone**: AI agent can drive full dev workflow via CLI.

## Phase 5 — Enterprise & ecosystem

- [ ] Plugin system (dynamic loading or compile-time registry)
- [ ] SSO (OIDC, LDAP)
- [ ] Import plugins (GitHub, GitLab, Jira)
- [ ] Package registries (Maven, npm, Docker)
- [ ] HA deployment guide
- [ ] OneDev data migration tool

**Milestone**: Production-ready for enterprise self-hosting.

## Phase 6 — Frontend

- [ ] Evaluate OneDev UI reuse strategy
- [ ] API compatibility layer for existing frontend
- [ ] Incremental modern UI where needed

---

## Contributing priorities

If you'd like to help, these are high-impact starting points:

1. **Git smart HTTP** — highest leverage for MVP
2. **Storage + migrations** — foundation for everything else
3. **Buildspec parser** — can port logic from OneDev's ANTLR grammar
4. **K8s executor** — reuse `k8s-helper` patterns from this monorepo

## Versioning

Synapse uses [Semantic Versioning](https://semver.org/). Pre-1.0 releases may break APIs freely.
