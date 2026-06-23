# Changelog

All notable changes and migration milestones for the BuildX monorepo.

Format: newest entries first. Update this file after each migrated feature batch (see `.cursor/rules/migration-workflow.mdc`).

## [Unreleased]

### Added

- **Server API observability** — structured `slog` logging for all `/~api` handlers: request entry (op, params), response outcome (status, counts/ids), and errors; HTTP access log middleware (`request_id`, method, path, status, duration)
- **Project Commits API and page** — `GET /~api/repositories/{projectId}/commits` and `commits/{commitHash}` (OneDev `RepositoryResource` parity); `ProjectCommitsPage` loads live commit list with subject, author, and relative time
- **Project Branches API and page** — `GET /~api/repositories/{projectId}/branches`, `default-branch`, and `branches/{branch}` (OneDev `RepositoryResource` parity); `ProjectBranchesPage` loads live branch list with commit hash and updated time

### Fixed

- **Project Files (blob) browsing** — `HasRefs` now requires a branch with commits (empty bare repos correctly show the no-commits panel); directory listings use immediate tree children only (was recursively listing all files, causing slow/wrong root view); default branch resolution falls back to any branch with commits; Files page shows resolved branch name from API
- **NewProjectPage 1:1 alignment** — proper `bean-editor editable` DOM, Select2 choice widgets, synced `editable.css` + `select2.css`; **BeanSwitch** renders toggle track (`input` + sibling `span` per OneDev `BooleanPropertyEditor.html`)
- **LoginPage** — `simple-page-spa.css` restores OneDev SimplePage flex centering in React SPA; settings endpoints no longer 404 (`/~api/v1/settings/branding`, `security`, `sso-providers`)

### Changed

- **buildx-web 1:1 port batch 2** — SignUpPage + NewProjectPage against OneDev BeanEditor markup:
  - Shared `BeanFormGroup`, `BeanSwitch`, `BeanProperties` (mirrors `BeanEditor.html` / `BooleanPropertyEditor.html`)
  - `SignUpPage`: Login Name / Password / Full Name / Email Address fields, `feedbackPanel`, SimplePage footer
  - `NewProjectPage`: project bean fields + Default Roles / Labels / Parent editors; `switch-sm` toggles; child-project title
  - Pages moved to `src/pages/security/` and `src/pages/project/`

- **buildx-web 1:1 port batch 1** — LoginPage + ProjectListPage against OneDev Wicket HTML:
  - `LoginPage`: password / passcode / recovery fragments, `feedbackPanel`, SSO slot, `SimplePage` html classes, mesh background assets
  - `ProjectListPage` + `ProjectListPanel` + `SavedQueriesPanel` panels matching OneDev DOM
  - Shared: `BrandLogo`, `FormFeedbackPanel`, `useSimplePage`; `sync-onedev-assets` copies `mesh.jpg` / `dark-mesh.jpg`
  - `buildx-server/cmd/pagegen` — Go `text/template` scaffold from Wicket HTML (optional accelerator)

- **buildx-web migration strategy** — canonical goal is **1:1 OneDev Wicket UI port**, not route-only scaffold:
  - [buildx-web-design.md](docs/buildx-web-design.md): `PageRenderer` is temporary; per-page DoD requires DOM/class/interaction match + screenshot gate
  - [buildx-web-migration.md](docs/buildx-web-migration.md): split **路由** vs **复刻** progress; honest status 223 routes / 0 parity-complete pages
  - [ROADMAP.md](docs/ROADMAP.md) Phase 6 retitled to reflect full UI port milestone

### Added

- **buildx-web LayoutPage auth guard** — mirrors OneDev `LayoutPage.isPermitted()` / `BasePage.unauthorized()`:
  - `RequireLayoutAccess` redirects anonymous users to `/~login` with `state.from` for post-login return
  - `SimplePage` routes (`layout: "simple"`) remain public (login, signup, init, …)
  - `fetchSecuritySetting()` stub for `enableAnonymousAccess` (defaults false until server API)

### Changed

- **Default listen ports** — HTTP `6666` → `9910`, SSH `6667` → `9911` (avoids Chromium `ERR_UNSAFE_PORT` on IRC-blocked 666x; config, Docker, vite proxy, docs)
- **Default listen ports** — HTTP `6610` → `6666`, SSH `6611` → `6667` (config, Docker, vite proxy, docs)

### Fixed

- **buildx-server `/~api` 401 responses** — no longer send `WWW-Authenticate: Basic`, which caused the browser's native login dialog to appear on top of the React login form when credentials were missing or invalid
- **buildx-server listen address config** — normalize plain port `6666` to `:6666`; add `--http-addr` / `--ssh-addr` / `--data-dir` CLI flags; log effective configuration at startup; vite dev proxy follows `BUILDX_HTTP_ADDR`; default HTTP/SSH ports `6666`/`6667`

- **buildx-web UI-first migration complete** — all 223 OneDev routes render without white screen:
  - `PageRenderer` + `resolvePageTemplate`: list/form/detail/setting/log/board/stats templates
  - Global + project routes wired through unified renderer (specialized pages for login, blob, global lists)
  - `api/stub.ts`, `useChangeObserver` skeleton, `loadingIndicator` util
  - Playwright smoke tests (`e2e/smoke.spec.ts`)
  - `components/onedev/` basic Button/Card

- **buildx-web Wave 2 (batch 1)** — project layout and file browser:
  - `ProjectLayout` with project sidebar menu and breadcrumb topbar
  - `ProjectBlobPage` (`/{project}/~files/...`) — folder table, file view, mock repo tree
  - Blob route matching for nested paths; `src/api/blob.ts` stub endpoint

- **buildx-web Wave 1 (batch 3) + Wave 2 start** — signup, new project, server init, project dashboard:
  - `SignUpPage` (`/~signup`) with POST `/~api/users` (bootstrap when no users)
  - `NewProjectPage` (`/~projects/new`) with POST `/~api/projects` and feature toggles
  - `ServerInitPage` (`/~init`) administrator setup wizard stub
  - `ProjectDashboardPage` (`/{project}`) redirects to `~files` like OneDev

- **buildx-web Wave 1 (batch 2)** — global resource list pages and logout:
  - Shared `SideMainPage`, `ResourceListPanel`, `SavedQueriesSide` components
  - `IssuesPage`, `PullRequestsPage`, `BuildsPage`, `PackagesPage`, `WorkspacesPage` with mock fixtures (`VITE_USE_MOCK`) and stub API modules
  - `LogoutPage` (`/~logout`) with session flash feedback
  - `ProjectsPage` refactored to shared side-main layout

- **buildx-web Wave 0 + Wave 1 (batch 1)** — UI migration infrastructure and first pages:
  - React Router registry for all global routes + project route suffix matching (`src/routes/`)
  - `PageShell` placeholder for unimplemented pages; `ProjectContext` for `/{project}` paths
  - API client (`src/api/`) with Basic auth; mock fixtures via `VITE_USE_MOCK`
  - `LoginPage` (`/~login`), `PageNotFoundPage`, improved `ProjectListPage` (`/~projects`)
  - Layout shell: global sidebar nav, auth state, session-feedback placeholders
  - Sync OneDev `simple.css` for SimplePage layout

- **buildx-server Phase 1 (batch 1)** — core platform logic ported from OneDev:
  - SQLite persistence with embedded migrations (`o_User`, `o_Project`, `o_Role`, `o_AccessToken`, …)
  - Bootstrap/seed data (system users, Project Owner role, env-based admin via `BUILDX_INITIAL_*`)
  - User auth: BCrypt passwords, Basic/Bearer HTTP auth, access token lookup
  - Project service: CRUD, hierarchical `setup`, bare git repo init under `{dataDir}/site/projects/{id}/git`
  - REST endpoints: `GET/POST /~api/users`, `GET /~api/users/me`, `GET/POST /~api/projects`, `POST /~api/projects/setup`
  - Reference: `references/onedev/server-core/.../DataService`, `DefaultProjectService`, `User`, `Project`

### Changed

- `buildx-server` config loading: `conf/buildx.ini` (or `BUILDX_CONFIG`) as base, `BUILDX_DEV` env overrides `dev`, `--dev` flag wins last
- `buildx-cli` help text drops legacy OneDev/BuildX product wording from command descriptions and user-facing errors
- Moved git submodules (`onedev`, `agent`, `commons`, `k8s-helper`, `maven-plugin`, `parent`, `tod`) under `references/`
- Consolidated project documentation into repo-root `docs/` (vision, architecture, roadmap, CLI migration tracking)
- Added Cursor rules for read-only `references/` and migration documentation workflow

### Added

- `docs/buildx-cli-migration.md` — tod → buildx-cli parity tracking
- `docs/README.md` — documentation index
