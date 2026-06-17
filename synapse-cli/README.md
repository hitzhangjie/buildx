# Synapse CLI (`cli`)

`synapse-cli` is the standalone command-line module for Synapse.

## Binary name

- Module: `github.com/hitzhangjie/buildx/synapse-cli`
- Command: `cli`

## Build

```bash
cd synapse-cli
make build
./bin/cli version
```

## Current command coverage

- `cli version`
- `cli config set|get|path`
- `cli project current|get`
- `cli issue list|get`
- `cli pr list|get`
- `cli build list|get`
- `cli codereview|cr add-reply|resolve|unresolve`
- `cli download`
- `cli get-commit-message-requirement`
- `cli get-login-name`
- `cli get-unix-timestamp`
- `cli get-valid-labels`
- `cli remote`

## Engineering structure

- `cmd/cli`: executable entrypoint
- `cmds/`: command tree and runtime wiring
- `client/`: OneDev-compatible API client, git project inference
- `config/`: config discovery, validation, and persistence

Command files in `cmds/` follow a per-subcommand pattern:

- parent command: `xxx.go`
- child command: `xxx_xxx1.go`, `xxx_xxx2.go`

## Server API

The CLI talks to the Synapse server at `/~api/cli/...` (see `client.APIPathPrefix`).
