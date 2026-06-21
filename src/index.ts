import { prepareNxapiEnv, fetchPresence, PresenceGame } from "./api/presence";
import {
  logGameStarted,
  logGameStopped,
  logInfo,
  logError,
} from "./notifiers/logger";
import { sendWebhook } from "./notifiers/webhook";
import {
  connectDiscord,
  setDiscordActivity,
  clearDiscordActivity,
  disconnectDiscord,
} from "./notifiers/discord";
import { config } from "./config";

// Set env vars before any nxapi module is dynamically loaded.
prepareNxapiEnv();

async function poll(
  previousGame: PresenceGame | null,
): Promise<PresenceGame | null> {
  const presence = await fetchPresence();
  const currentGame = presence.game;

  if (currentGame && previousGame && previousGame.name !== currentGame.name) {
    logGameStopped(previousGame);
    await sendWebhook("game_stopped", previousGame).catch((e) =>
      logError(`Webhook: ${e.message}`),
    );
    logGameStarted(currentGame);
    await sendWebhook("game_started", currentGame).catch((e) =>
      logError(`Webhook: ${e.message}`),
    );
    await setDiscordActivity(currentGame).catch((e) =>
      logError(`Discord RPC: ${e.message}`),
    );
  } else if (currentGame && !previousGame) {
    logGameStarted(currentGame);
    await sendWebhook("game_started", currentGame).catch((e) =>
      logError(`Webhook: ${e.message}`),
    );
    await setDiscordActivity(currentGame).catch((e) =>
      logError(`Discord RPC: ${e.message}`),
    );
  } else if (!currentGame && previousGame) {
    logGameStopped(previousGame);
    await sendWebhook("game_stopped", previousGame).catch((e) =>
      logError(`Webhook: ${e.message}`),
    );
    await clearDiscordActivity().catch((e) =>
      logError(`Discord RPC: ${e.message}`),
    );
  }

  return currentGame;
}

async function main() {
  logInfo("ns-presence-listener started");
  logInfo(`Polling every ${config.pollIntervalMs / 1000}s`);

  await connectDiscord().catch((err) =>
    logInfo(`Discord RPC skipped (${err.message}) — is Discord running?`),
  );

  let previousGame: PresenceGame | null = null;

  const tick = async () => {
    try {
      previousGame = await poll(previousGame);
    } catch (err: unknown) {
      logError(
        `Poll error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  await tick();
  setInterval(tick, config.pollIntervalMs);
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  logInfo("Shutting down...");
  await disconnectDiscord().catch((ex) =>
    logError(`Discord RPC: ${ex.message}`),
  );
  process.exit(0);
});
