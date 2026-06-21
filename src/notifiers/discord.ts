import DiscordRPC from "discord-rpc";
import type { Client } from "discord-rpc";
import { config } from "../config";
import type { PresenceGame } from "../api/presence";

let client: Client | null = null;
let connected = false;

export async function connectDiscord(): Promise<void> {
  if (!config.discordClientId) return;

  DiscordRPC.register(config.discordClientId);
  client = new DiscordRPC.Client({ transport: "ipc" });

  await new Promise<void>((resolve, reject) => {
    client!.on("ready", () => {
      connected = true;
      resolve();
    });
    client!.login({ clientId: config.discordClientId! }).catch(reject);
  });
}

export async function setDiscordActivity(game: PresenceGame): Promise<void> {
  if (!client || !connected) return;

  await client.setActivity({
    details: game.name,
    startTimestamp: game.lastPlayedAt * 1000,
    largeImageKey: selectImageKey(game.name),
    largeImageText: game.name,
    instance: false,
  });
}

export async function clearDiscordActivity(): Promise<void> {
  if (!client || !connected) return;
  await client.clearActivity();
}

export async function disconnectDiscord(): Promise<void> {
  if (!client) return;
  await client.destroy();
  client = null;
  connected = false;
}

const IMAGE_KEY_MAP: Array<[words: string[], key: string]> = [
  [["efootball", "kick-off"], "efootball_kick_off"],
];

function selectImageKey(gameName: string): string {
  const lower = gameName.toLowerCase();
  return IMAGE_KEY_MAP.find(([words]) => words.every(w => lower.includes(w)))?.[1] ?? "nintendo_switch_2";
}
