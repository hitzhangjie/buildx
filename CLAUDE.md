# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

BuildX is a **ground-up Go reimplementation** of the [OneDev](https://github.com/theonedev/onedev) DevOps platform (Java) — not a fork. Product and API compatibility guide the migration. The CLI (`buildx-cli`) is ported from [tod](https://github.com/theonedev/tod).

## Repository layout

| Path | Type | Role |
|------|------|------|
| `buildx-server/` | Go module | Server binary — HTTP, Git, API, persistence |
| `buildx-cli/` | Go module | CLI binary (`buildx-cli`) — commands for project/issue/PR/build |
| `buildx-web/` | npm (Vite + React) | Web UI — embedded into server binary at build time |
| `references/` | Git submodules | **Read-only** OneDev/tod source for porting reference |
| `docs/` | Markdown | Vision, architecture, roadmap, migration tracking |

Go workspace (`go.work`) wires both Go modules together. Build is orchestrated from the root `Makefile`.

## Read-only references

**Never** edit, format, or commit files under `references/`. These are upstream git submodules. When porting code, read them for comparison but implement changes in `buildx-server/`, `buildx-cli/`, or `buildx-web/`.

## Common commands

### Build everything

```bash
# From repo root
make build                    # build-web → build-cli → build-server (DEBUG by default)
make build BUILD_MODE=RELEASE # stripped Go binaries + minified web
SKIP_WEB=1 make build-server  # skip web build (e.g. when iterating on Go only)
```

### Server (`buildx-server`)

```bash
cd buildx-server
make build                    # builds web then embeds into bin/buildx-server
make run                      # build + start serve
make dev                      # go run . serve --dev (debug logging)
make test                     # go test ./...
make format                   # goimports -local ...
make lint                     # go vet ./... && go fmt ./...

# Start with custom config
./bin/buildx-server serve --dev --http-addr :8080 --data-dir ./mydata

# Config via env vars (no .env files):
BUILDX_HTTP_ADDR=:8080 BUILDX_DEV=true ./bin/buildx-server serve

# Initial admin bootstrap (fresh data dir only):
BUILDX_INITIAL_USER=admin BUILDX_INITIAL_PASSWORD=changeme BUILDX_INITIAL_EMAIL=admin@example.com ./bin/buildx-server serve --dev
```

### CLI (`buildx-cli`)

```bash
cd buildx-cli
make build          # go build -o bin/buildx-cli ./cmd/buildx-cli
make test           # go test ./...
make lint           # go vet ./... && go fmt ./...
./bin/buildx-cli version
```

CLI config lives at `$XDG_CONFIG_HOME/buildx/config` or `~/.config/buildx/config`. Env overrides: `BUILDX_SERVER_URL`, `BUILDX_ACCESS_TOKEN`, `BUILDX_TRUST_CERTS_FILE`.

### Web (`buildx-web`)

```bash
cd buildx-web
make sync-onedev-assets       # copy CSS/icons/fonts from references/onedev
npm ci && npm run dev          # Vite dev server (proxy /~api to localhost:9910)
npm run build                  # tsc + vite build
npm run test:e2e               # Playwright smoke tests

# Optional: scaffold a React page from Wicket HTML (then hand-wire state/API):
go run ./buildx-server/cmd/pagegen \
  -html references/onedev/server-core/src/main/java/io/onedev/server/web/page/security/LoginPage.html \
  -page LoginPage \
  -out buildx-web/src/pages/security/LoginPage.generated.tsx
```

### Run everything together

```bash
# Terminal 1: start server
cd buildx-server && go run . serve --dev

# Terminal 2: start Vite dev with hot reload
cd buildx-web && npm run dev
# Vite proxies /~api, /~health, /~icon, /~img to BUILDX_HTTP_ADDR (default :9910)
```

## Architecture

### Server (`buildx-server`)

- **HTTP framework**: `chi` (lightweight, composable middleware)
- **Database**: SQLite via embedded migrations; PostgreSQL planned for HA
- **Git engine**: go-git for pure-Go ops, native `git` for heavy pack ops
- **Config**: Environment variables (`BUILDX_HTTP_ADDR`, `BUILDX_SSH_ADDR`, etc.) with CLI flag overrides via cobra; listens on `:9910` (HTTP) and `:9911` (SSH) by default
- **Auth**: BCrypt passwords, Basic/Bearer HTTP auth, personal access tokens
- **Static serving**: `go:embed` of `buildx-web/dist` into the single binary; `BUILDX_WEB_DIR` env can point to external assets for development

**Key internal packages** (under `buildx-server/internal/`):

| Package | Maps to OneDev | Status |
|---------|---------------|--------|
| `model/` | `io.onedev.server.model` | User, Project, Role, AccessToken |
| `persistence/sqlite/` | DataService / Hibernate | Embedded migrations + bootstrap |
| `security/` | Security / auth layer | Store + user authentication |
| `project/` | ProjectService | CRUD, hierarchy, bare git init |
| `server/api/` | rest/resource | `/~api` handlers (partial) |
| `server/` | HTTP server | chi router, static web handler |
| `agent/`, `build/`, `git/`, `issue/`, `plugin/`, `pullrequest/` | Planned modules | Domain service stubs |

### CLI (`buildx-cli`)

Cobra commands organized by group: `project` (project/get/issue/pr/build/cr), `misc` (helpers), `general` (config/version). Talks to server at `/~api/cli/...`. Command structure mirrors `references/tod`.

### Web (`buildx-web`)

- **Stack**: React 19 + TypeScript + Vite + React Router 7
- **Goal**: 1:1 visual parity with OneDev Wicket UI — same DOM structure, CSS classes, dark mode, responsive breakpoints
- **Status**: All 223 OneDev routes are reachable (no white screens), but only ~12 pages have dedicated components; the rest use `PageRenderer` as a scaffold placeholder. **0 pages have passed screenshot-acceptance (✓)**.
- **Layouts**: `SimpleLayout` (public pages: login, signup, init) and `Layout` (authenticated sidebar + topbar)
- **API layer**: `src/api/` modules per resource domain; `VITE_USE_MOCK` for development without running server
- **URL scheme**: Clean OneDev-style paths (`/~projects`, `/~login`, `/{project}/~files`)

## Package naming discipline

When implementing Go packages that correspond to OneDev Java packages:
1. **Default**: Keep OneDev package names as-is (`model`, `security`, `build`, `project`, etc.)
2. **Rename only when Go requires it** (reserved keyword, naming convention, or package collision)
3. **Record any rename** in `docs/ARCHITECTURE.md` naming deviations table

Traceability to OneDev source is paramount. Reference paths follow the pattern `references/onedev/server-core/src/main/java/io/onedev/server/...`.

## Migration workflow (after each feature batch)

After completing a migration batch:
1. **`changelog.md`** — add entry under `[Unreleased]` with ported features and behavior changes
2. **`docs/ROADMAP.md`** — check off completed items, update phase status
3. **`docs/buildx-cli-migration.md`** — update command parity table
4. **`docs/ARCHITECTURE.md`** — update package mapping only when structure changes

## Web UI page migration

**Goal: 1:1 replication of OneDev Wicket UI.** Every page must match OneDev in DOM structure, CSS class names, layout, interactions, dark mode, and responsive behavior. OneDev source is the single source of truth — never invent new design.

Reference root (read-only submodule): `references/onedev/server-core/src/main/java/io/onedev/server/web/`

Detailed task checklist (by Wave, with routes): [buildx-web-migration.md](docs/buildx-web-migration.md)

### PageRenderer rule

`PageRenderer` is a **temporary routing scaffold** (prevents white screens during development). A page served by `PageRenderer` is **NOT done**. The only criteria for "done" is the DoD checklist below, fully satisfied, with side-by-side screenshot comparison passed.

### Execution order

1. **Wave 0** — infrastructure (layout shell, asset sync, shared components, API/mock layer)
2. **Wave 1–11** — per-domain, **one page at a time** 1:1 port (dedicated React component per page, referencing Wicket HTML/CSS/JS)
3. **Wave 12** — plugin dynamic pages
4. API endpoints can be filled in parallel with page porting; data layer starts with mock/fixture, field shapes must match OneDev REST, then switch to live `/~api`

Pages within the same Wave can be worked on in parallel, but **never** batch-check them as "done" with a generic template.

### Single-page Definition of Done (DoD) — the only acceptance criteria

- [ ] Cross-referenced `references/onedev/.../web/page/**/{Name}Page.html` + matching `.css` + associated Panel/Behavior classes
- [ ] React component DOM structure and class names match Wicket rendered output (including aria attributes and nesting hierarchy)
- [ ] Page-level interactions ported (filter, pagination, inline edit, Ajax feedback, etc.; complex widgets use OneDev's same vendored libraries)
- [ ] Dark mode and responsive breakpoints match OneDev behavior
- [ ] `src/api/` response fields match OneDev `*Resource.java` (mock first, then live API)
- [ ] Playwright same-route screenshot diff passed (against reference OneDev instance, same fixture data)

### Single-page porting workflow

1. **Read the reference**: `{Name}Page.html`, `.java`, child Panels (`web/page/**`), page CSS, associated `web/asset` JS
2. **(Optional) Generate scaffold**: `go run ./buildx-server/cmd/pagegen -html <Page.html> -page <Name> -out buildx-web/src/pages/...` — converts Wicket markup to JSX skeleton, then hand-wire state and API
3. **Build dedicated component**: `buildx-web/src/pages/{area}/{Name}Page.tsx` (or subdirectory by domain); do NOT leave it in `PageRenderer` long-term
4. **Extract shared Panels**: reusable blocks move to `src/components/onedev/panels/` (match Wicket Panel naming)
5. **Wire data**: `src/api/` + fixture; field names align with REST resources
6. **Register route**: `AppRouter` / `globalRoutes` / `projectRoutes` → point to dedicated component → remove `PageRenderer` fallback
7. **Verify**: open OneDev and buildx-web side by side → screenshot diff → attach comparison images to PR

## Documentation index

- `docs/VISION.md` — product vision and design principles
- `docs/ARCHITECTURE.md` — server architecture, OneDev-to-Go package mapping
- `docs/ROADMAP.md` — migration phases (Phase 0–6 for server, Phase 0–2 for CLI)
- `docs/buildx-web-design.md` — web UI visual parity principles and page migration DoD
- `docs/buildx-web-migration.md` — full 223-page checklist with per-route status
- `docs/buildx-cli-migration.md` — CLI command parity tracking
