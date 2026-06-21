import SteamUser from "steam-user";
import * as readline from "readline";
import * as fs from "fs";
import { config } from "../config";
import { logInfo, logError } from "./logger";
import type { PresenceGame } from "../api/presence";

let client: SteamUser | null = null;
let loggedOn = false;
let keepAlive: ReturnType<typeof setInterval> | null = null;

const KEEP_ALIVE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function loadRefreshToken(): string | null {
  try {
    return fs.readFileSync(config.steamTokenFile, "utf8").trim();
  } catch {
    return null;
  }
}

function saveRefreshToken(token: string): void {
  try {
    fs.writeFileSync(config.steamTokenFile, token, "utf8");
  } catch (err: unknown) {
    logError(
      `Steam: failed to save refresh token — ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function connectSteam(): Promise<void> {
  if (!config.steamUsername || !config.steamPassword) return;

  client = new SteamUser();

  await new Promise<void>((resolve, reject) => {
    client!.on("loggedOn", () => {
      loggedOn = true;
      client!.setPersona(SteamUser.EPersonaState.Online);
      keepAlive = setInterval(() => {
        client?.setPersona(SteamUser.EPersonaState.Online);
      }, KEEP_ALIVE_INTERVAL_MS);
      logInfo("Steam logged on successfully");
      resolve();
    });

    client!.on("refreshToken", (token: string) => {
      saveRefreshToken(token);
    });

    client!.on("playingState", (blocked: boolean, playingApp: number) => {
      if (blocked) {
        logInfo(
          `Steam playing session is blocked by another session (app ${playingApp}) — will kick it when setting activity`,
        );
      }
    });

    client!.on("error", (err) => {
      logError(`Steam: ${err.message}`);
      reject(err);
    });

    client!.on("steamGuard", (domain, callback) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const prompt = domain
        ? `Steam Guard code (sent to ...${domain}): `
        : "Steam Guard code (from authenticator app): ";
      rl.question(prompt, (code) => {
        rl.close();
        callback(code.trim());
      });
    });

    const refreshToken = loadRefreshToken();
    if (refreshToken) {
      logInfo("Steam logging in with saved refresh token");
      client!.logOn({ refreshToken });
    } else {
      client!.logOn({
        accountName: config.steamUsername!,
        password: config.steamPassword!,
      });
    }
  });
}

export async function setSteamActivity(game: PresenceGame): Promise<void> {
  if (!client || !loggedOn) return;
  client.gamesPlayed(`${game.name}`, true);
}

export async function clearSteamActivity(): Promise<void> {
  if (!client || !loggedOn) return;
  client.gamesPlayed([], true);
}

export async function disconnectSteam(): Promise<void> {
  if (!client) return;
  if (keepAlive) {
    clearInterval(keepAlive);
    keepAlive = null;
  }
  client.logOff();
  client = null;
  loggedOn = false;
}
