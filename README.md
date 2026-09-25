# Jev MCP

A standalone stdio MCP adapter for sending a context, question, and named choices to Jev System One. It exposes one tool, `jev_decide`, and returns Jev's selected choice, confidence, and per-choice probabilities as `scores`.

## Requirements

- Node.js 20 or newer
- A Jev API key for actual decisions
- An MCP host that can launch a stdio server

## Configure

Copy `.env.example` to `.env` and set `JEV_API_KEY`. `JEV_API_BASE_URL` is the API origin, defaults to `https://api.typesafe.ai`, and can be overridden for another supported environment. The adapter posts to `/v1/systemone`.

The adapter sends `model: "jev-latest"`, the supplied context as `state`, and the question and choices in a `choice` question. It authenticates with a Bearer token. Jev's response answer is mapped from `answers.decision` to `{ choice, confidence, scores }`, with `probabilities` exposed as `scores`.

When launched by the tunnel client, the child inherits `JEV_API_KEY` and, optionally, `JEV_API_BASE_URL` from the tunnel client's environment. The server reads these variables from its process environment; it does not load `.env` files itself.

## Install and run

```sh
npm ci
npm run typecheck
npm test
npm run build
JEV_API_KEY=your-key /home/ms/.volta/bin/node dist/server.js
```

The Linux host must have Volta installed for the `ms` account, with Node.js 20 or newer available through `/home/ms/.volta/bin/node`. This stable shim selects the account's configured Node.js version without hard-coding Volta's version-specific runtime path. The server communicates only over stdin/stdout; diagnostics go to stderr.

## Secure Tunnel client

The tunnel client owns the connection and launches this stdio process when needed. Follow the OpenAI Secure MCP Tunnel Client installation and authentication instructions, then initialize a stdio profile. A typical local registration uses:

```sh
/home/ms/packages/jev-mcp/bin/tunnel-client init --sample sample_mcp_stdio_local --profile jev-mcp --profile-dir /home/ms/packages/jev-mcp/tunnel-profile --tunnel-id <tunnel-id> \
  --mcp-command "/home/ms/.volta/bin/node /home/ms/packages/jev-mcp/dist/server.js"
/home/ms/packages/jev-mcp/bin/tunnel-client doctor --profile jev-mcp --profile-dir /home/ms/packages/jev-mcp/tunnel-profile
/home/ms/packages/jev-mcp/bin/tunnel-client run --profile jev-mcp --profile-dir /home/ms/packages/jev-mcp/tunnel-profile
```

Copy `.env.example` to `.env` and set `JEV_API_KEY`, `CONTROL_PLANE_API_KEY`, and `TUNNEL_CLIENT_PROFILE_DIR`. Reference `CONTROL_PLANE_API_KEY` from the profile configuration using the sample's `env:` syntax. The tunnel client process inherits `JEV_API_KEY`, so its stdio child can authenticate to Jev. Keep `.env` private and do not commit it.

`deploy/jev-mcp-tunnel.service` is a user service for the `ms` account and uses the profile under this repository. The unit sets `VOLTA_HOME=/home/ms/.volta` and places `/home/ms/.volta/bin` on `PATH` so the tunnel process and its stdio child can resolve Volta shims. The profile must already be initialized and authenticated. Install and start it with:

```sh
mkdir -p /home/ms/.config/systemd/user
install -m 0644 deploy/jev-mcp-tunnel.service /home/ms/.config/systemd/user/jev-mcp-tunnel.service
systemctl --user daemon-reload
systemctl --user enable --now jev-mcp-tunnel.service
```

For the service to keep running after `ms` logs out, enable lingering once with `loginctl enable-linger ms`.

## Development

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Tests use a stubbed Jev HTTP response and verify the stdio MCP handshake without requiring an API key or the Jev service.
