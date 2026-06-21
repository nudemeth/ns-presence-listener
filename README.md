# ns-presence-listener

Polls your Nintendo Switch Online presence and reacts to game start/stop events with webhooks, Discord Rich Presence, Steam presence, and file logging.

## Features

- Detects when you start or stop playing a game on your Nintendo Switch
- Posts a signed JSON webhook on `game_started` / `game_stopped` events
- Updates Discord Rich Presence via IPC (requires Discord running)
- Updates Steam presence to show the current NS game as a non-Steam game
- Appends timestamped events to a log file

## Requirements

- Node.js 20+
- A Nintendo Switch Online account authenticated via [nxapi](https://github.com/samuelthomas2774/nxapi)
- (Optional) A Discord application for Rich Presence
- (Optional) A Steam account for Steam presence

## Setup

### 1. Install dependencies

```sh
npm install
```

### 2. Authenticate with Nintendo Switch Online

```sh
npm run auth
```

This opens a Nintendo login page in your browser. Right-click **"Select this account"**, copy the link, and paste it when prompted.

### 3. Configure environment

Copy `.env.example` to `.env` and fill in the values you need:

```sh
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `POLL_INTERVAL_MS` | `30000` | How often to check presence (ms) |
| `WEBHOOK_URL` | — | URL to POST to on game events (leave blank to disable) |
| `WEBHOOK_SECRET` | — | HMAC secret for `X-Hub-Signature-256` header (optional) |
| `DISCORD_CLIENT_ID` | — | Discord application Client ID for Rich Presence (leave blank to disable) |
| `STEAM_USERNAME` | — | Steam account username (leave blank to disable) |
| `STEAM_PASSWORD` | — | Steam account password |
| `STEAM_TOKEN_FILE` | `.steam-refresh-token` | Path to the persisted Steam refresh token |
| `LOG_FILE` | `presence.log` | Path to the log file |
| `TOKEN_FILE` | `.tokens.json` | Path to the stored Nintendo auth token file |

### 4. Run

```sh
npm run dev
```

## Webhook payload

On each game event the listener POSTs JSON to `WEBHOOK_URL`:

```json
{
  "event": "game_started",
  "timestamp": "2026-06-21T12:00:00.000Z",
  "game": {
    "name": "The Legend of Zelda: Breath of the Wild",
    "imageUri": "...",
    "sysDescription": "...",
    "totalPlayTime": 36000,
    "firstPlayedAt": 1600000000,
    "lastPlayedAt": 1750000000
  }
}
```

Events: `game_started`, `game_stopped`.

When `WEBHOOK_SECRET` is set, each request includes an `X-Hub-Signature-256` header (`sha256=<hmac-hex>`).

## Discord Rich Presence

Set `DISCORD_CLIENT_ID` to the Client ID of a Discord application (create one at [discord.com/developers/applications](https://discord.com/developers/applications)). Discord must be running on the same machine. If it is not running, the listener starts anyway and skips Discord.

## Steam Presence

Set `STEAM_USERNAME` and `STEAM_PASSWORD` to your Steam credentials. When a Nintendo Switch game is detected, it appears on your Steam profile as a non-Steam game.

On first run, Steam Guard will prompt for a verification code in the terminal (email or authenticator app, depending on your account settings). After that, a refresh token is saved to `STEAM_TOKEN_FILE` (`.steam-refresh-token` by default) and used for all subsequent logins — no further prompts needed.

The refresh token file is gitignored and should not be committed.

## Log format

Events are written to stdout and appended to `LOG_FILE`:

```
[2026-06-21T12:00:00.000Z] INFO     ns-presence-listener started
[2026-06-21T12:00:00.000Z] INFO     Polling every 30s
[2026-06-21T12:00:30.000Z] STARTED  The Legend of Zelda: Breath of the Wild
[2026-06-21T13:00:00.000Z] STOPPED  The Legend of Zelda: Breath of the Wild
```

Errors go to stderr with the `ERROR` prefix.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the listener |
| `npm run auth` | Authenticate with Nintendo Switch Online |
| `npm run typecheck` | Run TypeScript type checking |
