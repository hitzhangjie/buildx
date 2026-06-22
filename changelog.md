# Changelog

All notable changes and migration milestones for the BuildX monorepo.

Format: newest entries first. Update this file after each migrated feature batch (see `.cursor/rules/migration-workflow.mdc`).

## [Unreleased]

### Changed

- `buildx-server` config loading: `conf/buildx.ini` (or `BUILDX_CONFIG`) as base, `BUILDX_DEV` env overrides `dev`, `--dev` flag wins last
- `buildx-cli` help text drops legacy OneDev/BuildX product wording from command descriptions and user-facing errors
- Moved git submodules (`onedev`, `agent`, `commons`, `k8s-helper`, `maven-plugin`, `parent`, `tod`) under `references/`
- Consolidated project documentation into repo-root `docs/` (vision, architecture, roadmap, CLI migration tracking)
- Added Cursor rules for read-only `references/` and migration documentation workflow

### Added

- `docs/buildx-cli-migration.md` — tod → buildx-cli parity tracking
- `docs/README.md` — documentation index
