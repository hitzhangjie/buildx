# Changelog

All notable changes and migration milestones for the BuildX monorepo.

Format: newest entries first. Update this file after each migrated feature batch (see `.cursor/rules/migration-workflow.mdc`).

## [Unreleased]

### Added

- **Pull request migration handoff** — [docs/pull-request-migration.md](docs/pull-request-migration.md) 专项任务书（续做入口、端点/页面清单、批次 A–E）；同步更新 ROADMAP、buildx-web-migration Wave 4、buildx-server-api-migration
- **Project Files edit/delete/download** — opened file view shows OneDev-style edit, delete, and download actions; edit uses existing blob editor + commit flow; delete commits via `POST .../files` with commit message only; download via `GET .../raw?disposition=attachment`
- **User invitations API** — SQLite `o_UserInvitation` schema; REST API at `/~api/invitations` (list, create, resend, delete); admin invitation list and new-invitation pages wired to live API (mail delivery not yet implemented)
- **Builds (metadata layer)** — SQLite `o_Build` / `o_BuildParam` / `o_BuildLabel` schema; `BuildResource` REST API at `/~api/builds` (query, get, labels, params, dependencies, dependents, fixed-issue-ids, set description, delete); global and project build list pages with OneDev `BuildListPanel` structure (query toolbar, table columns: Build / On Behalf Of / Duration / Last Update); build detail shell with status header, side info, and tab navigation (log, pipeline, changes, fixed issues, artifacts) wired to live API; build number URL param fix (`:build`); log streaming and job execution remain future work (Phase 3 CI/CD)
- **Pull requests (core)** — SQLite `o_PullRequest` / `o_PullRequestComment` / `o_PullRequestReview` schema; `PullRequestResource` REST API at `/~api/pulls` (query, create, get, merge, discard, reopen, merge-preview, comments, reviews); project/global PR list, create form with branch picker, detail shell with activities/changes/code-comments tabs wired to live API; fast-forward and merge-commit merge via git
- **Pull requests (continued)** — reviewer panel (add/remove/approve/request changes), merge strategy selector, squash merge; `POST /pulls/{id}/merge-strategy`; issue↔PR query (`"Includes Issue" is "project#N"`); Invalid PR + settings pages registered in router; not-found redirects to `/invalid`
- **New Pull Request page parity (UI/API/interaction)** — `NewPullRequestPage` now aligns closer to OneDev `web/page/project/pullrequests/create/NewPullRequestPage`: branch selector popup reuses revision selector styling, status fragments are driven by compare/effective-PR API state, form block order is aligned (send section before tabs), labels input and helper text are restored, commits/file-changes tabs render live compare data instead of placeholders, merge strategy area now shows real-time merge preview/conflict status via new `POST /~api/pulls/preview-merge`, and form submission includes selected reviewer/assignee ids (with `assign to me`); create flow now guards against navigating to `~pulls/undefined`
- **Code Compare** — `GET /~api/repositories/{projectId}/compare` (merge-base, commits, whitespace-aware diffs, effective PR lookup) and `GET .../compare/patch`; `RevisionComparePage` with unified/split diff views, file navigation sidebar, code comment badges/side panel (`oldCommitHash`/`newCommitHash` query on code-comments API), effective-PR alert, and create-PR deep link. Progress: [docs/code-compare-migration.md](docs/code-compare-migration.md)
- **Issue tracking (core)** — issue list/create/detail/comments; kanban boards with iteration filter and drag state transition; iteration list/create/detail/edit/burndown; issue↔iteration scheduling (`o_IssueSchedule`, `GET/POST /~api/issues/{id}/iterations`, `GET /~api/iterations/{id}/issues|burndown`)
- **Issue settings API** — `GET/POST /~api/settings/issue` persists `GlobalIssueSetting` (state specs, board specs, named queries) in `o_Setting`; issue boards use dynamic columns/backlog from settings; admin issue states page reads live settings; new-issue iteration picker; issue detail state transition dropdown
- **File view text selection** — read-only CodeMirror source viewer with OneDev-style selection popover (permanent link, copy to clipboard, add code comment); `?position=source-…` deep links; code comment REST API (`POST/GET/DELETE /~api/code-comments`, `GET /~api/projects/{path}/code-comments`)
- **Project Files symbol search** — Advanced Search "Symbols" tab: `GET /~api/projects/{projectPath}/search/symbols` with wildcard name matching, case sensitivity, and file-name filters; results panel groups hits by file with namespace scope (regex-based extraction for Go/Java/Python/JS/Rust; full Lucene indexing planned later)
- **Server API observability** — structured `slog` logging for all `/~api` handlers: request entry (op, params), response outcome (status, counts/ids), and errors; HTTP access log middleware (`request_id`, method, path, status, duration)
- **Project Commits API and page** — `GET /~api/repositories/{projectId}/commits` and `commits/{commitHash}` (OneDev `RepositoryResource` parity); `ProjectCommitsPage` loads live commit list with subject, author, and relative time
- **Project Branches API and page** — `GET /~api/repositories/{projectId}/branches`, `default-branch`, and `branches/{branch}` (OneDev `RepositoryResource` parity); `ProjectBranchesPage` loads live branch list with commit hash and updated time

### Fixed

- **Code comment panel hide/show** — file view comment side panel can be hidden via the header close button while keeping the code selection highlight and URL; gutter speech-bubble icons reopen the panel (OneDev parity)
- **Code comment thread UI/behavior alignment** — file view comment side panel now follows OneDev thread interaction flow after creating/opening comment: thread display, secondary replies, resolve/unresolve toggle, and delete; backend now supports reply and resolved endpoints (`GET/POST /~api/code-comments/{id}/replies`, `POST /~api/code-comments/{id}/resolved`) with SQLite reply persistence
- **Code comments API parity and project list wiring** — `POST /~api/code-comments` now validates `mark.commitHash`, `mark.path`, and `mark.range` (with range sanity checks); `GET /~api/projects/{projectPath}/code-comments` supports both file-scoped listing (`commitHash` + `path`) and project-wide listing; `ProjectCodeCommentsPage` now loads real comments and links to file/selection anchors
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
