# Roadmap

Migration progress for **buildx-server** (from OneDev) and **buildx-cli** (from tod). Update this file after each migrated feature batch.

## buildx-server migration (OneDev → Go)

### Phase 0 — Foundation (current)

- [x] Project scaffold and naming (`buildx-server`)
- [x] Module boundaries aligned with OneDev domains
- [x] HTTP server with health/info endpoints
- [x] Documentation (vision, architecture, roadmap) moved to repo `docs/`
- [ ] `go mod tidy` and CI pipeline

### Phase 1 — Core platform (MVP)

- [ ] Storage layer (SQLite + migrations)
- [ ] User authentication (local accounts + access tokens)
- [ ] Project CRUD and hierarchy
- [ ] Git smart HTTP (clone, push, pull)
- [ ] Git SSH
- [ ] Basic REST API (project, user, repo)

**Milestone**: Can create a project, push code via HTTP/SSH.

### Phase 2 — Collaboration

- [ ] Issue tracking (CRUD, states, assignees, labels)
- [ ] Kanban board views
- [ ] Pull requests (create, review, merge)
- [ ] Code comments (inline + file-level)
- [ ] Cross-linking (issue ↔ commit ↔ PR ↔ build)
- [ ] Notifications (email, webhook)

**Milestone**: Full issue-to-PR workflow without leaving BuildX.

### Phase 3 — CI/CD

- [ ] Buildspec parser (`.onedev-buildspec.yml`, OneDev-compatible)
- [ ] Job scheduler and build queue
- [ ] Server shell executor
- [ ] Server Docker executor
- [ ] Kubernetes executor
- [ ] Build log streaming
- [ ] Job cache and artifacts

**Milestone**: Push code → CI runs → status reported on PR.

### Phase 4 — AI-first

- [ ] Unified agent context API
- [ ] Agent skills (`skills/` directory)
- [ ] Webhook hooks for agent workflows

**Milestone**: AI agent can drive full dev workflow via CLI and API.

### Phase 5 — Enterprise & ecosystem

- [ ] Plugin system (dynamic loading or compile-time registry)
- [ ] SSO (OIDC, LDAP)
- [ ] Import plugins (GitHub, GitLab, Jira)
- [ ] Package registries (Maven, npm, Docker)
- [ ] HA deployment guide
- [ ] OneDev data migration tool

**Milestone**: Production-ready for enterprise self-hosting.

### Phase 6 — Frontend

- [ ] Evaluate OneDev UI reuse strategy
- [ ] API compatibility layer for existing frontend
- [ ] Incremental modern UI where needed

---

## buildx-cli migration (tod → Go)

See [buildx-cli-migration.md](buildx-cli-migration.md) for command-level parity tracking.

### Phase 0 — Foundation (current)

- [x] CLI scaffold (`buildx-cli` binary)
- [x] Config file and env overrides
- [x] HTTP client to `/~api/cli/...`
- [x] Command groups: `project`, `issue`, `pr`, `build`, `config`, `codereview`

### Phase 1 — Core commands

- [ ] Full parity with `references/tod` for project/issue/pr/build flows
- [ ] Error messages and exit codes aligned with tod
- [ ] Output formats (table/json) where tod supports them

### Phase 2 — Agent workflows

- [ ] Skills directory support
- [ ] Local CI runs (`buildx-cli build run --local`)
- [ ] PR checkout (`buildx-cli pr checkout`)

---

## Contributing priorities

1. **Git smart HTTP** — highest leverage for MVP
2. **Storage + migrations** — foundation for everything else
3. **Buildspec parser** — can port logic from OneDev's ANTLR grammar
4. **K8s executor** — reuse `references/k8s-helper` patterns

## Versioning

BuildX uses [Semantic Versioning](https://semver.org/). Pre-1.0 releases may break APIs freely.
