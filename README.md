# ns-presence-listener

Polls your Nintendo Switch Online presence and reacts to game start/stop events with Discord Rich Presence, Steam presence, and file logging.

## Features

- Detects when you start or stop playing a game on your Nintendo Switch
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

| Variable            | Default                | Description                                                              |
| ------------------- | ---------------------- | ------------------------------------------------------------------------ |
| `POLL_INTERVAL_MS`  | `30000`                | How often to check presence (ms)                                         |
| `DISCORD_CLIENT_ID` | —                      | Discord application Client ID for Rich Presence (leave blank to disable) |
| `STEAM_USERNAME`    | —                      | Steam account username (leave blank to disable)                          |
| `STEAM_PASSWORD`    | —                      | Steam account password                                                   |
| `STEAM_TOKEN_FILE`  | `.steam-refresh-token` | Path to the persisted Steam refresh token                                |
| `LOG_FILE`          | `presence.log`         | Path to the log file                                                     |
| `TOKEN_FILE`        | `.tokens.json`         | Path to the stored Nintendo auth token file                              |

### 4. Run

```sh
npm run dev
```

## Discord Rich Presence

Set `DISCORD_CLIENT_ID` to the Client ID of a Discord application (create one at [discord.com/developers/applications](https://discord.com/developers/applications)). Discord must be running on the same machine. If it is not running, the listener starts anyway and skips Discord.

### Image keys

Game artwork is shown in Rich Presence using image keys uploaded to your Discord application. To add images:

1. Go to your application in the [Discord Developer Portal](https://discord.com/developers/applications)
2. Navigate to **Rich Presence → Art Assets** and upload your images, giving each one a key name

The mapping from game names to image keys is defined in `src/config.ts` as `imageKeyMap`:

```ts
export const imageKeyMap: Array<[words: string[], key: string]> = [
  [["efootball", "kick-off"], "efootball_kick_off"],
  [["unicorn", "overlord"], "unicorn_overlord"],
];
```

Each entry is a pair of `[keyword list, image key]`. If a game's name contains **all** the listed keywords (case-insensitive), the corresponding image key is used. If no entry matches, the key `nintendo_switch_2` is used as a fallback.

Default images are included in the [`assets/`](assets/) folder and must be uploaded to your Discord application before they will appear:

| File                            | Image key            | Used for                           |
| ------------------------------- | -------------------- | ---------------------------------- |
| `assets/nintendo_switch_2.png`  | `nintendo_switch_2`  | Fallback for any unrecognised game |
| `assets/efootball_kick_off.jpg` | `efootball_kick_off` | eFootball Kick-Off                 |
| `assets/unicorn_overlord.png`   | `unicorn_overlord`   | Unicorn Overlord                   |

To add images for more games, upload the image to Discord and add an entry to `imageKeyMap` in `src/config.ts`.

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

## Maintenance

### Nintendo Switch App version updates

The Nintendo Switch Online API requires the Nintendo Switch App (NSO app) version to be set correctly in request headers. When Nintendo releases a new app version, the API may stop working and `npm run auth` or polling may fail with authentication errors.

To fix this:

1. Check the latest NSO app version number:
   - **Android/iOS:** [Nintendo's update guide](https://www.nintendo.com/en-gb/Support/Troubleshooting/How-to-Download-or-Update-the-Nintendo-Switch-App-1520024.html)
   - **And check the nxapi config endpoint:** https://nxapi-znca-api.fancy.org.uk/api/znca/config — the `nsoAppVersion` field contains the version expected by the API.

2. Wait for an nxapi release that picks up the new version automatically.

## Scripts

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start the listener                       |
| `npm run auth`      | Authenticate with Nintendo Switch Online |
| `npm run typecheck` | Run TypeScript type checking             |
