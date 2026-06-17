# BuildX

Monorepo for the BuildX toolchain — a Go reimplementation of the [OneDev](https://github.com/theonedev/onedev) backend with CLI parity to [tod](references/tod).

## Layout

| Path | Type | Description |
|------|------|-------------|
| `buildx-server/` | Go module | BuildX server (ported from OneDev) |
| `buildx-cli/` | Go module | BuildX CLI (`buildx-cli` binary, ported from tod) |
| `references/onedev/` | git submodule | OneDev platform (read-only reference) |
| `references/tod/` | git submodule | TOD CLI (read-only reference) |
| `references/agent/` | git submodule | OneDev agent |
| `references/commons/` | git submodule | Shared libraries |
| `references/k8s-helper/` | git submodule | Kubernetes helpers |
| `references/maven-plugin/` | git submodule | Maven plugin |
| `references/parent/` | git submodule | Parent POM |
| `docs/` | docs | Vision, architecture, migration progress |

Reference submodules are **read-only** — see [references/README.md](references/README.md).

## Documentation

- [docs/README.md](docs/README.md) — documentation index
- [docs/VISION.md](docs/VISION.md) — product vision
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — server architecture
- [docs/ROADMAP.md](docs/ROADMAP.md) — migration roadmap and progress
- [docs/buildx-cli-migration.md](docs/buildx-cli-migration.md) — CLI parity (tod → buildx-cli)
- [changelog.md](changelog.md) — migration and release notes

## Go workspace

Root `go.work` wires the in-repo Go modules:

```bash
go work sync
go build -C buildx-server .
go build -C buildx-cli ./cmd/buildx-cli
```

## Clone with submodules

```bash
git clone --recurse-submodules https://github.com/hitzhangjie/buildx.git
# or after clone:
git submodule update --init --recursive
```

## Build server

```bash
cd buildx-server && make build
```

## Build CLI

```bash
cd buildx-cli && make build
./bin/buildx-cli version
```
