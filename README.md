# BuildX

Monorepo for the BuildX / Synapse toolchain.

## Layout

| Path | Type | Description |
|------|------|-------------|
| `synapse/` | Go module | Synapse server |
| `synapse-cli/` | Go module | Synapse CLI (`cli` binary) |
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
go build -C synapse .
go build -C synapse-cli ./cmd/cli
```

## Clone with submodules

```bash
git clone --recurse-submodules https://github.com/hitzhangjie/buildx.git
# or after clone:
git submodule update --init --recursive
```

## Build Synapse

```bash
cd synapse && make build
```

## Build CLI

```bash
cd synapse-cli && make build
./bin/cli version
```
