import 'dotenv/config';

function optionalEnv(key: string): string | null {
  return process.env[key] || null;
}

export const imageKeyMap: Array<[words: string[], key: string]> = [
  [["efootball", "kick-off"], "efootball_kick_off"],
  [["unicorn", "overlord"], "unicorn_overlord"],
];

export const config = {
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? '30000', 10),
  webhookUrl: optionalEnv('WEBHOOK_URL'),
  webhookSecret: optionalEnv('WEBHOOK_SECRET'),
  discordClientId: optionalEnv('DISCORD_CLIENT_ID'),
  steamUsername: optionalEnv('STEAM_USERNAME'),
  steamPassword: optionalEnv('STEAM_PASSWORD'),
  steamTokenFile: process.env.STEAM_TOKEN_FILE ?? '.steam-refresh-token',
  logFile: process.env.LOG_FILE ?? 'presence.log',
  tokenFile: process.env.TOKEN_FILE ?? '.tokens.json',
} as const;
