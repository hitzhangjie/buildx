# Changelog

All notable changes and migration milestones for the BuildX monorepo.

Format: newest entries first. Update this file after each migrated feature batch (see `.cursor/rules/migration-workflow.mdc`).

## [Unreleased]

### Added

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
