# BuildX documentation

Central documentation for the BuildX monorepo.

## Project overview

BuildX ports the [OneDev](references/onedev) backend from Java to Go while keeping product and API compatibility as a migration path. The CLI (`buildx-cli`) is ported from [tod](references/tod).

| Component | Source reference | Go implementation |
|---|---|---|
| Server | `references/onedev` | `buildx-server/` |
| CLI | `references/tod` | `buildx-cli/` |

Reference submodules under `references/` are **read-only** — use them for comparison and porting, never modify them in this repo.

## Documents

| Document | Description |
|---|---|
| [VISION.md](VISION.md) | Product vision and design principles |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Server architecture and OneDev package mapping |
| [ROADMAP.md](ROADMAP.md) | Migration phases and progress checklists |
| [buildx-cli-migration.md](buildx-cli-migration.md) | CLI command parity tracking (tod → buildx-cli) |

## Changelog

User-visible and migration milestones are recorded in [../changelog.md](../changelog.md).
