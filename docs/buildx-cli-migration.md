# buildx-cli migration (tod → Go)

`buildx-cli` is migrated from [tod](references/tod) with **functional parity** as the goal. The reference implementation lives under `references/tod` (read-only).

## Scope

| Area | Reference | Target |
|---|---|---|
| Binary name | `tod` | `buildx-cli` |
| Module path | OneDev tod repo | `github.com/hitzhangjie/buildx/buildx-cli` |
| Server API | `/~api/cli/...` | Same path prefix (`client.APIPathPrefix`) |
| Config | tod config locations | `$XDG_CONFIG_HOME/buildx/config`, `~/.config/buildx/config` |

## Command mapping

| tod command group | buildx-cli command | Status |
|---|---|---|
| `project` | `buildx-cli project` | Scaffolded |
| `issue` | `buildx-cli issue` | Scaffolded |
| `pr` | `buildx-cli pr` | Scaffolded |
| `build` | `buildx-cli build` | Scaffolded |
| `codereview` / CR helpers | `buildx-cli codereview` | Scaffolded |
| `config` | `buildx-cli config` | Scaffolded |

**Scaffolded** = command structure and client wiring exist; behavior may not yet match tod end-to-end.

## Migration workflow

When porting a command or subcommand from tod:

1. Read the tod implementation in `references/tod` (do not modify it).
2. Implement equivalent behavior in `buildx-cli/cmds/`.
3. Update this file — mark the command **Done** or note partial gaps.
4. Update [ROADMAP.md](ROADMAP.md) if it affects phase milestones.
5. Add an entry to [../changelog.md](../changelog.md).

## Config & environment

| tod | buildx-cli |
|---|---|
| Server URL config | `server-url` in config file; `BUILDX_SERVER_URL` env |
| Access token | `access-token`; `BUILDX_ACCESS_TOKEN` env |
| Trust certs | `BUILDX_TRUST_CERTS_FILE` env |

## API client

All commands use `buildx-cli/client` to call the BuildX server. Server handlers are implemented in `buildx-server` and should remain API-compatible with OneDev's CLI endpoints where possible.
