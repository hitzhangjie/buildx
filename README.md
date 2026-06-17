# BuildX

Monorepo for the BuildX toolchain.

## Layout

| Path | Type | Description |
|------|------|-------------|
| `buildx-server/` | Go module | BuildX server |
| `buildx-cli/` | Go module | BuildX CLI (`buildx-cli` binary) |
| `onedev/` | git submodule | OneDev platform |
| `agent/` | git submodule | OneDev agent |
| `commons/` | git submodule | Shared libraries |
| `k8s-helper/` | git submodule | Kubernetes helpers |
| `maven-plugin/` | git submodule | Maven plugin |
| `parent/` | git submodule | Parent POM |
| `tod/` | git submodule | TOD CLI tooling |

## Go workspace

Root `go.work` wires the in-repo Go modules:

```bash
go work sync
go build -C buildx-server .
go build -C buildx-cli ./cmd/cli
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
