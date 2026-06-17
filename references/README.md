# References (read-only)

Git submodules pointing to upstream OneDev ecosystem repositories. Use these **only as reference** when porting features to `buildx-server` and `buildx-cli`.

| Submodule | Purpose |
|---|---|
| `onedev/` | OneDev platform (Java) — primary server migration source |
| `tod/` | TOD CLI — primary CLI migration source |
| `agent/` | OneDev agent |
| `commons/` | Shared libraries |
| `k8s-helper/` | Kubernetes helpers |
| `maven-plugin/` | Maven plugin |
| `parent/` | Parent POM |

## Clone

```bash
git submodule update --init --recursive
```

## Policy

**Do not modify files under `references/`.** Read and compare only. All implementation work belongs in `buildx-server/`, `buildx-cli/`, or other non-reference paths.
