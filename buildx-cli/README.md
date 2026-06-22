# BuildX CLI (`buildx-cli`)

`buildx-cli` is the standalone command-line module for BuildX.

## Module

- Module: `github.com/hitzhangjie/buildx/buildx-cli`
- Binary: `buildx-cli`

## Build

```bash
cd buildx-cli
make build
./bin/buildx-cli version
```

## Configuration

Config file locations (first match wins):

1. `$XDG_CONFIG_HOME/buildx/config`
2. `~/.config/buildx/config`

Environment overrides:

- `BUILDX_SERVER_URL`
- `BUILDX_ACCESS_TOKEN`
- `BUILDX_TRUST_CERTS_FILE`

Example config file:

```ini
server-url=https://buildx.example.com
access-token=your-token
```

## API

The CLI talks to the BuildX server at `/~api/cli/...`.
